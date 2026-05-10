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

// FootprintHandler serves volume-broken-down-by-price candles. Each bar
// carries the standard OHLC plus a list of price levels with buy/sell
// volume (taker side derived from is_buyer_maker on each tick).
type FootprintHandler struct {
	db *pgxpool.Pool
}

func NewFootprintHandler(db *pgxpool.Pool) *FootprintHandler {
	return &FootprintHandler{db: db}
}

type fpLevel struct {
	Price     float64 `json:"price"`
	BuyVolume float64 `json:"buy_volume"`
	SellVolume float64 `json:"sell_volume"`
}

type fpBar struct {
	Time   time.Time `json:"time"`
	Open   float64   `json:"open"`
	High   float64   `json:"high"`
	Low    float64   `json:"low"`
	Close  float64   `json:"close"`
	Volume float64   `json:"volume"`
	Delta  float64   `json:"delta"` // buy - sell
	Levels []fpLevel `json:"levels"`
}

// timeframe → bucket interval. Mirrors candles_1m granularity but resolves
// dynamically so the SQL stays in one place.
var fpBucketFor = map[string]string{
	"1m": "1 minute", "5m": "5 minutes", "15m": "15 minutes", "30m": "30 minutes",
	"1h": "1 hour", "4h": "4 hours", "1d": "1 day", "1w": "7 days",
}

func (h *FootprintHandler) Get(w http.ResponseWriter, r *http.Request) {
	sym := chi.URLParam(r, "symbol")
	if sym == "" {
		httputil.WriteError(w, http.StatusBadRequest, "symbol required")
		return
	}
	tf := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("tf")))
	if tf == "" {
		tf = "5m"
	}
	bucket, ok := fpBucketFor[tf]
	if !ok {
		httputil.WriteError(w, http.StatusBadRequest, "invalid tf (1m,5m,15m,30m,1h,4h,1d)")
		return
	}
	limit := 30
	if v, _ := strconv.Atoi(r.URL.Query().Get("limit")); v > 0 && v <= 200 {
		limit = v
	}
	// Look back 14 days regardless of tf×limit. The DESC LIMIT below trims
	// to the most recent N bars; wider window just means weekend/closed
	// gaps don't yield zero rows when limit×tf would otherwise be too tight.
	mins := 14 * 1440

	// Two passes:
	//   1) per-bucket OHLC (ordered by event time within bucket)
	//   2) per-bucket per-price aggregation
	// Joined client-side here in Go to keep the SQL each linear.
	type ohlcRow struct {
		bucket time.Time
		open   float64
		high   float64
		low    float64
		close  float64
	}
	ohlcRows, err := h.db.Query(r.Context(),
		// sql is templated with the trusted bucket interval (allowlist above)
		"SELECT time_bucket($1::interval, time) AS b,"+
			" first(price, time) AS o, max(price) AS h, min(price) AS l, last(price, time) AS c"+
			" FROM ticks WHERE symbol = $2 AND time > now() - ($3::int * INTERVAL '1 minute')"+
			" GROUP BY b ORDER BY b DESC LIMIT $4",
		bucket, sym, mins, limit,
	)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	ohlcByBucket := map[time.Time]ohlcRow{}
	var bucketKeys []time.Time
	for ohlcRows.Next() {
		var row ohlcRow
		if err := ohlcRows.Scan(&row.bucket, &row.open, &row.high, &row.low, &row.close); err != nil {
			ohlcRows.Close()
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		ohlcByBucket[row.bucket] = row
		bucketKeys = append(bucketKeys, row.bucket)
	}
	ohlcRows.Close()
	if err := ohlcRows.Err(); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if len(bucketKeys) == 0 {
		httputil.WriteJSON(w, http.StatusOK, []fpBar{})
		return
	}

	// Reverse to ascending so chart renders left → right.
	for i, j := 0, len(bucketKeys)-1; i < j; i, j = i+1, j-1 {
		bucketKeys[i], bucketKeys[j] = bucketKeys[j], bucketKeys[i]
	}

	// Per-price per-bucket aggregation, scoped to the same time range so we
	// don't pull rows we won't use.
	lvlRows, err := h.db.Query(r.Context(),
		"SELECT time_bucket($1::interval, time) AS b, price,"+
			" SUM(CASE WHEN is_buyer_maker THEN 0 ELSE qty END)::float8 AS buy_vol,"+
			" SUM(CASE WHEN is_buyer_maker THEN qty ELSE 0 END)::float8 AS sell_vol"+
			" FROM ticks WHERE symbol = $2 AND time >= $3 AND time < $4"+
			" GROUP BY b, price",
		bucket, sym, bucketKeys[0], bucketKeys[len(bucketKeys)-1].Add(parseInterval(bucket)),
	)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer lvlRows.Close()
	levelsByBucket := map[time.Time][]fpLevel{}
	for lvlRows.Next() {
		var b time.Time
		var lv fpLevel
		if err := lvlRows.Scan(&b, &lv.Price, &lv.BuyVolume, &lv.SellVolume); err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		levelsByBucket[b] = append(levelsByBucket[b], lv)
	}
	if err := lvlRows.Err(); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	out := make([]fpBar, 0, len(bucketKeys))
	for _, k := range bucketKeys {
		o := ohlcByBucket[k]
		levels := levelsByBucket[k]
		var vol, buy, sell float64
		for _, lv := range levels {
			vol += lv.BuyVolume + lv.SellVolume
			buy += lv.BuyVolume
			sell += lv.SellVolume
		}
		out = append(out, fpBar{
			Time:   o.bucket,
			Open:   o.open,
			High:   o.high,
			Low:    o.low,
			Close:  o.close,
			Volume: vol,
			Delta:  buy - sell,
			Levels: levels,
		})
	}
	w.Header().Set("Cache-Control", "no-store")
	httputil.WriteJSON(w, http.StatusOK, out)
}

// parseInterval converts the small set of supported bucket strings to a
// duration so the time-range upper bound is correct (avoids dropping the
// last bar's tail).
func parseInterval(s string) time.Duration {
	switch s {
	case "1 minute":
		return time.Minute
	case "5 minutes":
		return 5 * time.Minute
	case "15 minutes":
		return 15 * time.Minute
	case "30 minutes":
		return 30 * time.Minute
	case "1 hour":
		return time.Hour
	case "4 hours":
		return 4 * time.Hour
	case "1 day":
		return 24 * time.Hour
	case "7 days":
		return 7 * 24 * time.Hour
	}
	return time.Minute
}
