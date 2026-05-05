package oms

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var (
	ErrInvalidSide       = errors.New("invalid side")
	ErrInvalidType       = errors.New("invalid type")
	ErrLimitPriceMissing = errors.New("limit_price required for limit orders")
	ErrLimitPriceUnused  = errors.New("limit_price not allowed for market orders")
	ErrStopPriceMissing  = errors.New("stop_price required for stop orders")
	ErrInvalidQty        = errors.New("qty must be > 0")
	ErrSymbolRequired    = errors.New("symbol required")
	ErrNoMarkPrice       = errors.New("no recent price available for market order — try again in a moment")
	ErrInsufficientFunds = errors.New("insufficient available balance")
)

// marketSlippageBuffer over-reserves market-buy orders to absorb price moves
// between place and fill. Any unspent reservation is refunded at fill time.
const marketSlippageBuffer = 1.01 // 1%

type Service struct {
	repo   *Repo
	engine *Engine
}

func NewService(repo *Repo, engine *Engine) *Service {
	return &Service{repo: repo, engine: engine}
}

type PlaceParams struct {
	UserID        uuid.UUID
	Symbol        string
	Side          Side
	Type          Type
	LimitPrice    *float64
	StopPrice     *float64
	Qty           float64
	ClientOrderID *string
}

func (s *Service) Place(ctx context.Context, p PlaceParams) (*Order, error) {
	p.Symbol = strings.ToUpper(strings.TrimSpace(p.Symbol))
	if p.Symbol == "" {
		return nil, ErrSymbolRequired
	}
	if p.Side != Buy && p.Side != Sell {
		return nil, ErrInvalidSide
	}
	switch p.Type {
	case Limit:
		if p.LimitPrice == nil || *p.LimitPrice <= 0 {
			return nil, ErrLimitPriceMissing
		}
		p.StopPrice = nil
	case Market:
		p.LimitPrice = nil
		p.StopPrice = nil
	case StopMarket:
		if p.StopPrice == nil || *p.StopPrice <= 0 {
			return nil, ErrStopPriceMissing
		}
		p.LimitPrice = nil
	default:
		return nil, ErrInvalidType
	}
	if p.Qty <= 0 {
		return nil, ErrInvalidQty
	}

	// Reservation strategy:
	//   buy + limit         → qty * limit_price (exact upper bound on cost)
	//   buy + market        → qty * mark * 1.01 (slippage buffer)
	//   buy + stop_market   → qty * stop * 1.01 (stop is the trigger floor for buy)
	//   sell                → no balance reservation (qty check at fill, against live position)
	var reserved float64
	if p.Side == Buy {
		ref, err := s.priceForReservation(p)
		if err != nil {
			return nil, err
		}
		reserved = p.Qty * ref
		if p.Type == Market || p.Type == StopMarket {
			reserved *= marketSlippageBuffer
		}
	}

	// Initial status:
	//   stop_market starts as 'pending' — flips to 'open' when stop crosses
	//   everything else starts 'open'
	status := StatusOpen
	if p.Type == StopMarket {
		status = StatusPending
	}

	tx, err := s.repo.PoolDB().BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if reserved > 0 {
		var avail float64
		if err := tx.QueryRow(ctx, `
			SELECT (balance - locked)::float8 FROM accounts WHERE user_id = $1 FOR UPDATE
		`, p.UserID).Scan(&avail); err != nil {
			return nil, err
		}
		if avail+1e-8 < reserved {
			return nil, fmt.Errorf("%w: need %.2f, available %.2f", ErrInsufficientFunds, reserved, avail)
		}
		if _, err := tx.Exec(ctx, `
			UPDATE accounts SET locked = locked + $1, updated_at = now() WHERE user_id = $2
		`, reserved, p.UserID); err != nil {
			return nil, err
		}
	}

	o, err := s.repo.InsertOrderTx(ctx, tx, InsertParams{
		UserID:        p.UserID,
		ClientOrderID: p.ClientOrderID,
		Symbol:        p.Symbol,
		Side:          p.Side,
		Type:          p.Type,
		LimitPrice:    p.LimitPrice,
		StopPrice:     p.StopPrice,
		Qty:           p.Qty,
		ReservedCost:  reserved,
		Status:        status,
	})
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	if s.engine != nil {
		s.engine.MarkActive(o.Symbol)
	}
	return o, nil
}

// priceForReservation returns a sensible reference price for sizing the
// upfront balance lock on a buy order.
//
// For stop_market buys the order executes at market when triggered, so the
// reservation must cover the higher of stop_price and current mark — a stop
// placed below the current price triggers immediately and fills at mark.
func (s *Service) priceForReservation(p PlaceParams) (float64, error) {
	mark := 0.0
	if s.engine != nil {
		if v, ok := s.engine.LastPrice(p.Symbol); ok {
			mark = v
		}
	}
	switch p.Type {
	case Limit:
		return *p.LimitPrice, nil
	case StopMarket:
		ref := *p.StopPrice
		if mark > ref {
			ref = mark
		}
		return ref, nil
	case Market:
		if mark > 0 {
			return mark, nil
		}
		return 0, ErrNoMarkPrice
	}
	return 0, ErrInvalidType
}

func (s *Service) Cancel(ctx context.Context, userID, orderID uuid.UUID) (*Order, error) {
	tx, err := s.repo.PoolDB().BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	o, err := s.repo.CancelOpenOrderTx(ctx, tx, userID, orderID)
	if err != nil {
		return nil, err
	}
	if o.ReservedCost > 0 {
		if _, err := tx.Exec(ctx, `
			UPDATE accounts SET locked = locked - $1, updated_at = now() WHERE user_id = $2
		`, o.ReservedCost, userID); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return o, nil
}

func (s *Service) ListOrders(ctx context.Context, userID uuid.UUID, status string, limit int) ([]Order, error) {
	return s.repo.ListOrders(ctx, userID, status, limit)
}

func (s *Service) ListFills(ctx context.Context, userID uuid.UUID, limit int) ([]Fill, error) {
	return s.repo.ListFills(ctx, userID, limit)
}

func (s *Service) ListPositions(ctx context.Context, userID uuid.UUID) ([]Position, error) {
	return s.repo.ListPositions(ctx, userID)
}

func (s *Service) GetAccount(ctx context.Context, userID uuid.UUID) (*Account, error) {
	return s.repo.GetAccount(ctx, userID)
}
