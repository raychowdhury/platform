package market

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/redis/go-redis/v9"
)

// WSGateway accepts client WebSocket connections and relays Redis pub/sub
// messages for the channels they subscribe to.
//
// Client protocol (JSON over text frames):
//
//	→ {"action":"subscribe","channels":["ticks:BTCUSDT"]}
//	→ {"action":"unsubscribe","channels":["ticks:BTCUSDT"]}
//	← {"channel":"ticks:BTCUSDT","data":{...}}
type WSGateway struct {
	rdb *redis.Client
	log *slog.Logger
}

func NewWSGateway(rdb *redis.Client, log *slog.Logger) *WSGateway {
	return &WSGateway{rdb: rdb, log: log}
}

type clientMsg struct {
	Action   string   `json:"action"`
	Channels []string `json:"channels"`
}

type serverMsg struct {
	Channel string          `json:"channel"`
	Data    json.RawMessage `json:"data"`
}

// allowed channel name prefixes — keeps clients from subscribing to arbitrary keys.
var allowedPrefixes = []string{"ticks:", "candles:"}

func (g *WSGateway) Handle(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true, // CORS handled at chi layer
	})
	if err != nil {
		g.log.Warn("ws accept", "err", err)
		return
	}
	defer conn.CloseNow()

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	pubsub := g.rdb.Subscribe(ctx) // start with no channels
	defer pubsub.Close()
	ch := pubsub.Channel(redis.WithChannelSize(256))

	out := make(chan serverMsg, 256)
	var subbed sync.Map // string -> struct{}

	// reader: client → server
	go func() {
		defer cancel()
		for {
			_, data, err := conn.Read(ctx)
			if err != nil {
				return
			}
			var m clientMsg
			if err := json.Unmarshal(data, &m); err != nil {
				continue
			}
			switch strings.ToLower(m.Action) {
			case "subscribe":
				for _, c := range m.Channels {
					if !channelAllowed(c) {
						continue
					}
					if _, ok := subbed.LoadOrStore(c, struct{}{}); ok {
						continue
					}
					if err := pubsub.Subscribe(ctx, c); err != nil {
						g.log.Warn("subscribe", "ch", c, "err", err)
					}
				}
			case "unsubscribe":
				for _, c := range m.Channels {
					subbed.Delete(c)
					_ = pubsub.Unsubscribe(ctx, c)
				}
			case "ping":
				select {
				case out <- serverMsg{Channel: "pong", Data: json.RawMessage(`null`)}:
				default:
				}
			}
		}
	}()

	// pump: redis → out
	go func() {
		for msg := range ch {
			select {
			case out <- serverMsg{Channel: msg.Channel, Data: json.RawMessage(msg.Payload)}:
			case <-ctx.Done():
				return
			}
		}
	}()

	// writer: out → client (single goroutine owns conn writes)
	heartbeat := time.NewTicker(20 * time.Second)
	defer heartbeat.Stop()
	for {
		select {
		case <-ctx.Done():
			_ = conn.Close(websocket.StatusNormalClosure, "bye")
			return
		case <-heartbeat.C:
			if err := writeJSON(ctx, conn, serverMsg{Channel: "ping", Data: json.RawMessage(`null`)}); err != nil {
				return
			}
		case m := <-out:
			if err := writeJSON(ctx, conn, m); err != nil {
				return
			}
		}
	}
}

func writeJSON(ctx context.Context, conn *websocket.Conn, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	wctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := conn.Write(wctx, websocket.MessageText, b); err != nil {
		return err
	}
	if errors.Is(ctx.Err(), context.Canceled) {
		return ctx.Err()
	}
	return nil
}

func channelAllowed(name string) bool {
	for _, p := range allowedPrefixes {
		if strings.HasPrefix(name, p) && len(name) > len(p) && len(name) < 64 {
			return true
		}
	}
	return false
}
