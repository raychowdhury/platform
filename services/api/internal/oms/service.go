package oms

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
)

var (
	ErrInvalidSide       = errors.New("invalid side")
	ErrInvalidType       = errors.New("invalid type")
	ErrLimitPriceMissing = errors.New("limit_price required for limit orders")
	ErrLimitPriceUnused  = errors.New("limit_price not allowed for market orders")
	ErrInvalidQty        = errors.New("qty must be > 0")
	ErrSymbolRequired    = errors.New("symbol required")
)

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
	if p.Type != Market && p.Type != Limit {
		return nil, ErrInvalidType
	}
	if p.Qty <= 0 {
		return nil, ErrInvalidQty
	}
	switch p.Type {
	case Limit:
		if p.LimitPrice == nil || *p.LimitPrice <= 0 {
			return nil, ErrLimitPriceMissing
		}
	case Market:
		p.LimitPrice = nil
	}
	o, err := s.repo.InsertOrder(ctx, p.UserID, p.ClientOrderID, p.Symbol, p.Side, p.Type, p.LimitPrice, p.Qty)
	if err != nil {
		return nil, err
	}
	if s.engine != nil {
		s.engine.MarkActive(o.Symbol)
	}
	return o, nil
}

func (s *Service) Cancel(ctx context.Context, userID, orderID uuid.UUID) (*Order, error) {
	o, err := s.repo.CancelOpenOrder(ctx, userID, orderID)
	if err != nil {
		return nil, err
	}
	// engine will lazily prune; nothing to do here
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
