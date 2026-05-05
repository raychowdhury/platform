package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/platform/api/internal/httputil"
)

// FixedWindow per-key rate limiter using Redis INCR + EXPIRE.
// Keying example: "rl:login:" + ip
func FixedWindow(rdb *redis.Client, prefix string, limit int, window time.Duration, keyFn func(*http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			key := "rl:" + prefix + ":" + keyFn(r)
			n, err := rdb.Incr(ctx, key).Result()
			if err == nil && n == 1 {
				_ = rdb.Expire(ctx, key, window).Err()
			}
			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
			remaining := limit - int(n)
			if remaining < 0 {
				remaining = 0
			}
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			if int(n) > limit {
				if ttl, _ := rdb.TTL(ctx, key).Result(); ttl > 0 {
					w.Header().Set("Retry-After", strconv.Itoa(int(ttl.Seconds())))
				}
				httputil.WriteError(w, http.StatusTooManyRequests, "rate limit exceeded")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func KeyByClientIP(r *http.Request) string {
	return httputil.ClientIP(r)
}
