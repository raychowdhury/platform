package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/platform/api/internal/auth"
	"github.com/platform/api/internal/httputil"
)

type ctxKey string

const (
	ctxUserID ctxKey = "user_id"
	ctxScopes ctxKey = "scopes"
)

// APIKeyResolver is satisfied by apikeys.Repo.LookupByPlaintext. Returns
// (auth, ipAllowlist, err); auth is nil for "not an API key / not valid".
type APIKeyResolver interface {
	LookupByPlaintext(ctx context.Context, plaintext string) (auth *APIKeyAuth, ipAllowlist []string, err error)
}

// APIKeyAuth mirrors apikeys.AuthLookup but lives here to avoid an import cycle.
type APIKeyAuth struct {
	UserID uuid.UUID
	Scopes []string
}

// RequireAuth accepts either an access JWT or an API key prefixed pk_. JWTs
// give the user every scope; API keys give exactly the scopes recorded on the
// row, plus an optional IP allowlist enforced here.
func RequireAuth(issuer *auth.TokenIssuer, keys APIKeyResolver) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			if !strings.HasPrefix(h, "Bearer ") {
				httputil.WriteError(w, http.StatusUnauthorized, "missing bearer token")
				return
			}
			tok := strings.TrimPrefix(h, "Bearer ")

			// API key path
			if strings.HasPrefix(tok, "pk_") && keys != nil {
				lookup, ipList, err := keys.LookupByPlaintext(r.Context(), tok)
				if err != nil {
					httputil.WriteError(w, http.StatusInternalServerError, "lookup failed")
					return
				}
				if lookup == nil {
					httputil.WriteError(w, http.StatusUnauthorized, "invalid api key")
					return
				}
				if len(ipList) > 0 && !ipAllowed(ipList, httputil.ClientIP(r)) {
					httputil.WriteError(w, http.StatusForbidden, "ip not allowlisted for this key")
					return
				}
				ctx := context.WithValue(r.Context(), ctxUserID, lookup.UserID)
				ctx = context.WithValue(ctx, ctxScopes, lookup.Scopes)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// JWT path — implicit "all scopes"
			claims, err := issuer.ParseAccess(tok)
			if err != nil {
				httputil.WriteError(w, http.StatusUnauthorized, "invalid token")
				return
			}
			uid, err := uuid.Parse(claims.UID)
			if err != nil {
				httputil.WriteError(w, http.StatusUnauthorized, "invalid token subject")
				return
			}
			ctx := context.WithValue(r.Context(), ctxUserID, uid)
			// JWT-issued sessions implicitly have full scope.
			ctx = context.WithValue(ctx, ctxScopes, []string{"read", "trade"})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireScope asserts the caller's auth carries the given scope. Always pair
// with RequireAuth (depends on ctxScopes being set).
func RequireScope(scope string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			scopes, _ := r.Context().Value(ctxScopes).([]string)
			for _, s := range scopes {
				if s == scope {
					next.ServeHTTP(w, r)
					return
				}
			}
			httputil.WriteError(w, http.StatusForbidden, "scope required: "+scope)
		})
	}
}

func UserID(ctx context.Context) (uuid.UUID, bool) {
	v, ok := ctx.Value(ctxUserID).(uuid.UUID)
	return v, ok
}

func Scopes(ctx context.Context) []string {
	v, _ := ctx.Value(ctxScopes).([]string)
	return v
}

func ipAllowed(allow []string, ip string) bool {
	for _, a := range allow {
		if a == ip {
			return true
		}
	}
	return false
}
