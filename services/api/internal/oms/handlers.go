package oms

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/platform/api/internal/httputil"
)

type Handlers struct {
	svc *Service
}

func NewHandlers(svc *Service) *Handlers { return &Handlers{svc: svc} }

type uidProvider func(*http.Request) uuid.UUID

type placeReq struct {
	ClientOrderID *string          `json:"client_order_id,omitempty"`
	Symbol        string           `json:"symbol"`
	Side          string           `json:"side"`
	Type          string           `json:"type"`
	LimitPrice    *decimal.Decimal `json:"limit_price,omitempty"`
	StopPrice     *decimal.Decimal `json:"stop_price,omitempty"`
	TrailPercent  *decimal.Decimal `json:"trail_percent,omitempty"`
	Qty           decimal.Decimal  `json:"qty"`
}

func (h *Handlers) Place(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req placeReq
		if err := httputil.DecodeJSON(r, &req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid body")
			return
		}
		o, err := h.svc.Place(r.Context(), PlaceParams{
			UserID:        uid(r),
			Symbol:        req.Symbol,
			Side:          Side(strings.ToLower(req.Side)),
			Type:          Type(strings.ToLower(req.Type)),
			LimitPrice:    req.LimitPrice,
			StopPrice:     req.StopPrice,
			TrailPercent:  req.TrailPercent,
			Qty:           req.Qty,
			ClientOrderID: req.ClientOrderID,
		})
		if err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusCreated, o)
	}
}

type ocoReq struct {
	Symbol     string          `json:"symbol"`
	Qty        decimal.Decimal `json:"qty"`
	LimitPrice decimal.Decimal `json:"limit_price"`
	StopPrice  decimal.Decimal `json:"stop_price"`
}

func (h *Handlers) PlaceOCO(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ocoReq
		if err := httputil.DecodeJSON(r, &req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid body")
			return
		}
		res, err := h.svc.PlaceOCO(r.Context(), OCOPlaceParams{
			UserID:     uid(r),
			Symbol:     req.Symbol,
			Qty:        req.Qty,
			LimitPrice: req.LimitPrice,
			StopPrice:  req.StopPrice,
		})
		if err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusCreated, res)
	}
}

func (h *Handlers) Cancel(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := uuid.Parse(idStr)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid id")
			return
		}
		o, err := h.svc.Cancel(r.Context(), uid(r), id)
		if err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusOK, o)
	}
}

func (h *Handlers) ListOrders(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status := r.URL.Query().Get("status")
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		os, err := h.svc.ListOrders(r.Context(), uid(r), status, limit)
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if os == nil {
			os = []Order{}
		}
		httputil.WriteJSON(w, http.StatusOK, os)
	}
}

func (h *Handlers) GetOrder(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := uuid.Parse(idStr)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid id")
			return
		}
		o, err := h.svc.repo.GetOrder(r.Context(), id)
		if err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		if o.UserID != uid(r) {
			httputil.WriteError(w, http.StatusNotFound, "not found")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, o)
	}
}

func (h *Handlers) ListFills(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		fs, err := h.svc.ListFills(r.Context(), uid(r), limit)
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if fs == nil {
			fs = []Fill{}
		}
		httputil.WriteJSON(w, http.StatusOK, fs)
	}
}

func (h *Handlers) ListPositions(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ps, err := h.svc.ListPositions(r.Context(), uid(r))
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if ps == nil {
			ps = []Position{}
		}
		httputil.WriteJSON(w, http.StatusOK, ps)
	}
}

func (h *Handlers) PnL(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		p, err := h.svc.PnL(r.Context(), uid(r))
		if err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusOK, p)
	}
}

func (h *Handlers) GetAccount(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		a, err := h.svc.GetAccount(r.Context(), uid(r))
		if err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusOK, a)
	}
}

func statusFor(err error) int {
	switch {
	case errors.Is(err, ErrOrderNotFound), errors.Is(err, ErrAccountMissing):
		return http.StatusNotFound
	case errors.Is(err, ErrInvalidSide), errors.Is(err, ErrInvalidType),
		errors.Is(err, ErrLimitPriceMissing), errors.Is(err, ErrLimitPriceUnused),
		errors.Is(err, ErrStopPriceMissing), errors.Is(err, ErrTrailPctMissing),
		errors.Is(err, ErrInvalidQty), errors.Is(err, ErrSymbolRequired),
		errors.Is(err, ErrOCOSellOnly), errors.Is(err, ErrOCOPriceLogic):
		return http.StatusBadRequest
	case errors.Is(err, ErrInsufficientFunds), errors.Is(err, ErrInsufficientQty):
		return http.StatusPaymentRequired
	case errors.Is(err, ErrNoMarkPrice):
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}
