package alerts

import (
	"time"

	"github.com/google/uuid"
)

type Condition string

const (
	PriceAbove Condition = "price_above"
	PriceBelow Condition = "price_below"
)

type Status string

const (
	StatusActive    Status = "active"
	StatusTriggered Status = "triggered"
	StatusDisabled  Status = "disabled"
)

type Alert struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	Symbol         string     `json:"symbol"`
	Condition      Condition  `json:"condition"`
	Threshold      float64    `json:"threshold"`
	Status         Status     `json:"status"`
	Note           *string    `json:"note,omitempty"`
	TriggeredAt    *time.Time `json:"triggered_at,omitempty"`
	TriggeredPrice *float64   `json:"triggered_price,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}
