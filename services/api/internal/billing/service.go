package billing

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v76"
	bportal "github.com/stripe/stripe-go/v76/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/customer"
)

var (
	ErrInvalidPlan       = errors.New("invalid plan")
	ErrPlanNotPurchasable = errors.New("plan has no Stripe price configured")
)

type Service struct {
	repo *Repo
	// stripeKey is empty in dev mode — handler uses that to fall back to direct upgrade.
	stripeKey     string
	webhookSecret string
	// successURL / cancelURL are returned in checkout sessions.
	successURL string
	cancelURL  string
}

func NewService(repo *Repo, stripeKey, webhookSecret, successURL, cancelURL string) *Service {
	if stripeKey != "" {
		stripe.Key = stripeKey
	}
	return &Service{
		repo:          repo,
		stripeKey:     stripeKey,
		webhookSecret: webhookSecret,
		successURL:    successURL,
		cancelURL:     cancelURL,
	}
}

func (s *Service) StripeEnabled() bool   { return s.stripeKey != "" }
func (s *Service) WebhookSecret() string { return s.webhookSecret }

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

// CreateCheckoutSession creates (or reuses) a Stripe customer for the given
// user, then opens a Checkout subscription session for the named plan.
// Returns the Stripe-hosted URL the FE should redirect to. The platform user
// id is attached as customer metadata so the webhook can resolve it back.
func (s *Service) CreateCheckoutSession(ctx context.Context, userID uuid.UUID, email, planCode string) (string, error) {
	if !s.StripeEnabled() {
		return "", errors.New("stripe disabled")
	}
	plan, err := s.repo.GetPlan(ctx, planCode)
	if err != nil {
		return "", ErrInvalidPlan
	}
	if plan.StripePriceID == nil || *plan.StripePriceID == "" {
		return "", ErrPlanNotPurchasable
	}
	customerID, err := s.ensureCustomer(ctx, userID, email)
	if err != nil {
		return "", err
	}
	params := &stripe.CheckoutSessionParams{
		Mode:       stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		Customer:   stripe.String(customerID),
		SuccessURL: stripe.String(s.successURL),
		CancelURL:  stripe.String(s.cancelURL),
		LineItems: []*stripe.CheckoutSessionLineItemParams{{
			Price:    plan.StripePriceID,
			Quantity: stripe.Int64(1),
		}},
	}
	params.AddMetadata("platform_user_id", userID.String())
	params.AddMetadata("plan_code", planCode)
	sess, err := checkoutsession.New(params)
	if err != nil {
		return "", err
	}
	return sess.URL, nil
}

// CreatePortalSession returns a Stripe-hosted billing portal URL for the
// user's existing customer record (manage payment method, cancel, etc.).
func (s *Service) CreatePortalSession(ctx context.Context, userID uuid.UUID) (string, error) {
	if !s.StripeEnabled() {
		return "", errors.New("stripe disabled")
	}
	sub, err := s.repo.GetSubscription(ctx, userID)
	if err != nil {
		return "", err
	}
	if sub.StripeCustomerID == nil || *sub.StripeCustomerID == "" {
		return "", errors.New("no stripe customer for user")
	}
	params := &stripe.BillingPortalSessionParams{
		Customer:  sub.StripeCustomerID,
		ReturnURL: stripe.String(s.successURL),
	}
	sess, err := bportal.New(params)
	if err != nil {
		return "", err
	}
	return sess.URL, nil
}

// ensureCustomer looks up or creates a Stripe Customer keyed by our user_id.
// We persist the resulting customer id on the subscription row so subsequent
// checkout/portal calls don't re-create.
func (s *Service) ensureCustomer(ctx context.Context, userID uuid.UUID, email string) (string, error) {
	sub, err := s.repo.GetSubscription(ctx, userID)
	if err == nil && sub.StripeCustomerID != nil && *sub.StripeCustomerID != "" {
		return *sub.StripeCustomerID, nil
	}
	cp := &stripe.CustomerParams{Email: stripe.String(email)}
	cp.AddMetadata("platform_user_id", userID.String())
	c, err := customer.New(cp)
	if err != nil {
		return "", err
	}
	if err := s.repo.SetStripeCustomer(ctx, userID, c.ID); err != nil {
		return "", err
	}
	return c.ID, nil
}
