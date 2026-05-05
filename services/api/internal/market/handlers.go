package market

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/platform/api/internal/httputil"
)

type Handlers struct {
	repo *Repo
}

func NewHandlers(repo *Repo) *Handlers { return &Handlers{repo: repo} }

func (h *Handlers) ListSymbols(w http.ResponseWriter, r *http.Request) {
	syms, err := h.repo.ListSymbols(r.Context())
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if syms == nil {
		syms = []Symbol{}
	}
	httputil.WriteJSON(w, http.StatusOK, syms)
}

func (h *Handlers) Candles(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	symbol := strings.ToUpper(strings.TrimSpace(q.Get("symbol")))
	tf := strings.ToLower(strings.TrimSpace(q.Get("tf")))
	if symbol == "" {
		httputil.WriteError(w, http.StatusBadRequest, "missing symbol")
		return
	}
	if !IsValidTF(tf) {
		httputil.WriteError(w, http.StatusBadRequest, "invalid tf (1m,5m,15m,30m,1h,4h,8h,1d,1w)")
		return
	}
	to := time.Now().UTC()
	from := to.Add(-24 * time.Hour)
	if v := q.Get("from"); v != "" {
		t, err := parseTimeArg(v)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid from")
			return
		}
		from = t
	}
	if v := q.Get("to"); v != "" {
		t, err := parseTimeArg(v)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid to")
			return
		}
		to = t
	}
	limit, _ := strconv.Atoi(q.Get("limit"))
	candles, err := h.repo.Candles(r.Context(), symbol, tf, from, to, limit)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if candles == nil {
		candles = []Candle{}
	}
	httputil.WriteJSON(w, http.StatusOK, candles)
}

func (h *Handlers) RecentTicks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	symbol := strings.ToUpper(strings.TrimSpace(q.Get("symbol")))
	if symbol == "" {
		httputil.WriteError(w, http.StatusBadRequest, "missing symbol")
		return
	}
	limit, _ := strconv.Atoi(q.Get("limit"))
	ticks, err := h.repo.RecentTicks(r.Context(), symbol, limit)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if ticks == nil {
		ticks = []Tick{}
	}
	httputil.WriteJSON(w, http.StatusOK, ticks)
}

// parseTimeArg accepts RFC3339 or unix milliseconds.
func parseTimeArg(s string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.UTC(), nil
	}
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return time.Time{}, err
	}
	return time.UnixMilli(n).UTC(), nil
}
