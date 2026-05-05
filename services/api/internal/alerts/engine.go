package alerts

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// Engine watches Redis ticks:* and fires alerts whose threshold the price crosses.
// Same shape as oms.Engine: in-memory active-symbol set keeps fan-out cheap;
// the actual flip from active→triggered is atomic via UPDATE ... WHERE status='active'.
type Engine struct {
	db   *pgxpool.Pool
	rdb  *redis.Client
	repo *Repo
	log  *slog.Logger

	mu     sync.Mutex
	active map[string]struct{}
}

func NewEngine(db *pgxpool.Pool, rdb *redis.Client, repo *Repo, log *slog.Logger) *Engine {
	return &Engine{db: db, rdb: rdb, repo: repo, log: log, active: map[string]struct{}{}}
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

type tickMsg struct {
	Symbol string  `json:"symbol"`
	Price  float64 `json:"price"`
	TimeMs int64   `json:"t"`
}

func (e *Engine) Run(ctx context.Context) error {
	syms, err := e.repo.ActiveSymbols(ctx)
	if err == nil {
		for _, s := range syms {
			e.MarkActive(s)
		}
	}

	pubsub := e.rdb.PSubscribe(ctx, "ticks:*")
	defer pubsub.Close()
	ch := pubsub.Channel(redis.WithChannelSize(1024))

	e.log.Info("alerts engine started", "active_symbols", e.snapshot())

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
			if err := e.evalSymbol(ctx, t); err != nil {
				e.log.Warn("alerts eval", "symbol", t.Symbol, "err", err)
			}
		}
	}
}

func (e *Engine) snapshot() []string {
	e.mu.Lock()
	out := make([]string, 0, len(e.active))
	for s := range e.active {
		out = append(out, s)
	}
	e.mu.Unlock()
	return out
}

func (e *Engine) evalSymbol(ctx context.Context, t tickMsg) error {
	cands, err := e.repo.CandidatesForSymbol(ctx, t.Symbol)
	if err != nil {
		return err
	}
	if len(cands) == 0 {
		e.markInactive(t.Symbol)
		return nil
	}
	for _, a := range cands {
		if !shouldFire(a.Condition, a.Threshold, t.Price) {
			continue
		}
		fired, err := e.repo.MarkTriggered(ctx, a.ID, t.Price)
		if err != nil {
			e.log.Warn("mark triggered", "id", a.ID, "err", err)
			continue
		}
		if fired == nil {
			continue // raced and lost
		}
		payload, _ := json.Marshal(map[string]any{
			"type":      "alert_triggered",
			"alert_id":  fired.ID,
			"symbol":    fired.Symbol,
			"condition": fired.Condition,
			"threshold": fired.Threshold,
			"price":     t.Price,
			"t":         t.TimeMs,
		})
		_ = e.rdb.Publish(ctx, "alerts:"+fired.UserID.String(), payload).Err()
	}
	return nil
}

func shouldFire(cond Condition, threshold, price float64) bool {
	switch cond {
	case PriceAbove:
		return price >= threshold
	case PriceBelow:
		return price <= threshold
	}
	return false
}
