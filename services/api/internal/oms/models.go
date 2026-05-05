package oms

import (
	"time"

	"github.com/google/uuid"
)

type Side string
type Type string
type Status string

const (
	Buy  Side = "buy"
	Sell Side = "sell"

	Market     Type = "market"
	Limit      Type = "limit"
	StopMarket Type = "stop_market"

	StatusOpen      Status = "open"
	StatusPending   Status = "pending"
	StatusFilled    Status = "filled"
	StatusCancelled Status = "cancelled"
	StatusRejected  Status = "rejected"
)

type Order struct {
	ID            uuid.UUID `json:"id"`
	UserID        uuid.UUID `json:"user_id"`
	ClientOrderID *string   `json:"client_order_id,omitempty"`
	Symbol        string    `json:"symbol"`
	Side          Side      `json:"side"`
	Type          Type      `json:"type"`
	LimitPrice    *float64  `json:"limit_price,omitempty"`
	StopPrice     *float64  `json:"stop_price,omitempty"`
	Qty           float64   `json:"qty"`
	FilledQty     float64   `json:"filled_qty"`
	AvgFillPrice  *float64  `json:"avg_fill_price,omitempty"`
	ReservedCost  float64   `json:"reserved_cost"`
	Status        Status    `json:"status"`
	RejectReason  *string   `json:"reject_reason,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type Fill struct {
	ID        int64     `json:"id"`
	OrderID   uuid.UUID `json:"order_id"`
	UserID    uuid.UUID `json:"user_id"`
	Symbol    string    `json:"symbol"`
	Side      Side      `json:"side"`
	Price     float64   `json:"price"`
	Qty       float64   `json:"qty"`
	Fee       float64   `json:"fee"`
	CreatedAt time.Time `json:"created_at"`
}

type Position struct {
	UserID      uuid.UUID `json:"user_id"`
	Symbol      string    `json:"symbol"`
	Qty         float64   `json:"qty"`
	LockedQty   float64   `json:"locked_qty"`
	Available   float64   `json:"available"`
	AvgCost     float64   `json:"avg_cost"`
	RealizedPnL float64   `json:"realized_pnl"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Account struct {
	UserID        uuid.UUID `json:"user_id"`
	Balance       float64   `json:"balance"`
	Locked        float64   `json:"locked"`
	Available     float64   `json:"available"`
	QuoteCurrency string    `json:"quote_currency"`
	UpdatedAt     time.Time `json:"updated_at"`
}
