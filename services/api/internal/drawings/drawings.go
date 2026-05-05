// Package drawings persists user chart annotations. v1 supports horizontal
// price lines only (lightweight-charts v4 has built-in createPriceLine);
// trendlines / fib / S-R boxes need a custom series plugin and are deferred.
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
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Symbol    string    `json:"symbol"`
	Type      string    `json:"type"`  // "price_line"
	Price     float64   `json:"price"`
	Color     string    `json:"color"`
	Label     *string   `json:"label,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

var (
	ErrNotFound       = errors.New("drawing not found")
	ErrInvalidType    = errors.New("type must be 'price_line'")
	ErrInvalidPrice   = errors.New("price must be > 0")
	ErrInvalidSymbol  = errors.New("symbol required")
)

// ---------- Repo ----------

type Repo struct{ db *pgxpool.Pool }

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

const cols = `id, user_id, symbol, type, price::float8, color, label, created_at`

func scan(row pgx.Row) (*Drawing, error) {
	var d Drawing
	var label *string
	if err := row.Scan(&d.ID, &d.UserID, &d.Symbol, &d.Type, &d.Price, &d.Color, &label, &d.CreatedAt); err != nil {
		return nil, err
	}
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

func (r *Repo) Create(ctx context.Context, userID uuid.UUID, symbol, typ string, price float64, color string, label *string) (*Drawing, error) {
	row := r.db.QueryRow(ctx, `
		INSERT INTO drawings (user_id, symbol, type, price, color, label)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+cols,
		userID, symbol, typ, price, color, label,
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
	Symbol string  `json:"symbol"`
	Type   string  `json:"type"`
	Price  float64 `json:"price"`
	Color  string  `json:"color,omitempty"`
	Label  *string `json:"label,omitempty"`
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
		if req.Type != "price_line" {
			httputil.WriteError(w, http.StatusBadRequest, ErrInvalidType.Error())
			return
		}
		if req.Price <= 0 {
			httputil.WriteError(w, http.StatusBadRequest, ErrInvalidPrice.Error())
			return
		}
		if req.Color == "" {
			req.Color = "#2962ff"
		}
		d, err := h.repo.Create(r.Context(), uid(r), req.Symbol, req.Type, req.Price, req.Color, req.Label)
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
