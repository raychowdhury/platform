// Package apikeys issues programmatic access tokens. Each token is a single
// opaque string the client sends as Authorization: Bearer <key>; the auth
// middleware looks up the sha256 hash and attaches the user_id + scopes to ctx.
package apikeys

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
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

const (
	keyPrefixTag = "pk_"
	rawByteLen   = 24 // 32 base64url chars after pk_
	prefixLen    = 11 // "pk_" + 8
)

var (
	ErrNotFound      = errors.New("api key not found")
	ErrNameRequired  = errors.New("name required")
	ErrInvalidScopes = errors.New("scopes must be a subset of {read,trade}")
)

var allowedScopes = map[string]bool{"read": true, "trade": true}

type Key struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	Name        string     `json:"name"`
	Prefix      string     `json:"prefix"`
	Scopes      []string   `json:"scopes"`
	IPAllowlist []string   `json:"ip_allowlist,omitempty"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	RevokedAt   *time.Time `json:"revoked_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type Created struct {
	*Key
	// Secret is the plaintext key string — shown to the user exactly once.
	Secret string `json:"secret"`
	// SigningSecret is the HMAC-SHA256 key. Empty for legacy bearer-only
	// keys. Returned exactly once at creation time; clients must persist it
	// alongside Secret to authenticate future requests.
	SigningSecret string `json:"signing_secret,omitempty"`
}

// AuthLookup is what the auth middleware needs from this package: resolve a
// raw bearer string into a user + scopes. Returns nil, nil if not an API key
// (so the middleware can fall through to JWT validation). When SigningSecret
// is non-empty the caller MUST verify an HMAC signature in addition to the
// bearer match — the middleware enforces this.
type AuthLookup struct {
	UserID        uuid.UUID
	Scopes        []string
	SigningSecret string
}

// ---------- Repo ----------

type Repo struct{ db *pgxpool.Pool }

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

func (r *Repo) ListByUser(ctx context.Context, userID uuid.UUID) ([]Key, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, name, prefix, scopes, ip_allowlist,
		       last_used_at, expires_at, revoked_at, created_at
		FROM api_keys WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Key
	for rows.Next() {
		var k Key
		if err := rows.Scan(&k.ID, &k.UserID, &k.Name, &k.Prefix, &k.Scopes, &k.IPAllowlist,
			&k.LastUsedAt, &k.ExpiresAt, &k.RevokedAt, &k.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, k)
	}
	return out, rows.Err()
}

func (r *Repo) Create(ctx context.Context, userID uuid.UUID, name string, scopes, ipList []string, expiresAt *time.Time) (*Created, error) {
	full, prefix, hash, err := mintKey()
	if err != nil {
		return nil, err
	}
	signingSecret, err := mintSigningSecret()
	if err != nil {
		return nil, err
	}
	var k Key
	err = r.db.QueryRow(ctx, `
		INSERT INTO api_keys (user_id, name, prefix, secret_hash, scopes, ip_allowlist, expires_at, signing_secret)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, name, prefix, scopes, ip_allowlist,
		          last_used_at, expires_at, revoked_at, created_at
	`, userID, name, prefix, hash, scopes, ipList, expiresAt, signingSecret).Scan(
		&k.ID, &k.UserID, &k.Name, &k.Prefix, &k.Scopes, &k.IPAllowlist,
		&k.LastUsedAt, &k.ExpiresAt, &k.RevokedAt, &k.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &Created{Key: &k, Secret: full, SigningSecret: signingSecret}, nil
}

func (r *Repo) Revoke(ctx context.Context, userID, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE api_keys SET revoked_at = now()
		WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
	`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// LookupByPlaintext is called by the auth middleware. Returns the AuthLookup
// for a usable key; nil if revoked, expired, or not found. Also bumps last_used_at.
func (r *Repo) LookupByPlaintext(ctx context.Context, plaintext string) (*AuthLookup, []string, error) {
	if !strings.HasPrefix(plaintext, keyPrefixTag) {
		return nil, nil, nil
	}
	hash := hashKey(plaintext)
	var (
		userID  uuid.UUID
		id      uuid.UUID
		scopes  []string
		ipList  []string
		exp     *time.Time
		rev     *time.Time
		signing *string
	)
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, scopes, ip_allowlist, expires_at, revoked_at, signing_secret
		FROM api_keys WHERE secret_hash = $1
	`, hash).Scan(&id, &userID, &scopes, &ipList, &exp, &rev, &signing)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}
	if rev != nil {
		return nil, nil, nil
	}
	if exp != nil && exp.Before(time.Now()) {
		return nil, nil, nil
	}
	// best-effort touch
	_, _ = r.db.Exec(ctx, `UPDATE api_keys SET last_used_at = now() WHERE id = $1`, id)
	out := &AuthLookup{UserID: userID, Scopes: scopes}
	if signing != nil {
		out.SigningSecret = *signing
	}
	return out, ipList, nil
}

// ---------- helpers ----------

func mintKey() (full, prefix, hash string, err error) {
	b := make([]byte, rawByteLen)
	if _, err = rand.Read(b); err != nil {
		return "", "", "", err
	}
	full = keyPrefixTag + base64.RawURLEncoding.EncodeToString(b)
	prefix = full[:prefixLen]
	hash = hashKey(full)
	return
}

// mintSigningSecret returns a 32-byte HMAC-SHA256 signing key, base64url-encoded.
func mintSigningSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func hashKey(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func validateScopes(scopes []string) ([]string, error) {
	if len(scopes) == 0 {
		return []string{"read"}, nil
	}
	out := make([]string, 0, len(scopes))
	seen := map[string]bool{}
	for _, s := range scopes {
		s = strings.ToLower(strings.TrimSpace(s))
		if !allowedScopes[s] {
			return nil, ErrInvalidScopes
		}
		if !seen[s] {
			out = append(out, s)
			seen[s] = true
		}
	}
	return out, nil
}

// ---------- HTTP handlers ----------

type Handlers struct{ repo *Repo }

func NewHandlers(repo *Repo) *Handlers { return &Handlers{repo: repo} }

type uidProvider func(*http.Request) uuid.UUID

type createReq struct {
	Name        string     `json:"name"`
	Scopes      []string   `json:"scopes,omitempty"`
	IPAllowlist []string   `json:"ip_allowlist,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

func (h *Handlers) Create(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createReq
		if err := httputil.DecodeJSON(r, &req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid body")
			return
		}
		if strings.TrimSpace(req.Name) == "" {
			httputil.WriteError(w, http.StatusBadRequest, ErrNameRequired.Error())
			return
		}
		scopes, err := validateScopes(req.Scopes)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		c, err := h.repo.Create(r.Context(), uid(r), req.Name, scopes, req.IPAllowlist, req.ExpiresAt)
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusCreated, c)
	}
}

func (h *Handlers) List(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ks, err := h.repo.ListByUser(r.Context(), uid(r))
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if ks == nil {
			ks = []Key{}
		}
		httputil.WriteJSON(w, http.StatusOK, ks)
	}
}

func (h *Handlers) Revoke(uid uidProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid id")
			return
		}
		if err := h.repo.Revoke(r.Context(), uid(r), id); err != nil {
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
