package binance

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/coder/websocket"

	"github.com/platform/ingest/internal/exchange"
)

type Streamer struct {
	BaseURL string // e.g. wss://stream.binance.com:9443 or wss://stream.binance.us:9443
}

func (s *Streamer) Name() string { return "binance" }

func (s *Streamer) Stream(ctx context.Context, symbols []string, log *slog.Logger, out chan<- exchange.Tick) error {
	if len(symbols) == 0 {
		return errors.New("no symbols")
	}
	parts := make([]string, len(symbols))
	for i, sym := range symbols {
		parts[i] = strings.ToLower(sym) + "@aggTrade"
	}
	url := fmt.Sprintf("%s/stream?streams=%s", s.BaseURL, strings.Join(parts, "/"))

	backoff := time.Second
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		err := s.runOnce(ctx, url, log, out)
		if err == nil || errors.Is(err, context.Canceled) {
			return err
		}
		log.Warn("binance ws disconnected", "err", err, "backoff", backoff)
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

type combinedFrame struct {
	Stream string          `json:"stream"`
	Data   json.RawMessage `json:"data"`
}

type rawAggTrade struct {
	Symbol  string `json:"s"`
	AggID   int64  `json:"a"`
	Price   string `json:"p"`
	Qty     string `json:"q"`
	TradeMs int64  `json:"T"`
	Maker   bool   `json:"m"`
}

func (s *Streamer) runOnce(ctx context.Context, url string, log *slog.Logger, out chan<- exchange.Tick) error {
	dialCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	conn, _, err := websocket.Dial(dialCtx, url, nil)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	defer conn.CloseNow()
	conn.SetReadLimit(1 << 20)

	log.Info("binance ws connected", "url", url)

	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			return fmt.Errorf("read: %w", err)
		}
		var frame combinedFrame
		if err := json.Unmarshal(data, &frame); err != nil {
			continue
		}
		var raw rawAggTrade
		if err := json.Unmarshal(frame.Data, &raw); err != nil {
			continue
		}
		price, err := strconv.ParseFloat(raw.Price, 64)
		if err != nil {
			continue
		}
		qty, err := strconv.ParseFloat(raw.Qty, 64)
		if err != nil {
			continue
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case out <- exchange.Tick{
			Symbol:       raw.Symbol,
			TradeID:      raw.AggID,
			Price:        price,
			Qty:          qty,
			Time:         time.UnixMilli(raw.TradeMs).UTC(),
			IsBuyerMaker: raw.Maker,
		}:
		}
	}
}
