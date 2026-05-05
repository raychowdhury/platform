package billing

import (
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/platform/api/internal/httputil"
)

type Handlers struct {
	svc *Service
}

func NewHandlers(svc *Service) *Handlers { return &Handlers{svc: svc} }

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

// CheckoutPlaceholder is mounted when Stripe IS configured. The full Stripe
// SDK wiring is out of scope here; this returns a 501 explaining the missing
// piece so the FE can detect Stripe-mode without crashing.
func (h *Handlers) CheckoutPlaceholder(w http.ResponseWriter, _ *http.Request) {
	httputil.WriteError(w, http.StatusNotImplemented,
		"Stripe checkout integration not wired (set STRIPE_SECRET_KEY=\"\" to use dev upgrade)")
}

func (h *Handlers) PortalPlaceholder(w http.ResponseWriter, _ *http.Request) {
	httputil.WriteError(w, http.StatusNotImplemented,
		"Stripe customer portal integration not wired")
}

// WebhookPlaceholder records any incoming event for audit/idempotency but
// performs no state change. Real wiring needs Stripe signature verification.
func (h *Handlers) WebhookPlaceholder(w http.ResponseWriter, _ *http.Request) {
	httputil.WriteError(w, http.StatusNotImplemented,
		"Stripe webhook integration not wired")
}
