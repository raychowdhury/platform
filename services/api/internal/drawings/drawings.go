// Package drawings persists user chart annotations. Supports horizontal price
// lines (single price) and trendlines (two anchor points). Other shapes
// (Fib retracement, S-R box) can extend the same row by adding fields.
package drawings

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/platform/api/internal/httputil"
)

type Drawing struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	Symbol    string     `json:"symbol"`
	Type      string     `json:"type"` // "price_line" | "trend_line"
	Price     *float64   `json:"price,omitempty"`  // price_line + trendline anchor1
	Price2    *float64   `json:"price2,omitempty"` // trendline anchor2
	Time1     *time.Time `json:"time1,omitempty"`  // trendline anchor1 timestamp
	Time2     *time.Time `json:"time2,omitempty"`  // trendline anchor2 timestamp
	Color     string     `json:"color"`
	Label     *string    `json:"label,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

var (
	ErrNotFound      = errors.New("drawing not found")
	ErrInvalidType   = errors.New("type must be 'price_line', 'trend_line', or 'fib_retracement'")
	ErrInvalidPrice  = errors.New("price must be > 0")
	ErrInvalidSymbol = errors.New("symbol required")
	ErrInvalidAnchor = errors.New("trend_line/fib_retracement require price+time1 and price2+time2")
)

// ---------- Repo ----------

type Repo struct{ db *pgxpool.Pool }

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

const cols = `id, user_id, symbol, type, price::float8, price2::float8, time1, time2, color, label, created_at`

func scan(row pgx.Row) (*Drawing, error) {
	var d Drawing
	var p, p2 *float64
	var label *string
	if err := row.Scan(&d.ID, &d.UserID, &d.Symbol, &d.Type, &p, &p2, &d.Time1, &d.Time2, &d.Color, &label, &d.CreatedAt); err != nil {
		return nil, err
	}
	d.Price = p
	d.Price2 = p2
	d.Label = label
	return &d, nil
}

func (r *Repo) ListByUserSymbol(ctx context.Context, userID uuid.UUID, symbol string) ([]Drawing, error) {
	rows, err := r.db.Query(ctx, `SELECT `+cols+` FROM drawings WHERE user_id = $1 AND symbol = $2 ORDER BY created_at`, userID, symbol)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Drawing
	for rows.Next() {
		d, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *d)
	}
	return out, rows.Err()
}

type CreateParams struct {
	UserID uuid.UUID
	Symbol string
	Type   string
	Price  *float64
	Price2 *float64
	Time1  *time.Time
	Time2  *time.Time
	Color  string
	Label  *string
}

func (r *Repo) Create(ctx context.Context, p CreateParams) (*Drawing, error) {
	row := r.db.QueryRow(ctx, `
		INSERT INTO drawings (user_id, symbol, type, price, price2, time1, time2, color, label)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING `+cols,
		p.UserID, p.Symbol, p.Type, p.Price, p.Price2, p.Time1, p.Time2, p.Color, p.Label,
	)
	return scan(row)
}

func (r *Repo) Delete(ctx context.Context, userID, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM drawings WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ---------- HTTP handlers ----------

type Handlers struct{ repo *Repo }

func NewHandlers(repo *Repo) *Handlers { return &Handlers{repo: repo} }

type uidProvider func(*http.Request) uuid.UUID

func (h *Handlers) List(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		symbol := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("symbol")))
		if symbol == "" {
			httputil.WriteError(w, http.StatusBadRequest, ErrInvalidSymbol.Error())
			return
		}
		ds, err := h.repo.ListByUserSymbol(r.Context(), uid(r), symbol)
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if ds == nil {
			ds = []Drawing{}
		}
		httputil.WriteJSON(w, http.StatusOK, ds)
	}
}

type createReq struct {
	Symbol string     `json:"symbol"`
	Type   string     `json:"type"`
	Price  *float64   `json:"price,omitempty"`
	Price2 *float64   `json:"price2,omitempty"`
	Time1  *time.Time `json:"time1,omitempty"`
	Time2  *time.Time `json:"time2,omitempty"`
	Color  string     `json:"color,omitempty"`
	Label  *string    `json:"label,omitempty"`
}

func (h *Handlers) Create(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createReq
		if err := httputil.DecodeJSON(r, &req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid body")
			return
		}
		req.Symbol = strings.ToUpper(strings.TrimSpace(req.Symbol))
		if req.Symbol == "" {
			httputil.WriteError(w, http.StatusBadRequest, ErrInvalidSymbol.Error())
			return
		}
		switch req.Type {
		case "price_line":
			if req.Price == nil || *req.Price <= 0 {
				httputil.WriteError(w, http.StatusBadRequest, ErrInvalidPrice.Error())
				return
			}
			req.Price2 = nil
			req.Time1 = nil
			req.Time2 = nil
		case "trend_line", "fib_retracement":
			if req.Price == nil || req.Price2 == nil || req.Time1 == nil || req.Time2 == nil ||
				*req.Price <= 0 || *req.Price2 <= 0 {
				httputil.WriteError(w, http.StatusBadRequest, ErrInvalidAnchor.Error())
				return
			}
		default:
			httputil.WriteError(w, http.StatusBadRequest, ErrInvalidType.Error())
			return
		}
		if req.Color == "" {
			req.Color = "#2962ff"
		}
		d, err := h.repo.Create(r.Context(), CreateParams{
			UserID: uid(r), Symbol: req.Symbol, Type: req.Type,
			Price: req.Price, Price2: req.Price2,
			Time1: req.Time1, Time2: req.Time2,
			Color: req.Color, Label: req.Label,
		})
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusCreated, d)
	}
}

func (h *Handlers) Delete(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid id")
			return
		}
		if err := h.repo.Delete(r.Context(), uid(r), id); err != nil {
			if errors.Is(err, ErrNotFound) {
				httputil.WriteError(w, http.StatusNotFound, err.Error())
				return
			}
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusNoContent, nil)
	}
}
