package market

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/platform/api/internal/httputil"
)

// LadderHandler serves a Bookmap-style price ladder for one symbol.
// Each row is an aggregate of trade tape activity at that price over the
// rolling window plus, for the row(s) at the current best bid/ask, the
// L1 quote size pulled from the signals snapshot in Redis.
type LadderHandler struct {
	db  *pgxpool.Pool
	rdb *redis.Client
}

func NewLadderHandler(db *pgxpool.Pool, rdb *redis.Client) *LadderHandler {
	return &LadderHandler{db: db, rdb: rdb}
}

type ladderRow struct {
	Price      float64 `json:"price"`
	Volume     float64 `json:"volume"`
	Trades     int64   `json:"trades"`
	BuyVolume  float64 `json:"buy_volume"`
	SellVolume float64 `json:"sell_volume"`
	BidSize    uint32  `json:"bid_size,omitempty"`
	AskSize    uint32  `json:"ask_size,omitempty"`
}

type ladderResp struct {
	Symbol     string      `json:"symbol"`
	WindowMins int         `json:"window_mins"`
	BestBid    float64     `json:"best_bid"`
	BestAsk    float64     `json:"best_ask"`
	Rows       []ladderRow `json:"rows"`
}

func (h *LadderHandler) Get(w http.ResponseWriter, r *http.Request) {
	sym := chi.URLParam(r, "symbol")
	if sym == "" {
		httputil.WriteError(w, http.StatusBadRequest, "symbol required")
		return
	}
	// Default 1440 min (24h) so weekend/overnight gaps still surface the
	// last session. Cap at 7 days; longer windows cost too much per request.
	mins := 1440
	if v := r.URL.Query().Get("mins"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 10080 {
			mins = n
		}
	}

	out := ladderResp{Symbol: sym, WindowMins: mins}

	// Run the aggregation; if the requested window yields 0 rows (closed
	// market + stale data), expand to 7 days so the chart isn't blank.
	for _, win := range []int{mins, 7 * 1440} {
		out.Rows = out.Rows[:0]
		rows, err := h.db.Query(r.Context(), `
			SELECT price,
			       SUM(qty)::float8                                                AS volume,
			       COUNT(*)::int8                                                  AS trades,
			       SUM(CASE WHEN is_buyer_maker THEN 0       ELSE qty END)::float8 AS buy_vol,
			       SUM(CASE WHEN is_buyer_maker THEN qty     ELSE 0   END)::float8 AS sell_vol
			FROM ticks
			WHERE symbol = $1 AND time > now() - ($2::int * INTERVAL '1 minute')
			GROUP BY price
			ORDER BY price DESC
		`, sym, win)
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		for rows.Next() {
			var lr ladderRow
			if err := rows.Scan(&lr.Price, &lr.Volume, &lr.Trades, &lr.BuyVolume, &lr.SellVolume); err != nil {
				rows.Close()
				httputil.WriteError(w, http.StatusInternalServerError, err.Error())
				return
			}
			out.Rows = append(out.Rows, lr)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		rows.Close()
		out.WindowMins = win
		if len(out.Rows) > 0 {
			break
		}
	}

	if h.rdb != nil {
		if buf, err := h.rdb.Get(r.Context(), "signals:"+sym).Bytes(); err == nil {
			var sig struct {
				BestBid   float64 `json:"best_bid"`
				BestAsk   float64 `json:"best_ask"`
				BestBidSz uint32  `json:"best_bid_sz"`
				BestAskSz uint32  `json:"best_ask_sz"`
			}
			if err := json.Unmarshal(buf, &sig); err == nil {
				out.BestBid = sig.BestBid
				out.BestAsk = sig.BestAsk
				ensureRow(&out, sig.BestBid).BidSize = sig.BestBidSz
				ensureRow(&out, sig.BestAsk).AskSize = sig.BestAskSz
			}
		} else if !errors.Is(err, redis.Nil) {
			_ = err
		}
	}

	w.Header().Set("Cache-Control", "no-store")
	httputil.WriteJSON(w, http.StatusOK, out)
}

// ensureRow returns the existing row at price or inserts an empty one in
// descending-price order so the FE doesn't need to merge separately.
func ensureRow(resp *ladderResp, price float64) *ladderRow {
	if price <= 0 {
		return &ladderRow{}
	}
	for i := range resp.Rows {
		if resp.Rows[i].Price == price {
			return &resp.Rows[i]
		}
	}
	insertAt := len(resp.Rows)
	for i := range resp.Rows {
		if price > resp.Rows[i].Price {
			insertAt = i
			break
		}
	}
	resp.Rows = append(resp.Rows, ladderRow{})
	copy(resp.Rows[insertAt+1:], resp.Rows[insertAt:])
	resp.Rows[insertAt] = ladderRow{Price: price}
	return &resp.Rows[insertAt]
}
