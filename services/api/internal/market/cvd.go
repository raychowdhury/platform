package market

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/platform/api/internal/httputil"
)

// CVDHandler serves Cumulative Volume Delta time series. Each bucket
// reports buy/sell volume and net delta (buy − sell). Running cumulative
// is computed client-side so the FE can reset per session if it wants.
type CVDHandler struct {
	db *pgxpool.Pool
}

func NewCVDHandler(db *pgxpool.Pool) *CVDHandler {
	return &CVDHandler{db: db}
}

type cvdBar struct {
	Time      time.Time `json:"time"`
	BuyVolume float64   `json:"buy_volume"`
	SellVolume float64  `json:"sell_volume"`
	Delta     float64   `json:"delta"`     // buy − sell for this bucket
	Volume    float64   `json:"volume"`    // total bucket volume
	Trades    int64     `json:"trades"`
	Cum       float64   `json:"cum"`       // running cumulative delta
}

func (h *CVDHandler) Get(w http.ResponseWriter, r *http.Request) {
	sym := chi.URLParam(r, "symbol")
	if sym == "" {
		httputil.WriteError(w, http.StatusBadRequest, "symbol required")
		return
	}
	tf := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("tf")))
	if tf == "" {
		tf = "1m"
	}
	bucket, ok := fpBucketFor[tf]
	if !ok {
		httputil.WriteError(w, http.StatusBadRequest, "invalid tf")
		return
	}
	limit := 200
	if v, _ := strconv.Atoi(r.URL.Query().Get("limit")); v > 0 && v <= 2000 {
		limit = v
	}

	mins := 14 * 1440 // 14d look-back; DESC LIMIT trims to most recent N

	rows, err := h.db.Query(r.Context(),
		"SELECT time_bucket($1::interval, time) AS b,"+
			" SUM(CASE WHEN is_buyer_maker THEN 0 ELSE qty END)::float8 AS buy_vol,"+
			" SUM(CASE WHEN is_buyer_maker THEN qty ELSE 0 END)::float8 AS sell_vol,"+
			" SUM(qty)::float8 AS volume,"+
			" COUNT(*)::int8 AS trades"+
			" FROM ticks WHERE symbol = $2 AND time > now() - ($3::int * INTERVAL '1 minute')"+
			" GROUP BY b ORDER BY b DESC LIMIT $4",
		bucket, sym, mins, limit,
	)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var bars []cvdBar
	for rows.Next() {
		var b cvdBar
		if err := rows.Scan(&b.Time, &b.BuyVolume, &b.SellVolume, &b.Volume, &b.Trades); err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		b.Delta = b.BuyVolume - b.SellVolume
		bars = append(bars, b)
	}
	if err := rows.Err(); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// DESC → ASC and accumulate cum.
	for i, j := 0, len(bars)-1; i < j; i, j = i+1, j-1 {
		bars[i], bars[j] = bars[j], bars[i]
	}
	var cum float64
	for i := range bars {
		cum += bars[i].Delta
		bars[i].Cum = cum
	}

	w.Header().Set("Cache-Control", "no-store")
	httputil.WriteJSON(w, http.StatusOK, bars)
}
