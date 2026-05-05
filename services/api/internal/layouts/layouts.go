// Package layouts persists multi-screen panel arrangements per user.
// Each layout = grid choice + ordered list of panel configs (symbol, tf, ...).
// FE owns the panel JSON shape; backend treats it as opaque jsonb.
package layouts

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/platform/api/internal/entitlements"
	"github.com/platform/api/internal/httputil"
)

type Layout struct {
	ID        uuid.UUID       `json:"id"`
	UserID    uuid.UUID       `json:"user_id"`
	Name      string          `json:"name"`
	Grid      string          `json:"grid"`     // "1" | "2" | "4"
	Panels    json.RawMessage `json:"panels"`   // [{symbol, tf, ...}]
	IsDefault bool            `json:"is_default"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

var (
	ErrNotFound      = errors.New("layout not found")
	ErrInvalidGrid   = errors.New("grid must be 1, 2, or 4")
	ErrNameRequired  = errors.New("name required")
	ErrPanelsInvalid = errors.New("panels must be a JSON array")
	ErrQuotaExceeded = errors.New("layout quota exceeded for plan")
)

// ---------- Repo ----------

type Repo struct{ db *pgxpool.Pool }

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

const cols = `id, user_id, name, grid, panels, is_default, created_at, updated_at`

func scan(row pgx.Row) (*Layout, error) {
	var l Layout
	var panels []byte
	if err := row.Scan(&l.ID, &l.UserID, &l.Name, &l.Grid, &panels, &l.IsDefault, &l.CreatedAt, &l.UpdatedAt); err != nil {
		return nil, err
	}
	l.Panels = panels
	return &l, nil
}

func (r *Repo) ListByUser(ctx context.Context, userID uuid.UUID) ([]Layout, error) {
	rows, err := r.db.Query(ctx, `SELECT `+cols+` FROM layouts WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Layout
	for rows.Next() {
		l, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *l)
	}
	return out, rows.Err()
}

func (r *Repo) Get(ctx context.Context, userID, id uuid.UUID) (*Layout, error) {
	row := r.db.QueryRow(ctx, `SELECT `+cols+` FROM layouts WHERE id = $1 AND user_id = $2`, id, userID)
	l, err := scan(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return l, err
}

func (r *Repo) Create(ctx context.Context, userID uuid.UUID, name, grid string, panels []byte, isDefault bool) (*Layout, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if isDefault {
		if _, err := tx.Exec(ctx, `UPDATE layouts SET is_default = false WHERE user_id = $1 AND is_default`, userID); err != nil {
			return nil, err
		}
	}
	row := tx.QueryRow(ctx, `
		INSERT INTO layouts (user_id, name, grid, panels, is_default)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+cols,
		userID, name, grid, panels, isDefault,
	)
	l, err := scan(row)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return l, nil
}

func (r *Repo) Update(ctx context.Context, userID, id uuid.UUID, name, grid string, panels []byte, isDefault bool) (*Layout, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if isDefault {
		if _, err := tx.Exec(ctx, `UPDATE layouts SET is_default = false WHERE user_id = $1 AND is_default AND id <> $2`, userID, id); err != nil {
			return nil, err
		}
	}
	row := tx.QueryRow(ctx, `
		UPDATE layouts
		SET name = $3, grid = $4, panels = $5, is_default = $6, updated_at = now()
		WHERE id = $1 AND user_id = $2
		RETURNING `+cols,
		id, userID, name, grid, panels, isDefault,
	)
	l, err := scan(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return l, nil
}

func (r *Repo) Delete(ctx context.Context, userID, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM layouts WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repo) Count(ctx context.Context, userID uuid.UUID) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM layouts WHERE user_id = $1`, userID).Scan(&n)
	return n, err
}

// ---------- Service ----------

type Service struct {
	repo *Repo
	ent  *entitlements.Provider
}

func NewService(repo *Repo, ent *entitlements.Provider) *Service { return &Service{repo: repo, ent: ent} }

type SaveParams struct {
	UserID    uuid.UUID
	Name      string
	Grid      string
	Panels    json.RawMessage
	IsDefault bool
}

func (s *Service) validate(p *SaveParams) error {
	p.Name = strings.TrimSpace(p.Name)
	if p.Name == "" {
		return ErrNameRequired
	}
	if p.Grid != "1" && p.Grid != "2" && p.Grid != "4" {
		return ErrInvalidGrid
	}
	if len(p.Panels) == 0 || p.Panels[0] != '[' {
		return ErrPanelsInvalid
	}
	return nil
}

func (s *Service) Create(ctx context.Context, p SaveParams) (*Layout, error) {
	if err := s.validate(&p); err != nil {
		return nil, err
	}
	limits := s.ent.ForUser(ctx, p.UserID)
	n, err := s.repo.Count(ctx, p.UserID)
	if err != nil {
		return nil, err
	}
	if n >= limits.MaxLayouts {
		return nil, fmt.Errorf("%w (count=%d, limit=%d)", ErrQuotaExceeded, n, limits.MaxLayouts)
	}
	return s.repo.Create(ctx, p.UserID, p.Name, p.Grid, []byte(p.Panels), p.IsDefault)
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, p SaveParams) (*Layout, error) {
	if err := s.validate(&p); err != nil {
		return nil, err
	}
	return s.repo.Update(ctx, p.UserID, id, p.Name, p.Grid, []byte(p.Panels), p.IsDefault)
}

func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]Layout, error) {
	return s.repo.ListByUser(ctx, userID)
}
func (s *Service) Get(ctx context.Context, userID, id uuid.UUID) (*Layout, error) {
	return s.repo.Get(ctx, userID, id)
}
func (s *Service) Delete(ctx context.Context, userID, id uuid.UUID) error {
	return s.repo.Delete(ctx, userID, id)
}

