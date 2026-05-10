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

// TPOHandler serves a Market Profile / TPO snapshot for one trading day.
// Each price level reports which 30-minute periods (A=09:30 ET, B=10:00 ET …)
// printed at that price. Letters are encoded by the integer index of the
// period within the day so the FE can map them to A-Z.
type TPOHandler struct {
	db *pgxpool.Pool
}

func NewTPOHandler(db *pgxpool.Pool) *TPOHandler {
	return &TPOHandler{db: db}
}

type tpoLevel struct {
	Price     float64 `json:"price"`
	Periods   []int   `json:"periods"`    // sorted ascending; 0 = first period of session
	Volume    float64 `json:"volume"`
}

type tpoResp struct {
	Symbol     string     `json:"symbol"`
	Day        string     `json:"day"`         // YYYY-MM-DD (UTC; ET converted client-side)
	PeriodMins int        `json:"period_mins"` // 30 by convention
	SessionStart string   `json:"session_start"`
	Levels     []tpoLevel `json:"levels"`
}

func (h *TPOHandler) Get(w http.ResponseWriter, r *http.Request) {
	sym := chi.URLParam(r, "symbol")
	if sym == "" {
		httputil.WriteError(w, http.StatusBadRequest, "symbol required")
		return
	}

	periodMins := 30
	if v, _ := strconv.Atoi(r.URL.Query().Get("period_mins")); v >= 1 && v <= 240 {
		periodMins = v
	}

	// Day window in UTC. Default = most recent day with any tick activity
	// (so weekends naturally land on Friday). Caller can override with
	// ?day=YYYY-MM-DD; treated as UTC midnight to next-midnight.
	var dayStart time.Time
	if d := strings.TrimSpace(r.URL.Query().Get("day")); d != "" {
		t, err := time.Parse("2006-01-02", d)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid day (YYYY-MM-DD)")
			return
		}
		dayStart = t.UTC()
	} else {
		var maxTime time.Time
		if err := h.db.QueryRow(r.Context(),
			"SELECT max(time) FROM ticks WHERE symbol = $1 AND time > now() - INTERVAL '14 days'",
			sym,
		).Scan(&maxTime); err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if maxTime.IsZero() {
			httputil.WriteJSON(w, http.StatusOK, tpoResp{Symbol: sym, PeriodMins: periodMins})
			return
		}
		dayStart = time.Date(maxTime.Year(), maxTime.Month(), maxTime.Day(), 0, 0, 0, 0, time.UTC)
	}
	dayEnd := dayStart.Add(24 * time.Hour)

	// Period index = floor((tick_time - day_start) / period_mins). Pulled
	// per (price, period) pair, then folded client-side here.
	rows, err := h.db.Query(r.Context(),
		"SELECT price,"+
			" FLOOR(EXTRACT(EPOCH FROM (time - $2)) / ($3 * 60))::int AS period,"+
			" SUM(qty)::float8 AS volume"+
			" FROM ticks WHERE symbol = $1 AND time >= $2 AND time < $4"+
			" GROUP BY price, period ORDER BY price DESC, period",
		sym, dayStart, periodMins, dayEnd,
	)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	byPrice := map[float64]*tpoLevel{}
	var keys []float64
	for rows.Next() {
		var price, vol float64
		var period int
		if err := rows.Scan(&price, &period, &vol); err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		lv, ok := byPrice[price]
		if !ok {
			lv = &tpoLevel{Price: price}
			byPrice[price] = lv
			keys = append(keys, price)
		}
		lv.Periods = append(lv.Periods, period)
		lv.Volume += vol
	}
	if err := rows.Err(); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	out := tpoResp{
		Symbol:       sym,
		Day:          dayStart.Format("2006-01-02"),
		PeriodMins:   periodMins,
		SessionStart: dayStart.Format(time.RFC3339),
	}
	for _, p := range keys {
		out.Levels = append(out.Levels, *byPrice[p])
	}
	w.Header().Set("Cache-Control", "no-store")
	httputil.WriteJSON(w, http.StatusOK, out)
}
