package coinbase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/coder/websocket"

	"github.com/platform/ingest/internal/exchange"
)

// Streamer subscribes to Coinbase Exchange "matches" channel.
//
// Endpoint: wss://ws-feed.exchange.coinbase.com
// Docs:    https://docs.cdp.coinbase.com/exchange/docs/websocket-channels#matches-channel
type Streamer struct {
	URL string // default wss://ws-feed.exchange.coinbase.com
}

func (s *Streamer) Name() string { return "coinbase" }

func (s *Streamer) Stream(ctx context.Context, symbols []string, log *slog.Logger, out chan<- exchange.Tick) error {
	if len(symbols) == 0 {
		return errors.New("no symbols")
	}
	url := s.URL
	if url == "" {
		url = "wss://ws-feed.exchange.coinbase.com"
	}

	backoff := time.Second
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		err := s.runOnce(ctx, url, symbols, log, out)
		if err == nil || errors.Is(err, context.Canceled) {
			return err
		}
		log.Warn("coinbase ws disconnected", "err", err, "backoff", backoff)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(backoff):
		}
		if backoff < 30*time.Second {
			backoff *= 2
		}
	}
}

type subscribeMsg struct {
	Type     string    `json:"type"`
	Channels []channel `json:"channels"`
}
type channel struct {
	Name       string   `json:"name"`
	ProductIDs []string `json:"product_ids"`
}

type matchMsg struct {
	Type      string `json:"type"`
	TradeID   int64  `json:"trade_id"`
	ProductID string `json:"product_id"`
	Price     string `json:"price"`
	Size      string `json:"size"`
	Side      string `json:"side"` // "buy" = taker bought, "sell" = taker sold
	Time      string `json:"time"` // RFC3339Nano
}

func (s *Streamer) runOnce(ctx context.Context, url string, symbols []string, log *slog.Logger, out chan<- exchange.Tick) error {
	dialCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	conn, _, err := websocket.Dial(dialCtx, url, nil)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	defer conn.CloseNow()
	conn.SetReadLimit(1 << 20)

	sub := subscribeMsg{
		Type: "subscribe",
		Channels: []channel{
			{Name: "matches", ProductIDs: symbols},
		},
	}
	body, _ := json.Marshal(sub)
	wctx, wcancel := context.WithTimeout(ctx, 5*time.Second)
	if err := conn.Write(wctx, websocket.MessageText, body); err != nil {
		wcancel()
		return fmt.Errorf("subscribe: %w", err)
	}
	wcancel()
	log.Info("coinbase ws connected", "products", symbols)

	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			return fmt.Errorf("read: %w", err)
		}
		// Cheap type sniff before full unmarshal.
		var probe struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(data, &probe); err != nil {
			continue
		}
		// "match" = live trade, "last_match" = first trade since subscribe.
		if probe.Type != "match" && probe.Type != "last_match" {
			if probe.Type == "error" {
				return fmt.Errorf("coinbase error frame: %s", string(data))
			}
			continue
		}
		var m matchMsg
		if err := json.Unmarshal(data, &m); err != nil {
			continue
		}
		price, err := strconv.ParseFloat(m.Price, 64)
		if err != nil {
			continue
		}
		size, err := strconv.ParseFloat(m.Size, 64)
		if err != nil {
			continue
		}
		t, err := time.Parse(time.RFC3339Nano, m.Time)
		if err != nil {
			t = time.Now().UTC()
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case out <- exchange.Tick{
			Symbol:       m.ProductID,
			TradeID:      m.TradeID,
			Price:        price,
			Qty:          size,
			Time:         t.UTC(),
			IsBuyerMaker: m.Side == "sell", // taker sold => buyer was maker
		}:
		}
	}
}