// ---------- HTTP handlers ----------

type Handlers struct{ svc *Service }

func NewHandlers(svc *Service) *Handlers { return &Handlers{svc: svc} }

type uidProvider func(*http.Request) uuid.UUID

type saveReq struct {
	Name      string          `json:"name"`
	Grid      string          `json:"grid"`
	Panels    json.RawMessage `json:"panels"`
	IsDefault bool            `json:"is_default"`
}

func (h *Handlers) Create(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req saveReq
		if err := httputil.DecodeJSON(r, &req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid body")
			return
		}
		l, err := h.svc.Create(r.Context(), SaveParams{
			UserID: uid(r), Name: req.Name, Grid: req.Grid, Panels: req.Panels, IsDefault: req.IsDefault,
		})
		if err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusCreated, l)
	}
}

func (h *Handlers) Update(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid id")
			return
		}
		var req saveReq
		if err := httputil.DecodeJSON(r, &req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid body")
			return
		}
		l, err := h.svc.Update(r.Context(), id, SaveParams{
			UserID: uid(r), Name: req.Name, Grid: req.Grid, Panels: req.Panels, IsDefault: req.IsDefault,
		})
		if err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusOK, l)
	}
}

func (h *Handlers) List(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ls, err := h.svc.List(r.Context(), uid(r))
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if ls == nil {
			ls = []Layout{}
		}
		httputil.WriteJSON(w, http.StatusOK, ls)
	}
}

func (h *Handlers) Get(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid id")
			return
		}
		l, err := h.svc.Get(r.Context(), uid(r), id)
		if err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusOK, l)
	}
}

func (h *Handlers) Delete(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid id")
			return
		}
		if err := h.svc.Delete(r.Context(), uid(r), id); err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusNoContent, nil)
	}
}

func statusFor(err error) int {
	switch {
	case errors.Is(err, ErrNotFound):
		return http.StatusNotFound
	case errors.Is(err, ErrInvalidGrid), errors.Is(err, ErrNameRequired), errors.Is(err, ErrPanelsInvalid):
		return http.StatusBadRequest
	case errors.Is(err, ErrQuotaExceeded):
		return http.StatusPaymentRequired
	default:
		return http.StatusInternalServerError
	}
}
