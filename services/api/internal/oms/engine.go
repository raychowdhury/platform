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
	"github.com/shopspring/decimal"
)

type Engine struct {
	db  *pgxpool.Pool
	rdb *redis.Client
	log *slog.Logger

	feeRate decimal.Decimal

	mu     sync.Mutex
	active map[string]struct{}
	marks  map[string]float64 // last price per symbol — float here is fine, exchange feed is the lossy boundary
}

func NewEngine(db *pgxpool.Pool, rdb *redis.Client, log *slog.Logger) *Engine {
	return &Engine{
		db:      db,
		rdb:     rdb,
		log:     log,
		feeRate: decimal.NewFromFloat(0.001),
		active:  map[string]struct{}{},
		marks:   map[string]float64{},
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

// LastPrice returns the most recent tick price for a symbol observed by the engine.
// Returns 0, false if no tick has been seen yet. Float because the exchange
// feed itself is float; callers convert to decimal at the money-math boundary.
func (e *Engine) LastPrice(symbol string) (float64, bool) {
	e.mu.Lock()
	v, ok := e.marks[symbol]
	e.mu.Unlock()
	return v, ok
}

func (e *Engine) recordMark(symbol string, price float64) {
	e.mu.Lock()
	e.marks[symbol] = price
	e.mu.Unlock()
}

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
			e.recordMark(t.Symbol, t.Price)
			if !e.isActive(t.Symbol) {
				continue
			}
			if err := e.processSymbol(ctx, t); err != nil {
				e.log.Warn("process symbol", "symbol", t.Symbol, "err", err)
			}
		}
	}
}

func (e *Engine) bootstrapActive(ctx context.Context) error {
	rows, err := e.db.Query(ctx, `SELECT DISTINCT symbol FROM orders WHERE status IN ('open','pending')`)
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
	ID           uuid.UUID
	UserID       uuid.UUID
	Symbol       string
	Side         Side
	Type         Type
	LimitPrice   *decimal.Decimal
	StopPrice    *decimal.Decimal
	Qty          decimal.Decimal
	FilledQty    decimal.Decimal
	ReservedCost decimal.Decimal
	Status       Status
}

// processSymbol pulls all not-final orders for a symbol, then:
//   - flips pending stop orders to open if their trigger crossed
//   - matches open orders against the current tick
//
// Each step is atomic via row-level locks; everything happens in one tx.
func (e *Engine) processSymbol(ctx context.Context, t tickMsg) error {
	tx, err := e.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, `
		SELECT id, user_id, symbol, side, type, limit_price::text, stop_price::text,
		       qty::text, filled_qty::text, reserved_cost::text, status
		FROM orders
		WHERE symbol = $1 AND status IN ('open','pending')
		ORDER BY created_at
		FOR UPDATE SKIP LOCKED
	`, t.Symbol)
	if err != nil {
		return err
	}
	var candidates []orderRow
	for rows.Next() {
		var o orderRow
		var lp, sp, qty, filled, reserved *string
		if err := rows.Scan(&o.ID, &o.UserID, &o.Symbol, &o.Side, &o.Type, &lp, &sp,
			&qty, &filled, &reserved, &o.Status); err != nil {
			rows.Close()
			return err
		}
		o.LimitPrice, err = parseDecPtr(lp)
		if err != nil {
			rows.Close()
			return err
		}
		o.StopPrice, err = parseDecPtr(sp)
		if err != nil {
			rows.Close()
			return err
		}
		if o.Qty, err = parseDec(qty); err != nil {
			rows.Close()
			return err
		}
		if o.FilledQty, err = parseDec(filled); err != nil {
			rows.Close()
			return err
		}
		if o.ReservedCost, err = parseDec(reserved); err != nil {
			rows.Close()
			return err
		}
		candidates = append(candidates, o)
	}
	rows.Close()

	if len(candidates) == 0 {
		e.markInactive(t.Symbol)
		return tx.Commit(ctx)
	}

	tickPrice := decimal.NewFromFloat(t.Price)

	for i := range candidates {
		o := &candidates[i]
		if o.Status == StatusPending {
			if !stopTriggered(o, tickPrice) {
				continue
			}
			if err := triggerStop(ctx, tx, o.ID); err != nil {
				e.log.Warn("trigger stop", "order", o.ID, "err", err)
				continue
			}
			o.Status = StatusOpen
		}
		if o.Status != StatusOpen {
			continue
		}
		if !shouldMatch(o, tickPrice) {
			continue
		}
		if err := e.fillOne(ctx, tx, t, tickPrice, o); err != nil {
			e.log.Warn("fillOne", "order", o.ID, "err", err)
		}
	}
	return tx.Commit(ctx)
}

func stopTriggered(o *orderRow, tickPrice decimal.Decimal) bool {
	if o.Type != StopMarket || o.StopPrice == nil {
		return false
	}
	switch o.Side {
	case Buy:
		// Buy stop: trigger when price rises through stop.
		return tickPrice.GreaterThanOrEqual(*o.StopPrice)
	case Sell:
		// Sell stop: trigger when price falls through stop.
		return tickPrice.LessThanOrEqual(*o.StopPrice)
	}
	return false
}

func triggerStop(ctx context.Context, tx pgx.Tx, id uuid.UUID) error {
	_, err := tx.Exec(ctx, `
		UPDATE orders SET status = 'open', updated_at = now()
		WHERE id = $1 AND status = 'pending'
	`, id)
	return err
}

