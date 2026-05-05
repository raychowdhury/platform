package billing

import (
	"time"

	"github.com/google/uuid"
)

type Plan struct {
	Code           string    `json:"code"`
	Name           string    `json:"name"`
	PriceCents     int       `json:"price_cents"`
	Currency       string    `json:"currency"`
	Interval       string    `json:"interval"`
	StripePriceID  *string   `json:"stripe_price_id,omitempty"`
	MaxAlerts      int       `json:"max_alerts"`
	MaxLayouts     int       `json:"max_layouts"`
	MaxIndicators  int       `json:"max_indicators"`
	HistoryDays    int       `json:"history_days"`
	CreatedAt      time.Time `json:"created_at"`
}

type Subscription struct {
	UserID               uuid.UUID  `json:"user_id"`
	PlanCode             string     `json:"plan_code"`
	Status               string     `json:"status"`
	StripeCustomerID     *string    `json:"stripe_customer_id,omitempty"`
	StripeSubscriptionID *string    `json:"stripe_subscription_id,omitempty"`
	CurrentPeriodEnd     *time.Time `json:"current_period_end,omitempty"`
	CancelAtPeriodEnd    bool       `json:"cancel_at_period_end"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}
