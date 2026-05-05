package market

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	db *pgxpool.Pool
}

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

// supported timeframes → continuous aggregate / bucket interval.
// 1m has its own materialized view; everything else is computed on-the-fly
// by time_bucket over candles_1m for now (good enough for MVP).
var validTFs = map[string]string{
	"1m": "1 minute", "5m": "5 minutes", "15m": "15 minutes", "30m": "30 minutes",
	"1h": "1 hour", "4h": "4 hours", "8h": "8 hours", "1d": "1 day", "1w": "1 week",
}

func IsValidTF(tf string) bool { _, ok := validTFs[tf]; return ok }

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
// For tf=1m it queries candles_1m directly; for higher TFs it rolls up candles_1m
// using time_bucket on the close price (sum/min/max preserve correctness).
func (r *Repo) Candles(ctx context.Context, symbol, tf string, from, to time.Time, limit int) ([]Candle, error) {
	interval, ok := validTFs[tf]
	if !ok {
		return nil, errors.New("invalid tf")
	}
	if limit <= 0 || limit > 5000 {
		limit = 1000
	}
	var (
		rows pgx.Rows
		err  error
	)
	if tf == "1m" {
		rows, err = r.db.Query(ctx, `
			SELECT bucket, symbol, open, high, low, close, volume, trades
			FROM candles_1m
			WHERE symbol = $1 AND bucket >= $2 AND bucket < $3
			ORDER BY bucket ASC
			LIMIT $4
		`, symbol, from, to, limit)
	} else {
		// roll up 1m candles into the requested TF
		query := fmt.Sprintf(`
			SELECT time_bucket('%s', bucket) AS b,
			       $1::text AS symbol,
			       (array_agg(open ORDER BY bucket ASC))[1]                AS open,
			       max(high)                                               AS high,
			       min(low)                                                AS low,
			       (array_agg(close ORDER BY bucket DESC))[1]              AS close,
			       sum(volume)                                             AS volume,
			       sum(trades)::bigint                                     AS trades
			FROM candles_1m
			WHERE symbol = $1 AND bucket >= $2 AND bucket < $3
			GROUP BY b
			ORDER BY b ASC
			LIMIT $4
		`, interval)
		rows, err = r.db.Query(ctx, query, symbol, from, to, limit)
	}
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
