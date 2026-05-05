package alerts

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/platform/api/internal/httputil"
)

type Handlers struct{ svc *Service }

func NewHandlers(svc *Service) *Handlers { return &Handlers{svc: svc} }

type uidProvider func(*http.Request) uuid.UUID

type createReq struct {
	Symbol    string  `json:"symbol"`
	Condition string  `json:"condition"`
	Threshold float64 `json:"threshold"`
	Note      *string `json:"note,omitempty"`
}

func (h *Handlers) Create(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createReq
		if err := httputil.DecodeJSON(r, &req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid body")
			return
		}
		a, err := h.svc.Create(r.Context(), uid(r), req.Symbol, Condition(req.Condition), req.Threshold, req.Note)
		if err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusCreated, a)
	}
}

func (h *Handlers) List(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		as, err := h.svc.List(r.Context(), uid(r), limit)
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if as == nil {
			as = []Alert{}
		}
		httputil.WriteJSON(w, http.StatusOK, as)
	}
}

func (h *Handlers) Delete(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := uuid.Parse(idStr)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid id")
			return
		}
		if err := h.svc.Delete(r.Context(), uid(r), id); err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusNoContent, nil)
	}
}

func statusFor(err error) int {
	switch {
	case errors.Is(err, ErrAlertNotFound):
		return http.StatusNotFound
	case errors.Is(err, ErrInvalidSymbol), errors.Is(err, ErrInvalidCondition), errors.Is(err, ErrInvalidThreshold):
		return http.StatusBadRequest
	case errors.Is(err, ErrQuotaExceeded):
		return http.StatusPaymentRequired
	default:
		return http.StatusInternalServerError
	}
}
