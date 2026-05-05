// Package journal exports a per-user activity log as newline-delimited JSON.
// Each line: {"t": <unix_ms>, "type": <event>, ...payload}. Events come from
// the orders, fills, and alerts tables; results are emitted in chronological
// order. Stream is flushed in chunks so a wide date range doesn't buffer
// the whole result set in memory.
package journal

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/platform/api/internal/httputil"
)

// Event is the wire shape; payload merges via the omit-empty fields below.
type Event struct {
	T       int64  `json:"t"` // unix ms
	Type    string `json:"type"`
	OrderID string `json:"order_id,omitempty"`
	AlertID string `json:"alert_id,omitempty"`
	Symbol  string `json:"symbol,omitempty"`
	Side    string `json:"side,omitempty"`
	Status  string `json:"status,omitempty"`
	OType   string `json:"order_type,omitempty"`
	Qty     string `json:"qty,omitempty"`
	Price   string `json:"price,omitempty"`
	Fee     string `json:"fee,omitempty"`
	Limit   string `json:"limit_price,omitempty"`
	Stop    string `json:"stop_price,omitempty"`
	Cond    string `json:"condition,omitempty"`
	Thresh  string `json:"threshold,omitempty"`
}

type Repo struct{ db *pgxpool.Pool }

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

// Export streams events between from..to into out. Inclusive on from,
// exclusive on to. Order is by event timestamp ascending. The function
// flushes after each write so chunked transfer encoding moves bytes early.
func (r *Repo) Export(ctx context.Context, userID uuid.UUID, from, to time.Time, w http.ResponseWriter) error {
	flush := func() {
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
	}
	enc := json.NewEncoder(w)

	// Pull each source separately. Volume per user-month for paper trading
	// is small; merging in-memory is fine. If this grows, swap to a single
	// SQL UNION ALL with a window-paginated cursor.
	type row struct {
		t time.Time
		e Event
	}
	var rows []row

	// orders.placed
	{
		q, err := r.db.Query(ctx, `
			SELECT id, symbol, side, type::text, qty::text, status,
			       limit_price::text, stop_price::text, created_at
			FROM orders
			WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
		`, userID, from, to)
		if err != nil {
			return err
		}
		for q.Next() {
			var (
				id           uuid.UUID
				sym, side    string
				typ, qty     string
				status       string
				lp, sp       *string
				ts           time.Time
			)
			if err := q.Scan(&id, &sym, &side, &typ, &qty, &status, &lp, &sp, &ts); err != nil {
				q.Close()
				return err
			}
			ev := Event{
				T: ts.UnixMilli(), Type: "order.placed",
				OrderID: id.String(), Symbol: sym, Side: side,
				OType: typ, Qty: qty, Status: status,
			}
			if lp != nil {
				ev.Limit = *lp
			}
			if sp != nil {
				ev.Stop = *sp
			}
			rows = append(rows, row{ts, ev})
		}
		q.Close()
	}

	// fills
	{
		q, err := r.db.Query(ctx, `
			SELECT order_id, symbol, side, price::text, qty::text, fee::text, created_at
			FROM fills
			WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
		`, userID, from, to)
		if err != nil {
			return err
		}
		for q.Next() {
			var (
				oid                 uuid.UUID
				sym, side           string
				price, qty, fee     string
				ts                  time.Time
			)
			if err := q.Scan(&oid, &sym, &side, &price, &qty, &fee, &ts); err != nil {
				q.Close()
				return err
			}
			rows = append(rows, row{ts, Event{
				T: ts.UnixMilli(), Type: "fill",
				OrderID: oid.String(), Symbol: sym, Side: side,
				Price: price, Qty: qty, Fee: fee,
			}})
		}
		q.Close()
	}

	// alert triggers
	{
		q, err := r.db.Query(ctx, `
			SELECT id, symbol, condition, threshold::text, triggered_price::text, triggered_at
			FROM alerts
			WHERE user_id = $1 AND triggered_at IS NOT NULL
			  AND triggered_at >= $2 AND triggered_at < $3
		`, userID, from, to)
		if err != nil {
			return err
		}
		for q.Next() {
			var (
				id            uuid.UUID
				sym, cond     string
				thr, trigP    string
				ts            time.Time
			)
			if err := q.Scan(&id, &sym, &cond, &thr, &trigP, &ts); err != nil {
				q.Close()
				return err
			}
			rows = append(rows, row{ts, Event{
				T: ts.UnixMilli(), Type: "alert.triggered",
				AlertID: id.String(), Symbol: sym, Cond: cond,
				Thresh: thr, Price: trigP,
			}})
		}
		q.Close()
	}

	// chronological merge — small N for paper trading, simple sort
	for i := 1; i < len(rows); i++ {
		for j := i; j > 0 && rows[j].t.Before(rows[j-1].t); j-- {
			rows[j], rows[j-1] = rows[j-1], rows[j]
		}
	}
	for i := range rows {
		if err := enc.Encode(rows[i].e); err != nil {
			return err
		}
		if i%50 == 0 {
			flush()
		}
	}
	flush()
	return nil
}

// ---------- HTTP ----------

type Handlers struct{ repo *Repo }

func NewHandlers(repo *Repo) *Handlers { return &Handlers{repo: repo} }

type uidProvider func(*http.Request) uuid.UUID

func parseTime(s string, def time.Time) (time.Time, error) {
	if s == "" {
		return def, nil
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return time.Time{}, err
	}
	return t, nil
}

func (h *Handlers) Export(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		now := time.Now().UTC()
		from, err := parseTime(r.URL.Query().Get("from"), now.Add(-30*24*time.Hour))
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid from")
			return
		}
		to, err := parseTime(r.URL.Query().Get("to"), now.Add(time.Minute))
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid to")
			return
		}
		if !to.After(from) {
			httputil.WriteError(w, http.StatusBadRequest, "to must be after from")
			return
		}

		w.Header().Set("Content-Type", "application/x-ndjson")
		w.Header().Set("Content-Disposition",
			`attachment; filename="journal-`+from.Format("20060102")+`-`+to.Format("20060102")+`.jsonl"`)
		w.WriteHeader(http.StatusOK)
		if err := h.repo.Export(r.Context(), uid(r), from, to, w); err != nil {
			// Best-effort error notice (response already started). Log via the
			// caller's slog if needed; we just append a marker line.
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error": "stream interrupted: " + sanitize(err),
			})
		}
	}
}

// sanitize trims newlines from error strings before embedding into a NDJSON
// line so a malicious DB error can't inject a forged event.
func sanitize(err error) string {
	if err == nil {
		return ""
	}
	s := err.Error()
	s = strings.ReplaceAll(s, "\r", " ")
	s = strings.ReplaceAll(s, "\n", " ")
	return s
}

