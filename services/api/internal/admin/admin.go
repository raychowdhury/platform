// Package admin exposes operator-facing actions: user search, freeze/unfreeze,
// manual balance adjustment. All writes are recorded in admin_audit by the
// caller's user_id; FE only surfaces these routes when the authed user has
// role='admin'.
package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/platform/api/internal/httputil"
)

var (
	ErrUserNotFound = errors.New("user not found")
	ErrInvalidDelta = errors.New("balance delta required")
	ErrInvalidQuery = errors.New("invalid query")
)

type UserSummary struct {
	ID              uuid.UUID  `json:"id"`
	Email           string     `json:"email"`
	Status          string     `json:"status"`
	Role            string     `json:"role"`
	EmailVerifiedAt *time.Time `json:"email_verified_at"`
	LastLoginAt     *time.Time `json:"last_login_at"`
	CreatedAt       time.Time  `json:"created_at"`
	Balance         float64    `json:"balance"`
	Locked          float64    `json:"locked"`
}

type AuditRow struct {
	ID        int64           `json:"id"`
	ActorID   uuid.UUID       `json:"actor_id"`
	TargetID  *uuid.UUID      `json:"target_id,omitempty"`
	Action    string          `json:"action"`
	Metadata  json.RawMessage `json:"metadata,omitempty"`
	IP        *string         `json:"ip,omitempty"`
	UserAgent *string         `json:"user_agent,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
}

// ---------- Repo ----------

type Repo struct{ db *pgxpool.Pool }

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

func (r *Repo) ListUsers(ctx context.Context, q string, limit int) ([]UserSummary, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	q = strings.ToLower(strings.TrimSpace(q))
	rows, err := r.db.Query(ctx, `
		SELECT u.id, u.email, u.status, u.role, u.email_verified_at, u.last_login_at, u.created_at,
		       COALESCE(a.balance, 0)::float8, COALESCE(a.locked, 0)::float8
		FROM users u
		LEFT JOIN accounts a ON a.user_id = u.id
		WHERE $1 = '' OR u.email LIKE '%' || $1 || '%'
		ORDER BY u.created_at DESC
		LIMIT $2
	`, q, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []UserSummary
	for rows.Next() {
		var u UserSummary
		if err := rows.Scan(&u.ID, &u.Email, &u.Status, &u.Role, &u.EmailVerifiedAt, &u.LastLoginAt,
			&u.CreatedAt, &u.Balance, &u.Locked); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (r *Repo) GetUser(ctx context.Context, id uuid.UUID) (*UserSummary, error) {
	var u UserSummary
	err := r.db.QueryRow(ctx, `
		SELECT u.id, u.email, u.status, u.role, u.email_verified_at, u.last_login_at, u.created_at,
		       COALESCE(a.balance, 0)::float8, COALESCE(a.locked, 0)::float8
		FROM users u
		LEFT JOIN accounts a ON a.user_id = u.id
		WHERE u.id = $1
	`, id).Scan(&u.ID, &u.Email, &u.Status, &u.Role, &u.EmailVerifiedAt, &u.LastLoginAt,
		&u.CreatedAt, &u.Balance, &u.Locked)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	return &u, err
}

func (r *Repo) SetStatus(ctx context.Context, id uuid.UUID, status string) error {
	tag, err := r.db.Exec(ctx, `UPDATE users SET status = $1, updated_at = now() WHERE id = $2`, status, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (r *Repo) AdjustBalance(ctx context.Context, id uuid.UUID, delta float64) (float64, error) {
	var newBal float64
	err := r.db.QueryRow(ctx, `
		UPDATE accounts SET balance = balance + $1, updated_at = now()
		WHERE user_id = $2 RETURNING balance::float8
	`, delta, id).Scan(&newBal)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrUserNotFound
	}
	return newBal, err
}

func (r *Repo) RecordAudit(ctx context.Context, actor uuid.UUID, target *uuid.UUID, action, ip, ua string, metadata []byte) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO admin_audit (actor_id, target_id, action, metadata, ip, user_agent)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''))
	`, actor, target, action, metadata, ip, ua)
	return err
}

