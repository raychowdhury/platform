// Package push implements Web Push delivery via VAPID. The HTTP layer
// surfaces /v1/me/push/{vapid,subscribe,subscriptions/{id}} endpoints; the
// engine-side Sender broadcasts to all of a user's subscriptions. Failures
// with status 404/410 prune the dead subscription so we don't keep retrying
// expired endpoints.
package push

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/platform/api/internal/httputil"
)

var ErrNotFound = errors.New("subscription not found")

type Subscription struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Endpoint  string    `json:"endpoint"`
	P256dh    string    `json:"p256dh"`
	Auth      string    `json:"auth"`
	UserAgent *string   `json:"user_agent,omitempty"`
}

// ---------- Repo ----------

type Repo struct{ db *pgxpool.Pool }

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

// Upsert inserts or refreshes a subscription keyed by endpoint. A repeat
// browser session reuses its endpoint; we always rebind to the latest user
// + key material so a logout/login on the same device doesn't strand the row.
func (r *Repo) Upsert(ctx context.Context, userID uuid.UUID, endpoint, p256dh, auth string, ua *string) (*Subscription, error) {
	row := r.db.QueryRow(ctx, `
		INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (endpoint) DO UPDATE SET
			user_id    = EXCLUDED.user_id,
			p256dh     = EXCLUDED.p256dh,
			auth       = EXCLUDED.auth,
			user_agent = EXCLUDED.user_agent,
			updated_at = now()
		RETURNING id, user_id, endpoint, p256dh, auth, user_agent
	`, userID, endpoint, p256dh, auth, ua)
	var s Subscription
	if err := row.Scan(&s.ID, &s.UserID, &s.Endpoint, &s.P256dh, &s.Auth, &s.UserAgent); err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repo) ListByUser(ctx context.Context, userID uuid.UUID) ([]Subscription, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, endpoint, p256dh, auth, user_agent
		FROM push_subscriptions WHERE user_id = $1 ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Subscription
	for rows.Next() {
		var s Subscription
		if err := rows.Scan(&s.ID, &s.UserID, &s.Endpoint, &s.P256dh, &s.Auth, &s.UserAgent); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *Repo) Delete(ctx context.Context, userID, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx,
		`DELETE FROM push_subscriptions WHERE id = $1 AND user_id = $2`, id, userID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// DeleteByEndpoint prunes a dead endpoint after the push provider returns
// 404/410 — caller does not need to know which user owned it.
func (r *Repo) DeleteByEndpoint(ctx context.Context, endpoint string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM push_subscriptions WHERE endpoint = $1`, endpoint)
	return err
}

// ---------- Sender ----------

// Sender broadcasts a JSON payload to every subscription belonging to a user.
// Per-subscription send happens synchronously (alerts engine is single-tick
// scoped); a goroutine fan-out can replace this if volume warrants it.
type Sender struct {
	repo    *Repo
	pubKey  string
	privKey string
	subject string
	log     *slog.Logger
}

func NewSender(repo *Repo, publicKey, privateKey, subject string, log *slog.Logger) *Sender {
	return &Sender{repo: repo, pubKey: publicKey, privKey: privateKey, subject: subject, log: log}
}

func (s *Sender) Configured() bool { return s.pubKey != "" && s.privKey != "" }

// SendToUser fan-outs to every subscription. Dead endpoints (404/410) are
// pruned. Other errors are logged but do not block the fan-out.
func (s *Sender) SendToUser(ctx context.Context, userID uuid.UUID, payload []byte) {
	if !s.Configured() {
		return
	}
	subs, err := s.repo.ListByUser(ctx, userID)
	if err != nil {
		s.log.Warn("push list", "user", userID, "err", err)
		return
	}
	for _, sub := range subs {
		ws := &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys:     webpush.Keys{Auth: sub.Auth, P256dh: sub.P256dh},
		}
		resp, err := webpush.SendNotificationWithContext(ctx, payload, ws, &webpush.Options{
			Subscriber:      s.subject,
			VAPIDPublicKey:  s.pubKey,
			VAPIDPrivateKey: s.privKey,
			TTL:             30,
		})
		if err != nil {
			s.log.Warn("push send", "user", userID, "endpoint", sub.Endpoint, "err", err)
			continue
		}
		_ = resp.Body.Close()
		if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone {
			_ = s.repo.DeleteByEndpoint(ctx, sub.Endpoint)
		}
	}
}

// ---------- HTTP handlers ----------

type Handlers struct {
	repo   *Repo
	pubKey string
}

func NewHandlers(repo *Repo, pubKey string) *Handlers {
	return &Handlers{repo: repo, pubKey: pubKey}
}

type uidProvider func(*http.Request) uuid.UUID

func (h *Handlers) VAPIDPublicKey(w http.ResponseWriter, _ *http.Request) {
	if h.pubKey == "" {
		httputil.WriteError(w, http.StatusNotImplemented, "VAPID not configured")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]string{"public_key": h.pubKey})
}

type subscribeReq struct {
	Endpoint string  `json:"endpoint"`
	P256dh   string  `json:"p256dh"`
	Auth     string  `json:"auth"`
	UA       *string `json:"user_agent,omitempty"`
}

func (h *Handlers) Subscribe(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req subscribeReq
		if err := httputil.DecodeJSON(r, &req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid body")
			return
		}
		if req.Endpoint == "" || req.P256dh == "" || req.Auth == "" {
			httputil.WriteError(w, http.StatusBadRequest, "endpoint, p256dh, auth required")
			return
		}
		s, err := h.repo.Upsert(r.Context(), uid(r), req.Endpoint, req.P256dh, req.Auth, req.UA)
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusCreated, s)
	}
}

func (h *Handlers) ListMine(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		subs, err := h.repo.ListByUser(r.Context(), uid(r))
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if subs == nil {
			subs = []Subscription{}
		}
		httputil.WriteJSON(w, http.StatusOK, subs)
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

