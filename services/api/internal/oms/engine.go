package oms

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// Engine matches open orders against ticks streamed from ingest via Redis pub/sub.
//
// Single-process matcher; if api scales horizontally a distributed lock is needed.
// Fills are computed at tick price (no price improvement modeling), full-quantity
// only (no partial fills since paper engine has no order book).
type Engine struct {
	db  *pgxpool.Pool
	rdb *redis.Client
	log *slog.Logger

	feeRate float64

	mu     sync.Mutex
	active map[string]struct{}
}

func NewEngine(db *pgxpool.Pool, rdb *redis.Client, log *slog.Logger) *Engine {
	return &Engine{
		db:      db,
		rdb:     rdb,
		log:     log,
		feeRate: 0.001, // 10 bps taker
		active:  map[string]struct{}{},
	}
}

func (e *Engine) MarkActive(symbol string) {
	e.mu.Lock()
	e.active[symbol] = struct{}{}
	e.mu.Unlock()
}

func (e *Engine) markInactive(symbol string) {
	e.mu.Lock()
	delete(e.active, symbol)
	e.mu.Unlock()
}

func (e *Engine) isActive(symbol string) bool {
	e.mu.Lock()
	_, ok := e.active[symbol]
	e.mu.Unlock()
	return ok
}

// tickMsg is the on-the-wire form ingest publishes on "ticks:<SYMBOL>".
type tickMsg struct {
	Symbol  string  `json:"symbol"`
	TradeID int64   `json:"trade_id"`
	Price   float64 `json:"price"`
	Qty     float64 `json:"qty"`
	TimeMs  int64   `json:"t"`
	Maker   bool    `json:"m"`
}

func (e *Engine) Run(ctx context.Context) error {
	if err := e.bootstrapActive(ctx); err != nil {
		e.log.Warn("oms bootstrap active", "err", err)
	}

	pubsub := e.rdb.PSubscribe(ctx, "ticks:*")
	defer pubsub.Close()
	ch := pubsub.Channel(redis.WithChannelSize(1024))

	e.log.Info("oms engine started", "active_symbols", e.snapshotActive())

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case msg, ok := <-ch:
			if !ok {
				return errors.New("redis channel closed")
			}
			var t tickMsg
			if err := json.Unmarshal([]byte(msg.Payload), &t); err != nil {
				continue
			}
			if !e.isActive(t.Symbol) {
				continue
			}
			if err := e.matchSymbol(ctx, t); err != nil {
				e.log.Warn("match symbol", "symbol", t.Symbol, "err", err)
			}
		}
	}
}

func (e *Engine) bootstrapActive(ctx context.Context) error {
	rows, err := e.db.Query(ctx, `SELECT DISTINCT symbol FROM orders WHERE status = 'open'`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return err
		}
		e.MarkActive(s)
	}
	return rows.Err()
}

func (e *Engine) snapshotActive() []string {
	e.mu.Lock()
	out := make([]string, 0, len(e.active))
	for s := range e.active {
		out = append(out, s)
	}
	e.mu.Unlock()
	return out
}

type orderRow struct {
	ID         uuid.UUID
	UserID     uuid.UUID
	Side       Side
	Type       Type
	LimitPrice *float64
	Qty        float64
	FilledQty  float64
}

func (e *Engine) matchSymbol(ctx context.Context, t tickMsg) error {
	tx, err := e.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, `
		SELECT id, user_id, side, type, limit_price, qty::float8, filled_qty::float8
		FROM orders
		WHERE symbol = $1 AND status = 'open'
		ORDER BY created_at
		FOR UPDATE SKIP LOCKED
	`, t.Symbol)
	if err != nil {
		return err
	}
	var candidates []orderRow
	for rows.Next() {
		var o orderRow
		var lp *float64
		if err := rows.Scan(&o.ID, &o.UserID, &o.Side, &o.Type, &lp, &o.Qty, &o.FilledQty); err != nil {
			rows.Close()
			return err
		}
		o.LimitPrice = lp
		candidates = append(candidates, o)
	}
	rows.Close()

	if len(candidates) == 0 {
		// no open orders for this symbol — drop from active set
		e.markInactive(t.Symbol)
		return tx.Commit(ctx)
	}

	matchedAny := false
	for i := range candidates {
		o := &candidates[i]
		if !shouldMatch(o, t.Price) {
			continue
		}
		matchedAny = true
		if err := e.fillOne(ctx, tx, t, o); err != nil {
			e.log.Warn("fillOne", "order", o.ID, "err", err)
		}
	}
	if !matchedAny {
		// no fills this tick; commit no-op tx (releases locks)
	}
	return tx.Commit(ctx)
}

