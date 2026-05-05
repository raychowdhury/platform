package alerts

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// NotificationSink is the minimal write API the alerts engine needs.
// Decoupled to avoid an import cycle and to keep the engine testable.
// Implementations adapt their richer return shape to this signature.
type NotificationSink interface {
	InsertNotification(ctx context.Context, userID uuid.UUID, alertID *uuid.UUID, typ, title string, body *string, metadata []byte) error
}

// EmailLookup resolves a user's alert-email preference. Returns (addr, true)
// only when the user has opted in. The engine sends nothing on (_, false).
type EmailLookup interface {
	AlertEmailFor(ctx context.Context, uid uuid.UUID) (string, bool, error)
}

// Mailer is the subset of internal/mailer the engine uses. Defined locally
// so the alerts package stays free of net/smtp imports.
type Mailer interface {
	Send(ctx context.Context, m MailMessage) error
}

type MailMessage struct {
	To      string
	Subject string
	Body    string
}

// PushSink fan-outs a serialized payload to all of a user's push
// subscriptions. Implementations no-op when push is unconfigured.
type PushSink interface {
	SendToUser(ctx context.Context, uid uuid.UUID, payload []byte)
}

// Engine watches Redis ticks:* and fires alerts whose threshold the price crosses.
// Same shape as oms.Engine: in-memory active-symbol set keeps fan-out cheap;
// the actual flip from active→triggered is atomic via UPDATE ... WHERE status='active'.
type Engine struct {
	db     *pgxpool.Pool
	rdb    *redis.Client
	repo   *Repo
	notif  NotificationSink
	mailer Mailer
	emails EmailLookup
	push   PushSink
	log    *slog.Logger

	mu     sync.Mutex
	active map[string]struct{}
}

func NewEngine(db *pgxpool.Pool, rdb *redis.Client, repo *Repo, notif NotificationSink, log *slog.Logger) *Engine {
	return &Engine{db: db, rdb: rdb, repo: repo, notif: notif, log: log, active: map[string]struct{}{}}
}

// WithEmail wires alert-fire email delivery. Both deps must be non-nil for
// the path to activate; either nil falls back to in-app-only.
func (e *Engine) WithEmail(m Mailer, l EmailLookup) *Engine {
	e.mailer = m
	e.emails = l
	return e
}

// WithPush wires alert-fire web push delivery. Nil sink keeps the path off.
func (e *Engine) WithPush(p PushSink) *Engine {
	e.push = p
	return e
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

		// persist a user-facing notification (best effort — logged on failure)
		if e.notif != nil {
			arrow := "≥"
			if fired.Condition == PriceBelow {
				arrow = "≤"
			}
			title := fmt.Sprintf("%s %s %.2f", fired.Symbol, arrow, fired.Threshold)
			body := fmt.Sprintf("triggered at %.2f", t.Price)
			meta, _ := json.Marshal(map[string]any{
				"symbol": fired.Symbol, "condition": fired.Condition,
				"threshold": fired.Threshold, "price": t.Price,
			})
			alertID := fired.ID
			if err := e.notif.InsertNotification(ctx, fired.UserID, &alertID, "alert_triggered", title, &body, meta); err != nil {
				e.log.Warn("notif insert", "alert", fired.ID, "err", err)
			}
			e.maybeEmail(ctx, fired.UserID, title, body)
			if e.push != nil {
				pushPayload, _ := json.Marshal(map[string]any{
					"type": "alert", "title": title, "body": body, "alert_id": fired.ID,
				})
				e.push.SendToUser(ctx, fired.UserID, pushPayload)
			}
		}
	}
	return nil
}

// maybeEmail sends an email when both mailer and email lookup are wired and
// the target user has opted in. Best-effort: failures are logged but never
// block the alert pipeline (in-app notif is the source of truth).
func (e *Engine) maybeEmail(ctx context.Context, uid uuid.UUID, subject, body string) {
	if e.mailer == nil || e.emails == nil {
		return
	}
	addr, on, err := e.emails.AlertEmailFor(ctx, uid)
	if err != nil {
		e.log.Warn("alert email lookup", "user", uid, "err", err)
		return
	}
	if !on || addr == "" {
		return
	}
	if err := e.mailer.Send(ctx, MailMessage{To: addr, Subject: "Alert: " + subject, Body: body}); err != nil {
		e.log.Warn("alert email send", "user", uid, "err", err)
	}
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
