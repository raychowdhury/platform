package market

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"

	"github.com/platform/api/internal/httputil"
)

// SignalsHandler serves the latest book+tape signal snapshot for a symbol,
// produced by the ingest service and cached in Redis under `signals:<symbol>`.
type SignalsHandler struct {
	rdb *redis.Client
}

func NewSignalsHandler(rdb *redis.Client) *SignalsHandler {
	return &SignalsHandler{rdb: rdb}
}

func (h *SignalsHandler) Get(w http.ResponseWriter, r *http.Request) {
	sym := chi.URLParam(r, "symbol")
	if sym == "" {
		httputil.WriteError(w, http.StatusBadRequest, "symbol required")
		return
	}
	buf, err := h.rdb.Get(r.Context(), "signals:"+sym).Bytes()
	if errors.Is(err, redis.Nil) {
		// 200 + JSON null when no cache exists (e.g. weekend / market closed).
		// Avoids 404-spam in browser DevTools when the client polls signals
		// every couple of seconds and the ingest engine has nothing to publish.
		w.Header().Set("Cache-Control", "no-store")
		httputil.WriteJSON(w, http.StatusOK, nil)
		return
	}
	if err != nil {
		if errors.Is(err, context.Canceled) {
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var raw json.RawMessage = buf
	httputil.WriteJSON(w, http.StatusOK, raw)
}
