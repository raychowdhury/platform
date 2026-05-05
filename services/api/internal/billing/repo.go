package billing

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrPlanNotFound         = errors.New("plan not found")
	ErrSubscriptionNotFound = errors.New("subscription not found")
)

type Repo struct{ db *pgxpool.Pool }

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

func (r *Repo) ListPlans(ctx context.Context) ([]Plan, error) {
	rows, err := r.db.Query(ctx, `
		SELECT code, name, price_cents, currency, interval, stripe_price_id,
		       max_alerts, max_layouts, max_indicators, history_days, created_at
		FROM plans ORDER BY price_cents ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Plan
	for rows.Next() {
		var p Plan
		if err := rows.Scan(
			&p.Code, &p.Name, &p.PriceCents, &p.Currency, &p.Interval, &p.StripePriceID,
			&p.MaxAlerts, &p.MaxLayouts, &p.MaxIndicators, &p.HistoryDays, &p.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *Repo) GetPlan(ctx context.Context, code string) (*Plan, error) {
	var p Plan
	err := r.db.QueryRow(ctx, `
		SELECT code, name, price_cents, currency, interval, stripe_price_id,
		       max_alerts, max_layouts, max_indicators, history_days, created_at
		FROM plans WHERE code = $1
	`, code).Scan(
		&p.Code, &p.Name, &p.PriceCents, &p.Currency, &p.Interval, &p.StripePriceID,
		&p.MaxAlerts, &p.MaxLayouts, &p.MaxIndicators, &p.HistoryDays, &p.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrPlanNotFound
	}
	return &p, err
}

func (r *Repo) GetSubscription(ctx context.Context, userID uuid.UUID) (*Subscription, error) {
	var s Subscription
	err := r.db.QueryRow(ctx, `
		SELECT user_id, plan_code, status, stripe_customer_id, stripe_subscription_id,
		       current_period_end, cancel_at_period_end, created_at, updated_at
		FROM subscriptions WHERE user_id = $1
	`, userID).Scan(
		&s.UserID, &s.PlanCode, &s.Status, &s.StripeCustomerID, &s.StripeSubscriptionID,
		&s.CurrentPeriodEnd, &s.CancelAtPeriodEnd, &s.CreatedAt, &s.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrSubscriptionNotFound
	}
	return &s, err
}

func (r *Repo) UpsertSubscription(ctx context.Context, userID uuid.UUID, plan, status string) (*Subscription, error) {
	_, err := r.db.Exec(ctx, `
		INSERT INTO subscriptions (user_id, plan_code, status)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id) DO UPDATE SET
			plan_code = EXCLUDED.plan_code,
			status    = EXCLUDED.status,
			updated_at = now()
	`, userID, plan, status)
	if err != nil {
		return nil, err
	}
	return r.GetSubscription(ctx, userID)
}

// GetUserPlan resolves the active plan for a user, joining subscriptions to plans.
// Falls back to the "free" plan if the user has no subscription row.
func (r *Repo) GetUserPlan(ctx context.Context, userID uuid.UUID) (*Plan, error) {
	var p Plan
	err := r.db.QueryRow(ctx, `
		SELECT p.code, p.name, p.price_cents, p.currency, p.interval, p.stripe_price_id,
		       p.max_alerts, p.max_layouts, p.max_indicators, p.history_days, p.created_at
		FROM subscriptions s
		JOIN plans p ON p.code = s.plan_code
		WHERE s.user_id = $1
	`, userID).Scan(
		&p.Code, &p.Name, &p.PriceCents, &p.Currency, &p.Interval, &p.StripePriceID,
		&p.MaxAlerts, &p.MaxLayouts, &p.MaxIndicators, &p.HistoryDays, &p.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return r.GetPlan(ctx, "free")
	}
	return &p, err
}

// RecordEventOnce inserts an idempotency record. Returns true if inserted, false if already seen.
func (r *Repo) RecordEventOnce(ctx context.Context, eventID, eventType string, payload []byte) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		INSERT INTO billing_events (event_id, event_type, payload)
		VALUES ($1, $2, $3)
		ON CONFLICT (event_id) DO NOTHING
	`, eventID, eventType, payload)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}
