package billing

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var ErrInvalidPlan = errors.New("invalid plan")

type Service struct {
	repo *Repo
	// stripeKey is empty in dev mode — handler uses that to fall back to direct upgrade.
	stripeKey string
	// successURL / cancelURL are returned in checkout sessions.
	successURL string
	cancelURL  string
}

func NewService(repo *Repo, stripeKey, successURL, cancelURL string) *Service {
	return &Service{repo: repo, stripeKey: stripeKey, successURL: successURL, cancelURL: cancelURL}
}

func (s *Service) StripeEnabled() bool { return s.stripeKey != "" }

func (s *Service) ListPlans(ctx context.Context) ([]Plan, error) {
	return s.repo.ListPlans(ctx)
}

func (s *Service) MySubscription(ctx context.Context, userID uuid.UUID) (*Subscription, error) {
	sub, err := s.repo.GetSubscription(ctx, userID)
	if errors.Is(err, ErrSubscriptionNotFound) {
		// Defensive: ensure free row even if trigger missed.
		return s.repo.UpsertSubscription(ctx, userID, "free", "active")
	}
	return sub, err
}

// DevUpgrade switches the user's plan without going through Stripe. Only meant
// for environments where Stripe is not configured (StripeEnabled()==false).
// In production this endpoint should be disabled or admin-only.
func (s *Service) DevUpgrade(ctx context.Context, userID uuid.UUID, planCode string) (*Subscription, error) {
	if _, err := s.repo.GetPlan(ctx, planCode); err != nil {
		return nil, ErrInvalidPlan
	}
	return s.repo.UpsertSubscription(ctx, userID, planCode, "active")
}

// HandleStripeEvent maps a small set of Stripe webhook event types into our
// subscription state. Caller is responsible for signature verification and
// idempotency (RecordEventOnce).
func (s *Service) HandleStripeEvent(ctx context.Context, userID uuid.UUID, planCode, status string) error {
	_, err := s.repo.UpsertSubscription(ctx, userID, planCode, status)
	return err
}
