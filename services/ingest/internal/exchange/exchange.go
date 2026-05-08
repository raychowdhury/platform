package exchange

import (
	"context"
	"errors"
	"log/slog"
	"time"
)

// Tick is the normalized form an adapter emits.
// All adapters write into the same `ticks` table; the `Symbol` field is
// stored verbatim and is exchange-native (e.g. "BTCUSDT" on Binance,
// "BTC-USD" on Coinbase).
type Tick struct {
	Symbol       string
	TradeID      int64
	Price        float64
	Qty          float64
	Time         time.Time
	IsBuyerMaker bool
}

// BookLevel is one side of one price level in the order book.
type BookLevel struct {
	Price float64
	Size  uint32
	Count uint32
}

// BookSnapshot is the top-N (≤10) of the order book at a point in time.
// Adapters that don't carry depth (Coinbase matches, Binance trade) leave
// this stream unused.
type BookSnapshot struct {
	Symbol string
	Time   time.Time
	Bids   []BookLevel
	Asks   []BookLevel
}

// Streamer connects to a market data feed and emits ticks until ctx is done.
// Implementations must reconnect with backoff on transient errors and
// return only on context cancellation or unrecoverable failure.
type Streamer interface {
	Name() string
	Stream(ctx context.Context, symbols []string, log *slog.Logger, out chan<- Tick) error
}

var ErrUnknown = errors.New("unknown exchange")
