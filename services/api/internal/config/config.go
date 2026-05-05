package config

import (
	"encoding/base64"
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	HTTPAddr        string
	PostgresDSN     string
	RedisAddr       string
	RedisPassword   string
	RedisDB         int
	JWTSecret       []byte
	JWTAccessTTL    time.Duration
	JWTRefreshTTL   time.Duration
	BcryptDisabled  bool
	LoginRateLimit  int           // attempts per window per IP
	LoginRateWindow time.Duration // window length
	LoginLockMax    int           // failed attempts before lockout
	LoginLockFor    time.Duration // lockout duration
	StripeSecretKey   string        // empty = Stripe disabled, dev upgrade enabled
	StripeWebhookSecret string      // whsec_... — used to verify Stripe-Signature
	BillingSuccessURL string
	BillingCancelURL  string
	SMTPAddr        string // empty = console mailer (logs to stdout)
	SMTPUsername    string
	SMTPPassword    string
	MailFrom        string
	WebBaseURL      string // used to build action links inside emails
	TOTPKEK         []byte // 32-byte AES-256-GCM key for TOTP seed envelope; empty = plaintext (dev)
	KEKURL          string // when set, fetch the 32-byte KEK over HTTP (sidecar / Vault / KMS proxy) instead of TOTP_KEK env
	KEKHeaderName   string // optional header name for KEK fetch auth
	KEKHeaderValue  string // optional header value
}

func Load() (*Config, error) {
	c := &Config{
		HTTPAddr:        envStr("API_ADDR", ":8080"),
		PostgresDSN:     envStr("POSTGRES_DSN", "postgres://platform:platform_dev@localhost:5432/platform?sslmode=disable"),
		RedisAddr:       envStr("REDIS_ADDR", "localhost:6379"),
		RedisPassword:   envStr("REDIS_PASSWORD", ""),
		RedisDB:         envInt("REDIS_DB", 0),
		JWTSecret:       []byte(envStr("JWT_SECRET", "")),
		JWTAccessTTL:    envDuration("JWT_ACCESS_TTL", 15*time.Minute),
		JWTRefreshTTL:   envDuration("JWT_REFRESH_TTL", 30*24*time.Hour),
		LoginRateLimit:  envInt("LOGIN_RATE_LIMIT", 10),
		LoginRateWindow: envDuration("LOGIN_RATE_WINDOW", time.Minute),
		LoginLockMax:      envInt("LOGIN_LOCK_MAX", 5),
		LoginLockFor:      envDuration("LOGIN_LOCK_FOR", 15*time.Minute),
		StripeSecretKey:     envStr("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret: envStr("STRIPE_WEBHOOK_SECRET", ""),
		BillingSuccessURL: envStr("BILLING_SUCCESS_URL", "http://localhost:5174/?billing=success"),
		BillingCancelURL:  envStr("BILLING_CANCEL_URL",  "http://localhost:5174/?billing=cancelled"),
		SMTPAddr:          envStr("SMTP_ADDR", ""),
		SMTPUsername:      envStr("SMTP_USERNAME", ""),
		SMTPPassword:      envStr("SMTP_PASSWORD", ""),
		MailFrom:          envStr("MAIL_FROM", "no-reply@platform.local"),
		WebBaseURL:        envStr("WEB_BASE_URL", "http://localhost:5174"),
		TOTPKEK:           decodeKEK(envStr("TOTP_KEK", "")),
		KEKURL:            envStr("KEK_URL", ""),
		KEKHeaderName:     envStr("KEK_HEADER_NAME", ""),
		KEKHeaderValue:    envStr("KEK_HEADER_VALUE", ""),
	}
	if len(c.JWTSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must be set and >=32 bytes")
	}
	return c, nil
}

func envStr(key, def string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if v, ok := os.LookupEnv(key); ok {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

// decodeKEK accepts a base64 (std or URL-safe) 32-byte AES key. Empty input
// disables encryption (returns nil), which keeps the dev path working without
// any extra config.
func decodeKEK(s string) []byte {
	if s == "" {
		return nil
	}
	for _, dec := range []func(string) ([]byte, error){
		base64.StdEncoding.DecodeString,
		base64.RawStdEncoding.DecodeString,
		base64.URLEncoding.DecodeString,
		base64.RawURLEncoding.DecodeString,
	} {
		if b, err := dec(s); err == nil && len(b) == 32 {
			return b
		}
	}
	return nil
}

func envDuration(key string, def time.Duration) time.Duration {
	if v, ok := os.LookupEnv(key); ok {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return def
}
