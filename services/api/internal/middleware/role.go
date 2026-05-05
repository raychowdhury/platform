package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/platform/api/internal/httputil"
)

type roleCtxKey struct{}

// RequireRole resolves the authed user's role from the DB and rejects with 403
// if it doesn't match. Must be chained after RequireAuth.
func RequireRole(db *pgxpool.Pool, role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			uid, ok := UserID(r.Context())
			if !ok || uid == uuid.Nil {
				httputil.WriteError(w, http.StatusUnauthorized, "auth required")
				return
			}
			var got string
			err := db.QueryRow(r.Context(), `SELECT role FROM users WHERE id = $1`, uid).Scan(&got)
			if err != nil {
				httputil.WriteError(w, http.StatusUnauthorized, "user lookup failed")
				return
			}
			if got != role {
				httputil.WriteError(w, http.StatusForbidden, "role required: "+role)
				return
			}
			ctx := context.WithValue(r.Context(), roleCtxKey{}, got)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