func shouldMatch(o *orderRow, tickPrice decimal.Decimal) bool {
	switch o.Type {
	case Market, StopMarket:
		return true
	case Limit:
		if o.LimitPrice == nil {
			return false
		}
		switch o.Side {
		case Buy:
			return tickPrice.LessThanOrEqual(*o.LimitPrice)
		case Sell:
			return tickPrice.GreaterThanOrEqual(*o.LimitPrice)
		}
	}
	return false
}

func (e *Engine) fillOne(ctx context.Context, tx pgx.Tx, t tickMsg, fillPrice decimal.Decimal, o *orderRow) error {
	fillQty := o.Qty.Sub(o.FilledQty)
	if !fillQty.IsPositive() {
		return nil
	}
	notional := fillPrice.Mul(fillQty)
	fee := notional.Mul(e.feeRate)

	if o.Side == Buy {
		cost := notional.Add(fee)
		// Settle: deduct cost from balance, release any reserved leftover back to balance,
		// and remove the entire reservation from `locked`.
		// If reserved_cost < cost (e.g. market order with insufficient buffer): reject.
		if o.ReservedCost.LessThan(cost) {
			return e.rejectAndRelease(ctx, tx, o, "insufficient reserved balance")
		}
		if _, err := tx.Exec(ctx, `
			UPDATE accounts
			SET balance = balance - $1::numeric, locked = locked - $2::numeric, updated_at = now()
			WHERE user_id = $3
		`, cost.String(), o.ReservedCost.String(), o.UserID); err != nil {
			return err
		}
		// position upsert (postgres handles the avg_cost weighted blend in NUMERIC)
		if _, err := tx.Exec(ctx, `
			INSERT INTO positions (user_id, symbol, qty, avg_cost)
			VALUES ($1, $2, $3::numeric, $4::numeric)
			ON CONFLICT (user_id, symbol) DO UPDATE SET
			    avg_cost   = (positions.qty * positions.avg_cost + EXCLUDED.qty * EXCLUDED.avg_cost) /
			                 NULLIF(positions.qty + EXCLUDED.qty, 0),
			    qty        = positions.qty + EXCLUDED.qty,
			    updated_at = now()
		`, o.UserID, t.Symbol, fillQty.String(), fillPrice.String()); err != nil {
			return err
		}
	} else { // sell — qty was locked at place time, decrement both qty and locked_qty here
		var posStr, lockedStr, avgStr string
		err := tx.QueryRow(ctx, `
			SELECT qty::text, locked_qty::text, avg_cost::text
			FROM positions WHERE user_id = $1 AND symbol = $2 FOR UPDATE
		`, o.UserID, t.Symbol).Scan(&posStr, &lockedStr, &avgStr)
		if errors.Is(err, pgx.ErrNoRows) {
			return e.rejectAndRelease(ctx, tx, o, "insufficient position")
		}
		if err != nil {
			return err
		}
		posQty, err := decimal.NewFromString(posStr)
		if err != nil {
			return err
		}
		if posQty.LessThan(fillQty) {
			return e.rejectAndRelease(ctx, tx, o, "insufficient position")
		}
		avgCost, err := decimal.NewFromString(avgStr)
		if err != nil {
			return err
		}
		proceeds := notional.Sub(fee)
		realized := fillPrice.Sub(avgCost).Mul(fillQty).Sub(fee)
		if _, err := tx.Exec(ctx,
			`UPDATE accounts SET balance = balance + $1::numeric, updated_at = now() WHERE user_id = $2`,
			proceeds.String(), o.UserID,
		); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			UPDATE positions
			SET qty = qty - $1::numeric,
			    locked_qty = GREATEST(0::numeric, locked_qty - $1::numeric),
			    realized_pnl = realized_pnl + $2::numeric,
			    updated_at = now()
			WHERE user_id = $3 AND symbol = $4
		`, fillQty.String(), realized.String(), o.UserID, t.Symbol); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO fills (order_id, user_id, symbol, side, price, qty, fee)
		VALUES ($1, $2, $3, $4, $5::numeric, $6::numeric, $7::numeric)
	`, o.ID, o.UserID, t.Symbol, o.Side, fillPrice.String(), fillQty.String(), fee.String()); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE orders
		SET filled_qty = qty, avg_fill_price = $1::numeric, status = 'filled',
		    reserved_cost = 0, updated_at = now()
		WHERE id = $2
	`, fillPrice.String(), o.ID); err != nil {
		return err
	}

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

// rejectAndRelease flips the order to rejected and reverses whatever reservation
// was held against it: balance for buys, position qty for sells.
func (e *Engine) rejectAndRelease(ctx context.Context, tx pgx.Tx, o *orderRow, reason string) error {
	if o.Side == Buy && o.ReservedCost.IsPositive() {
		if _, err := tx.Exec(ctx, `
			UPDATE accounts SET locked = locked - $1::numeric, updated_at = now()
			WHERE user_id = $2
		`, o.ReservedCost.String(), o.UserID); err != nil {
			return err
		}
	}
	if o.Side == Sell {
		remaining := o.Qty.Sub(o.FilledQty)
		if remaining.IsPositive() {
			if _, err := tx.Exec(ctx, `
				UPDATE positions
				SET locked_qty = GREATEST(0::numeric, locked_qty - $1::numeric), updated_at = now()
				WHERE user_id = $2 AND symbol = $3
			`, remaining.String(), o.UserID, o.Symbol); err != nil {
				return err
			}
		}
	}
	_, err := tx.Exec(ctx, `
		UPDATE orders
		SET status = 'rejected', reject_reason = $1, reserved_cost = 0, updated_at = now()
		WHERE id = $2
	`, reason, o.ID)
	return err
}
