package alerts

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/platform/api/internal/entitlements"
)

var (
	ErrInvalidCondition = errors.New("invalid condition")
	ErrInvalidThreshold = errors.New("threshold must be > 0")
	ErrInvalidSymbol    = errors.New("symbol required")
	ErrQuotaExceeded    = errors.New("alert quota exceeded for plan")
)

type Service struct {
	repo   *Repo
	ent    *entitlements.Provider
	engine *Engine
}

func NewService(repo *Repo, ent *entitlements.Provider, engine *Engine) *Service {
	return &Service{repo: repo, ent: ent, engine: engine}
}

func (s *Service) Create(ctx context.Context, userID uuid.UUID, symbol string, cond Condition, threshold float64, note *string) (*Alert, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	if symbol == "" {
		return nil, ErrInvalidSymbol
	}
	if cond != PriceAbove && cond != PriceBelow {
		return nil, ErrInvalidCondition
	}
	if threshold <= 0 {
		return nil, ErrInvalidThreshold
	}
	limits := s.ent.ForUser(ctx, userID)
	n, err := s.repo.CountActive(ctx, userID)
	if err != nil {
		return nil, err
	}
	if n >= limits.MaxAlerts {
		return nil, fmt.Errorf("%w (active=%d, limit=%d)", ErrQuotaExceeded, n, limits.MaxAlerts)
	}
	a, err := s.repo.Create(ctx, userID, symbol, cond, threshold, note)
	if err != nil {
		return nil, err
	}
	if s.engine != nil {
		s.engine.MarkActive(symbol)
	}
	return a, nil
}

func (s *Service) Delete(ctx context.Context, userID, id uuid.UUID) error {
	return s.repo.Delete(ctx, userID, id)
}

func (s *Service) List(ctx context.Context, userID uuid.UUID, limit int) ([]Alert, error) {
	return s.repo.ListByUser(ctx, userID, limit)
}
