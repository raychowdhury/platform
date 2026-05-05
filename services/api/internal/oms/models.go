package oms

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
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

// Money + qty fields use shopspring/decimal end-to-end. JSON marshal emits
// canonical decimal strings (no float imprecision). Scans go through the
// `::text` cast in repo.go to round-trip postgres NUMERIC(24,8) without loss.
type Order struct {
	ID            uuid.UUID        `json:"id"`
	UserID        uuid.UUID        `json:"user_id"`
	ClientOrderID *string          `json:"client_order_id,omitempty"`
	Symbol        string           `json:"symbol"`
	Side          Side             `json:"side"`
	Type          Type             `json:"type"`
	LimitPrice    *decimal.Decimal `json:"limit_price,omitempty"`
	StopPrice     *decimal.Decimal `json:"stop_price,omitempty"`
	Qty           decimal.Decimal  `json:"qty"`
	FilledQty     decimal.Decimal  `json:"filled_qty"`
	AvgFillPrice  *decimal.Decimal `json:"avg_fill_price,omitempty"`
	ReservedCost  decimal.Decimal  `json:"reserved_cost"`
	Status        Status           `json:"status"`
	RejectReason  *string          `json:"reject_reason,omitempty"`
	CreatedAt     time.Time        `json:"created_at"`
	UpdatedAt     time.Time        `json:"updated_at"`
}

type Fill struct {
	ID        int64           `json:"id"`
	OrderID   uuid.UUID       `json:"order_id"`
	UserID    uuid.UUID       `json:"user_id"`
	Symbol    string          `json:"symbol"`
	Side      Side            `json:"side"`
	Price     decimal.Decimal `json:"price"`
	Qty       decimal.Decimal `json:"qty"`
	Fee       decimal.Decimal `json:"fee"`
	CreatedAt time.Time       `json:"created_at"`
}

type Position struct {
	UserID      uuid.UUID       `json:"user_id"`
	Symbol      string          `json:"symbol"`
	Qty         decimal.Decimal `json:"qty"`
	LockedQty   decimal.Decimal `json:"locked_qty"`
	Available   decimal.Decimal `json:"available"`
	AvgCost     decimal.Decimal `json:"avg_cost"`
	RealizedPnL decimal.Decimal `json:"realized_pnl"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type Account struct {
	UserID        uuid.UUID       `json:"user_id"`
	Balance       decimal.Decimal `json:"balance"`
	Locked        decimal.Decimal `json:"locked"`
	Available     decimal.Decimal `json:"available"`
	QuoteCurrency string          `json:"quote_currency"`
	UpdatedAt     time.Time       `json:"updated_at"`
}
