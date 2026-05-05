package billing

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/webhook"

	"github.com/platform/api/internal/httputil"
)

// userLookup resolves a user's email by id. Provided by the auth package via
// an adapter so this package doesn't import auth (avoids a cycle).
type userLookup interface {
	Email(ctx context.Context, id uuid.UUID) (string, error)
}

// stripeWebhookBodyLimit caps webhook payload size. Stripe events are tiny
// JSON; this is a DoS guard.
const stripeWebhookBodyLimit = 1 << 20 // 1 MiB

type Handlers struct {
	svc   *Service
	users userLookup
}

func NewHandlers(svc *Service, users userLookup) *Handlers {
	return &Handlers{svc: svc, users: users}
}

type uidProvider func(*http.Request) uuid.UUID

func (h *Handlers) ListPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.svc.ListPlans(r.Context())
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if plans == nil {
		plans = []Plan{}
	}
	httputil.WriteJSON(w, http.StatusOK, plans)
}

func (h *Handlers) MySubscription(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sub, err := h.svc.MySubscription(r.Context(), uid(r))
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusOK, sub)
	}
}

type devUpgradeReq struct {
	Plan string `json:"plan"`
}

// DevUpgrade is intentionally only mounted when Stripe is NOT configured.
// In Stripe-enabled environments the canonical path is checkout → webhook.
func (h *Handlers) DevUpgrade(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req devUpgradeReq
		if err := httputil.DecodeJSON(r, &req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid body")
			return
		}
		sub, err := h.svc.DevUpgrade(r.Context(), uid(r), req.Plan)
		if err != nil {
			if errors.Is(err, ErrInvalidPlan) {
				httputil.WriteError(w, http.StatusBadRequest, err.Error())
				return
			}
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusOK, sub)
	}
}

type checkoutReq struct {
	Plan string `json:"plan"`
}

// Checkout creates a Stripe Checkout subscription session. Returns the
// hosted-payment URL which the FE redirects the user to. Requires the
// authenticated user's email to be retrievable.
func (h *Handlers) Checkout(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req checkoutReq
		if err := httputil.DecodeJSON(r, &req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid body")
			return
		}
		userID := uid(r)
		email, err := h.users.Email(r.Context(), userID)
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, "user lookup failed")
			return
		}
		url, err := h.svc.CreateCheckoutSession(r.Context(), userID, email, req.Plan)
		if err != nil {
			switch {
			case errors.Is(err, ErrInvalidPlan):
				httputil.WriteError(w, http.StatusBadRequest, err.Error())
			case errors.Is(err, ErrPlanNotPurchasable):
				httputil.WriteError(w, http.StatusConflict, err.Error())
			default:
				httputil.WriteError(w, http.StatusBadGateway, "stripe: "+err.Error())
			}
			return
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]string{"url": url})
	}
}

func (h *Handlers) Portal(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		url, err := h.svc.CreatePortalSession(r.Context(), uid(r))
		if err != nil {
			httputil.WriteError(w, http.StatusBadGateway, "stripe: "+err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]string{"url": url})
	}
}

// Webhook verifies Stripe-Signature using the configured webhook secret and
// dispatches a small set of event types into our subscription state. Stripe
// expects 2xx within ~3s; we ack first when the event was already processed,
// and we keep handler logic synchronous-but-bounded otherwise.
func (h *Handlers) Webhook(w http.ResponseWriter, r *http.Request) {
	secret := h.svc.WebhookSecret()
	if secret == "" {
		httputil.WriteError(w, http.StatusNotImplemented, "STRIPE_WEBHOOK_SECRET not configured")
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, stripeWebhookBodyLimit+1))
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "read body: "+err.Error())
		return
	}
	if len(body) > stripeWebhookBodyLimit {
		httputil.WriteError(w, http.StatusRequestEntityTooLarge, "webhook body too large")
		return
	}
	sigHeader := r.Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(body, sigHeader, secret)
	if err != nil {
		httputil.WriteError(w, http.StatusUnauthorized, "signature verify: "+err.Error())
		return
	}

	inserted, err := h.svc.repo.RecordEventOnce(r.Context(), event.ID, string(event.Type), body)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "record event: "+err.Error())
		return
	}
	if !inserted {
		// already processed — Stripe retries deliver same event id
		w.WriteHeader(http.StatusOK)
		return
	}

	if err := h.dispatchEvent(r.Context(), &event); err != nil {
		// Stripe will retry on non-2xx
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handlers) dispatchEvent(ctx context.Context, e *stripe.Event) error {
	switch e.Type {
	case "checkout.session.completed":
		return h.handleCheckoutCompleted(ctx, e)
	case "customer.subscription.updated", "customer.subscription.created":
		return h.handleSubscriptionUpdated(ctx, e)
	case "customer.subscription.deleted":
		return h.handleSubscriptionDeleted(ctx, e)
	default:
		return nil // ignored, but recorded for audit
	}
}

func (h *Handlers) handleCheckoutCompleted(ctx context.Context, e *stripe.Event) error {
	var sess stripe.CheckoutSession
	if err := json.Unmarshal(e.Data.Raw, &sess); err != nil {
		return err
	}
	uidStr := sess.Metadata["platform_user_id"]
	planCode := sess.Metadata["plan_code"]
	if uidStr == "" || planCode == "" {
		return nil // missing metadata — ignore safely
	}
	uid, err := uuid.Parse(uidStr)
	if err != nil {
		return err
	}
	subID := ""
	if sess.Subscription != nil {
		subID = sess.Subscription.ID
	}
	return h.svc.repo.SetStripeSubscription(ctx, uid, planCode, "active", subID)
}

func (h *Handlers) handleSubscriptionUpdated(ctx context.Context, e *stripe.Event) error {
	var sub stripe.Subscription
	if err := json.Unmarshal(e.Data.Raw, &sub); err != nil {
		return err
	}
	if sub.Customer == nil {
		return nil
	}
	uid, err := h.svc.repo.GetUserIDByCustomer(ctx, sub.Customer.ID)
	if err != nil {
		// unknown customer — ignore (e.g. event for a customer created outside this env)
		return nil
	}
	planCode := "free"
	if len(sub.Items.Data) > 0 && sub.Items.Data[0].Price != nil {
		if p, err := h.svc.repo.GetPlanByStripePriceID(ctx, sub.Items.Data[0].Price.ID); err == nil {
			planCode = p.Code
		}
	}
	return h.svc.repo.SetStripeSubscription(ctx, uid, planCode, string(sub.Status), sub.ID)
}

func (h *Handlers) handleSubscriptionDeleted(ctx context.Context, e *stripe.Event) error {
	var sub stripe.Subscription
	if err := json.Unmarshal(e.Data.Raw, &sub); err != nil {
		return err
	}
	if sub.Customer == nil {
		return nil
	}
	uid, err := h.svc.repo.GetUserIDByCustomer(ctx, sub.Customer.ID)
	if err != nil {
		return nil
	}
	return h.svc.repo.SetStripeSubscription(ctx, uid, "free", "canceled", sub.ID)
}
