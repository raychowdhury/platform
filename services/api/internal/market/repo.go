package market

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	db *pgxpool.Pool
}

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

// Each timeframe maps directly to a TimescaleDB continuous aggregate.
// All views built from candles_1m with materialized_only=false so the
// in-progress bucket reflects ticks before the next refresh.
var tfToView = map[string]string{
	"1m":  "candles_1m",
	"5m":  "candles_5m",
	"15m": "candles_15m",
	"30m": "candles_30m",
	"1h":  "candles_1h",
	"4h":  "candles_4h",
	"8h":  "candles_8h",
	"1d":  "candles_1d",
	"1w":  "candles_1w",
}

func IsValidTF(tf string) bool { _, ok := tfToView[tf]; return ok }

func (r *Repo) ListSymbols(ctx context.Context) ([]Symbol, error) {
	rows, err := r.db.Query(ctx, `
		SELECT symbol, exchange, base, quote,
		       COALESCE(tick_size,0)::float8, COALESCE(step_size,0)::float8, COALESCE(min_qty,0)::float8,
		       status
		FROM symbols
		WHERE status = 'active'
		ORDER BY symbol
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Symbol
	for rows.Next() {
		var s Symbol
		if err := rows.Scan(&s.Symbol, &s.Exchange, &s.Base, &s.Quote, &s.TickSize, &s.StepSize, &s.MinQty, &s.Status); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// Candles returns OHLCV buckets for symbol/tf in [from, to].
// Each tf has a dedicated TimescaleDB continuous aggregate; the in-progress
// bucket is real-time (materialized_only=false) so the latest bar reflects
// recent ticks even before the next CAGG refresh.
func (r *Repo) Candles(ctx context.Context, symbol, tf string, from, to time.Time, limit int) ([]Candle, error) {
	view, ok := tfToView[tf]
	if !ok {
		return nil, errors.New("invalid tf")
	}
	if limit <= 0 || limit > 5000 {
		limit = 1000
	}
	// view name comes from a fixed allowlist (tfToView) — not user input — so this is safe.
	query := fmt.Sprintf(`
		SELECT bucket, symbol, open, high, low, close, volume, trades
		FROM %s
		WHERE symbol = $1 AND bucket >= $2 AND bucket < $3
		ORDER BY bucket ASC
		LIMIT $4
	`, view)
	rows, err := r.db.Query(ctx, query, symbol, from, to, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Candle
	for rows.Next() {
		var c Candle
		if err := rows.Scan(&c.Time, &c.Symbol, &c.Open, &c.High, &c.Low, &c.Close, &c.Volume, &c.Trades); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *Repo) RecentTicks(ctx context.Context, symbol string, limit int) ([]Tick, error) {
	if limit <= 0 || limit > 5000 {
		limit = 500
	}
	rows, err := r.db.Query(ctx, `
		SELECT "time", symbol, COALESCE(trade_id,0), price, qty, COALESCE(is_buyer_maker,false)
		FROM ticks
		WHERE symbol = $1
		ORDER BY "time" DESC
		LIMIT $2
	`, symbol, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Tick
	for rows.Next() {
		var t Tick
		if err := rows.Scan(&t.Time, &t.Symbol, &t.TradeID, &t.Price, &t.Qty, &t.IsBuyerMaker); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}