func shouldMatch(o *orderRow, tickPrice float64) bool {
	if o.Type == Market {
		return true
	}
	if o.LimitPrice == nil {
		return false
	}
	switch o.Side {
	case Buy:
		return tickPrice <= *o.LimitPrice
	case Sell:
		return tickPrice >= *o.LimitPrice
	}
	return false
}

func (e *Engine) fillOne(ctx context.Context, tx pgx.Tx, t tickMsg, o *orderRow) error {
	fillPrice := t.Price
	fillQty := o.Qty - o.FilledQty
	if fillQty <= 0 {
		return nil
	}
	fee := fillPrice * fillQty * e.feeRate

	if o.Side == Buy {
		cost := fillPrice*fillQty + fee
		var bal float64
		if err := tx.QueryRow(ctx,
			`SELECT balance::float8 FROM accounts WHERE user_id = $1 FOR UPDATE`,
			o.UserID,
		).Scan(&bal); err != nil {
			return err
		}
		if bal < cost {
			return rejectOrder(ctx, tx, o.ID, "insufficient balance")
		}
		if _, err := tx.Exec(ctx,
			`UPDATE accounts SET balance = balance - $1, updated_at = now() WHERE user_id = $2`,
			cost, o.UserID,
		); err != nil {
			return err
		}
		// position upsert: weighted avg cost
		if _, err := tx.Exec(ctx, `
			INSERT INTO positions (user_id, symbol, qty, avg_cost)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (user_id, symbol) DO UPDATE SET
			    avg_cost   = (positions.qty * positions.avg_cost + EXCLUDED.qty * EXCLUDED.avg_cost) /
			                 NULLIF(positions.qty + EXCLUDED.qty, 0),
			    qty        = positions.qty + EXCLUDED.qty,
			    updated_at = now()
		`, o.UserID, t.Symbol, fillQty, fillPrice); err != nil {
			return err
		}
	} else { // sell (long-only)
		var posQty, avgCost float64
		err := tx.QueryRow(ctx, `
			SELECT qty::float8, avg_cost::float8
			FROM positions WHERE user_id = $1 AND symbol = $2 FOR UPDATE
		`, o.UserID, t.Symbol).Scan(&posQty, &avgCost)
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && posQty < fillQty) {
			return rejectOrder(ctx, tx, o.ID, "insufficient position")
		}
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		proceeds := fillPrice*fillQty - fee
		realized := (fillPrice-avgCost)*fillQty - fee
		if _, err := tx.Exec(ctx,
			`UPDATE accounts SET balance = balance + $1, updated_at = now() WHERE user_id = $2`,
			proceeds, o.UserID,
		); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			UPDATE positions
			SET qty = qty - $1, realized_pnl = realized_pnl + $2, updated_at = now()
			WHERE user_id = $3 AND symbol = $4
		`, fillQty, realized, o.UserID, t.Symbol); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO fills (order_id, user_id, symbol, side, price, qty, fee)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, o.ID, o.UserID, t.Symbol, o.Side, fillPrice, fillQty, fee); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE orders
		SET filled_qty = qty, avg_fill_price = $1, status = 'filled', updated_at = now()
		WHERE id = $2
	`, fillPrice, o.ID); err != nil {
		return err
	}

	// fire-and-forget event for future WS push
	payload, _ := json.Marshal(map[string]any{
		"type":     "fill",
		"order_id": o.ID,
		"symbol":   t.Symbol,
		"side":     o.Side,
		"price":    fillPrice,
		"qty":      fillQty,
		"fee":      fee,
		"t":        time.Now().UnixMilli(),
	})
	_ = e.rdb.Publish(ctx, "oms:"+o.UserID.String(), payload).Err()

	return nil
}

func rejectOrder(ctx context.Context, tx pgx.Tx, id uuid.UUID, reason string) error {
	_, err := tx.Exec(ctx, `
		UPDATE orders
		SET status = 'rejected', reject_reason = $1, updated_at = now()
		WHERE id = $2
	`, reason, id)
	return err
}