func (r *Repo) ListAudit(ctx context.Context, limit int) ([]AuditRow, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, actor_id, target_id, action, metadata, ip, user_agent, created_at
		FROM admin_audit ORDER BY created_at DESC LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AuditRow
	for rows.Next() {
		var a AuditRow
		var meta []byte
		if err := rows.Scan(&a.ID, &a.ActorID, &a.TargetID, &a.Action, &meta, &a.IP, &a.UserAgent, &a.CreatedAt); err != nil {
			return nil, err
		}
		if len(meta) > 0 {
			a.Metadata = meta
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// ---------- HTTP handlers ----------

type Handlers struct{ repo *Repo }

func NewHandlers(repo *Repo) *Handlers { return &Handlers{repo: repo} }

type uidProvider func(*http.Request) uuid.UUID

func (h *Handlers) ListUsers(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	q := r.URL.Query().Get("q")
	us, err := h.repo.ListUsers(r.Context(), q, limit)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if us == nil {
		us = []UserSummary{}
	}
	httputil.WriteJSON(w, http.StatusOK, us)
}

func (h *Handlers) GetUser(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid id")
		return
	}
	u, err := h.repo.GetUser(r.Context(), id)
	if err != nil {
		httputil.WriteError(w, statusFor(err), err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, u)
}

type statusReq struct {
	Reason string `json:"reason,omitempty"`
}

func (h *Handlers) Freeze(uid uidProvider) http.HandlerFunc   { return h.setStatus(uid, "frozen", "admin.user_frozen") }
func (h *Handlers) Unfreeze(uid uidProvider) http.HandlerFunc { return h.setStatus(uid, "active", "admin.user_unfrozen") }

func (h *Handlers) setStatus(uid uidProvider, status, action string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		target, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid id")
			return
		}
		var req statusReq
		_ = httputil.DecodeJSON(r, &req)
		if err := h.repo.SetStatus(r.Context(), target, status); err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		meta, _ := json.Marshal(map[string]any{"reason": req.Reason})
		_ = h.repo.RecordAudit(r.Context(), uid(r), &target, action,
			httputil.ClientIP(r), r.UserAgent(), meta)
		httputil.WriteJSON(w, http.StatusNoContent, nil)
	}
}

type balanceReq struct {
	Delta  float64 `json:"delta"`
	Reason string  `json:"reason"`
}

func (h *Handlers) AdjustBalance(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		target, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid id")
			return
		}
		var req balanceReq
		if err := httputil.DecodeJSON(r, &req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid body")
			return
		}
		if req.Delta == 0 {
			httputil.WriteError(w, http.StatusBadRequest, ErrInvalidDelta.Error())
			return
		}
		newBal, err := h.repo.AdjustBalance(r.Context(), target, req.Delta)
		if err != nil {
			httputil.WriteError(w, statusFor(err), err.Error())
			return
		}
		meta, _ := json.Marshal(map[string]any{"delta": req.Delta, "reason": req.Reason, "new_balance": newBal})
		_ = h.repo.RecordAudit(r.Context(), uid(r), &target, "admin.balance_adjusted",
			httputil.ClientIP(r), r.UserAgent(), meta)
		httputil.WriteJSON(w, http.StatusOK, map[string]float64{"balance": newBal})
	}
}

func (h *Handlers) ListAudit(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	rows, err := h.repo.ListAudit(r.Context(), limit)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if rows == nil {
		rows = []AuditRow{}
	}
	httputil.WriteJSON(w, http.StatusOK, rows)
}

func statusFor(err error) int {
	switch {
	case errors.Is(err, ErrUserNotFound):
		return http.StatusNotFound
	case errors.Is(err, ErrInvalidDelta), errors.Is(err, ErrInvalidQuery):
		return http.StatusBadRequest
	default:
		return http.StatusInternalServerError
	}
}
