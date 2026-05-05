package store

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/platform/ingest/internal/exchange"
)

type Store struct {
	pg  *pgxpool.Pool
	rdb *redis.Client
	log *slog.Logger
}

func New(pg *pgxpool.Pool, rdb *redis.Client, log *slog.Logger) *Store {
	return &Store{pg: pg, rdb: rdb, log: log}
}

// publishTickJSON is the on-the-wire form for Redis pub/sub.
type publishTickJSON struct {
	Symbol       string  `json:"symbol"`
	TradeID      int64   `json:"trade_id"`
	Price        float64 `json:"price"`
	Qty          float64 `json:"qty"`
	TimeMs       int64   `json:"t"`
	IsBuyerMaker bool    `json:"m"`
}

// Run consumes ticks from in until ctx done. Batches inserts to PG and
// publishes each tick on Redis channel "ticks:<SYMBOL>".
func (s *Store) Run(ctx context.Context, in <-chan exchange.Tick, batchSize int, batchInterval time.Duration) error {
	buf := make([]exchange.Tick, 0, batchSize)
	timer := time.NewTimer(batchInterval)
	defer timer.Stop()

	flush := func() {
		if len(buf) == 0 {
			return
		}
		if err := s.insertBatch(ctx, buf); err != nil {
			s.log.Error("insert batch", "err", err, "n", len(buf))
		}
		buf = buf[:0]
	}

	for {
		select {
		case <-ctx.Done():
			flush()
			return ctx.Err()
		case t, ok := <-in:
			if !ok {
				flush()
				return nil
			}
			buf = append(buf, t)
			s.publish(ctx, t)
			if len(buf) >= batchSize {
				flush()
				if !timer.Stop() {
					select {
					case <-timer.C:
					default:
					}
				}
				timer.Reset(batchInterval)
			}
		case <-timer.C:
			flush()
			timer.Reset(batchInterval)
		}
	}
}

func (s *Store) insertBatch(ctx context.Context, ticks []exchange.Tick) error {
	rows := make([][]any, len(ticks))
	for i, t := range ticks {
		rows[i] = []any{t.Time, t.Symbol, t.TradeID, t.Price, t.Qty, t.IsBuyerMaker}
	}
	_, err := s.pg.CopyFrom(ctx,
		pgx.Identifier{"ticks"},
		[]string{"time", "symbol", "trade_id", "price", "qty", "is_buyer_maker"},
		pgx.CopyFromRows(rows),
	)
	if err != nil {
		return fmt.Errorf("copy ticks: %w", err)
	}
	return nil
}

func (s *Store) publish(ctx context.Context, t exchange.Tick) {
	payload, err := json.Marshal(publishTickJSON{
		Symbol:       t.Symbol,
		TradeID:      t.TradeID,
		Price:        t.Price,
		Qty:          t.Qty,
		TimeMs:       t.Time.UnixMilli(),
		IsBuyerMaker: t.IsBuyerMaker,
	})
	if err != nil {
		return
	}
	if err := s.rdb.Publish(ctx, "ticks:"+t.Symbol, payload).Err(); err != nil {
		s.log.Debug("publish", "err", err)
	}
}
