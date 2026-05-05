// Package notifications stores user-facing events (alert fires, fills, system
// messages). The alerts engine writes rows here; the FE polls / pushes via WS.
package notifications

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/platform/api/internal/httputil"
)

type Notification struct {
	ID        int64           `json:"id"`
	UserID    uuid.UUID       `json:"user_id"`
	AlertID   *uuid.UUID      `json:"alert_id,omitempty"`
	Type      string          `json:"type"`
	Title     string          `json:"title"`
	Body      *string         `json:"body,omitempty"`
	Metadata  json.RawMessage `json:"metadata,omitempty"`
	ReadAt    *time.Time      `json:"read_at,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
}

var ErrNotFound = errors.New("notification not found")

// ---------- Repo ----------

type Repo struct{ db *pgxpool.Pool }

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

const cols = `id, user_id, alert_id, type, title, body, metadata, read_at, created_at`

func scan(row pgx.Row) (*Notification, error) {
	var n Notification
	var body *string
	var meta []byte
	if err := row.Scan(&n.ID, &n.UserID, &n.AlertID, &n.Type, &n.Title, &body, &meta, &n.ReadAt, &n.CreatedAt); err != nil {
		return nil, err
	}
	n.Body = body
	if len(meta) > 0 {
		n.Metadata = meta
	}
	return &n, nil
}

// Insert is the single write path. Engines call this; the FE never does.
func (r *Repo) Insert(ctx context.Context, userID uuid.UUID, alertID *uuid.UUID, typ, title string, body *string, metadata []byte) (*Notification, error) {
	row := r.db.QueryRow(ctx, `
		INSERT INTO notifications (user_id, alert_id, type, title, body, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+cols,
		userID, alertID, typ, title, body, metadata,
	)
	return scan(row)
}

// InsertNotification adapts Insert to the alerts.NotificationSink interface
// (return type only — keeps a single canonical write path).
func (r *Repo) InsertNotification(ctx context.Context, userID uuid.UUID, alertID *uuid.UUID, typ, title string, body *string, metadata []byte) error {
	_, err := r.Insert(ctx, userID, alertID, typ, title, body, metadata)
	return err
}

func (r *Repo) ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]Notification, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := r.db.Query(ctx, `SELECT `+cols+` FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Notification
	for rows.Next() {
		n, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *n)
	}
	return out, rows.Err()
}

func (r *Repo) UnreadCount(ctx context.Context, userID uuid.UUID) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL`, userID).Scan(&n)
	return n, err
}

func (r *Repo) MarkRead(ctx context.Context, userID uuid.UUID, id int64) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
		id, userID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repo) MarkAllRead(ctx context.Context, userID uuid.UUID) (int, error) {
	tag, err := r.db.Exec(ctx,
		`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
		userID,
	)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

// ---------- HTTP handlers ----------

type Handlers struct{ repo *Repo }

func NewHandlers(repo *Repo) *Handlers { return &Handlers{repo: repo} }

type uidProvider func(*http.Request) uuid.UUID

func (h *Handlers) List(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		ns, err := h.repo.ListByUser(r.Context(), uid(r), limit)
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if ns == nil {
			ns = []Notification{}
		}
		httputil.WriteJSON(w, http.StatusOK, ns)
	}
}

func (h *Handlers) UnreadCount(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		n, err := h.repo.UnreadCount(r.Context(), uid(r))
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]int{"unread": n})
	}
}

func (h *Handlers) MarkRead(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid id")
			return
		}
		if err := h.repo.MarkRead(r.Context(), uid(r), id); err != nil {
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

func (h *Handlers) MarkAllRead(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		n, err := h.repo.MarkAllRead(r.Context(), uid(r))
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]int{"updated": n})
	}
}
