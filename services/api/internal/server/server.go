package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/platform/api/internal/admin"
	"github.com/platform/api/internal/alerts"
	"github.com/platform/api/internal/apikeys"
	"github.com/platform/api/internal/audit"
	"github.com/platform/api/internal/auth"
	"github.com/platform/api/internal/billing"
	"github.com/platform/api/internal/config"
	"github.com/platform/api/internal/crypter"
	"github.com/platform/api/internal/drawings"
	"github.com/platform/api/internal/entitlements"
	"github.com/platform/api/internal/layouts"
	"github.com/platform/api/internal/mailer"
	"github.com/platform/api/internal/market"
	mw "github.com/platform/api/internal/middleware"
	"github.com/platform/api/internal/notifications"
	"github.com/platform/api/internal/oms"
)

type Deps struct {
	Cfg          *config.Config
	Log          *slog.Logger
	DB           *pgxpool.Pool
	Redis        *redis.Client
	Engine       *oms.Engine
	AlertsEngine *alerts.Engine
}

func New(d Deps) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(slogRequestLogger(d.Log))
	r.Use(chimw.Timeout(15 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Requested-With"},
		ExposedHeaders:   []string{"X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	r.Get("/readyz", func(w http.ResponseWriter, req *http.Request) {
		ctx, cancel := context.WithTimeout(req.Context(), 2*time.Second)
		defer cancel()
		if err := d.DB.Ping(ctx); err != nil {
			http.Error(w, "db not ready", http.StatusServiceUnavailable)
			return
		}
		if err := d.Redis.Ping(ctx).Err(); err != nil {
			http.Error(w, "redis not ready", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ready"}`))
	})

	auditor := audit.NewRecorder(d.DB, d.Log)
	cr, crErr := crypter.FromProvider(context.Background(), kekProvider(d.Cfg))
	if crErr != nil {
		// Surface but don't crash the boot path; auth.Repo treats nil crypter as
		// "no encryption", which matches the dev default (no KEK source).
		d.Log.Error("totp crypter init failed; falling back to plaintext", "err", crErr)
	}
	repo := auth.NewRepo(d.DB).WithCrypter(cr)
	issuer := auth.NewTokenIssuer(d.Cfg.JWTSecret, d.Cfg.JWTAccessTTL, d.Cfg.JWTRefreshTTL)
	mail := mailer.New(d.Log, d.Cfg.SMTPAddr, d.Cfg.SMTPUsername, d.Cfg.SMTPPassword, d.Cfg.MailFrom)
	svc := auth.NewService(repo, d.Redis, issuer, auditor, &authMailerAdapter{m: mail}, d.Cfg.WebBaseURL,
		d.Cfg.LoginLockMax, d.Cfg.LoginLockFor)
	h := auth.NewHandlers(svc, repo)

	authIPLimit := mw.FixedWindow(d.Redis, "auth", d.Cfg.LoginRateLimit, d.Cfg.LoginRateWindow, mw.KeyByClientIP)

	apiKeysRepo := apikeys.NewRepo(d.DB)
	apiKeysResolver := &apiKeyResolverAdapter{repo: apiKeysRepo}
	requireAuth := mw.RequireAuth(issuer, apiKeysResolver, svc)
	uidFromCtx := func(r *http.Request) uuid.UUID {
		uid, _ := mw.UserID(r.Context())
		return uid
	}

	r.Route("/v1/auth", func(r chi.Router) {
		r.Group(func(r chi.Router) {
			r.Use(authIPLimit)
			r.Post("/signup", h.Signup)
			r.Post("/login", h.Login)
			r.Post("/login/mfa", h.LoginMFA)
			r.Post("/refresh", h.Refresh)
			r.Post("/verify-email", h.VerifyEmail)
			r.Post("/password/reset", h.RequestPasswordReset)
			r.Post("/password/reset/confirm", h.ConfirmPasswordReset)
		})
		r.Group(func(r chi.Router) {
			r.Use(requireAuth)
			r.Post("/logout", h.Logout(uidFromCtx))
			r.Post("/password/change", h.ChangePassword(uidFromCtx))
		})
	})

	r.Route("/v1/me", func(r chi.Router) {
		r.Use(requireAuth)
		r.Get("/", h.Me(uidFromCtx))
		r.Put("/preferences", h.UpdatePreferences(uidFromCtx))
		r.Get("/mfa", h.MFAStatus(uidFromCtx))
		r.Post("/mfa/totp/setup", h.MFASetup(uidFromCtx))
		r.Post("/mfa/totp/enable", h.MFAEnable(uidFromCtx))
		r.Post("/mfa/totp/disable", h.MFADisable(uidFromCtx))

		// API keys live under /v1/me/api-keys; only JWT-authed sessions can
		// mint/revoke keys (a key minting another key would be an escalation
		// vector). We don't enforce that strictly here for MVP, but the FE
		// only exposes this surface from a logged-in browser session.
		apiKeysH := apikeys.NewHandlers(apiKeysRepo)
		r.Get("/api-keys", apiKeysH.List(uidFromCtx))
		r.Post("/api-keys", apiKeysH.Create(uidFromCtx))
		r.Delete("/api-keys/{id}", apiKeysH.Revoke(uidFromCtx))
	})

	billingRepo := billing.NewRepo(d.DB)
	ent := entitlements.New(billingRepo)

	mktRepo := market.NewRepo(d.DB)
	mktH := market.NewHandlers(mktRepo, ent)
	wsGW := market.NewWSGateway(d.Redis, d.Log, issuer)

	r.Route("/v1/market", func(r chi.Router) {
		r.Get("/symbols", mktH.ListSymbols)
		r.Get("/candles", mktH.Candles)
		r.Get("/ticks", mktH.RecentTicks)
	})

	r.Get("/v1/stream", wsGW.Handle)

	omsRepo := oms.NewRepo(d.DB)
	omsSvc := oms.NewService(omsRepo, d.Engine)
	omsH := oms.NewHandlers(omsSvc)

	r.Route("/v1", func(r chi.Router) {
		r.Use(requireAuth)
		// trade scope guards mutating order endpoints; reads only need the implicit read scope
		r.With(mw.RequireScope("trade")).Post("/orders", omsH.Place(uidFromCtx))
		r.With(mw.RequireScope("trade")).Delete("/orders/{id}", omsH.Cancel(uidFromCtx))
		r.Get("/orders", omsH.ListOrders(uidFromCtx))
		r.Get("/orders/{id}", omsH.GetOrder(uidFromCtx))
		r.Get("/fills", omsH.ListFills(uidFromCtx))
		r.Get("/positions", omsH.ListPositions(uidFromCtx))
		r.Get("/account", omsH.GetAccount(uidFromCtx))
	})

	// Billing
	billingSvc := billing.NewService(billingRepo, d.Cfg.StripeSecretKey, d.Cfg.StripeWebhookSecret,
		d.Cfg.BillingSuccessURL, d.Cfg.BillingCancelURL)
	billingH := billing.NewHandlers(billingSvc, &billingUserAdapter{repo: repo})

	r.Get("/v1/plans", billingH.ListPlans)

	// Alerts
	alertsRepo := alerts.NewRepo(d.DB)
	alertsSvc := alerts.NewService(alertsRepo, ent, d.AlertsEngine)
	alertsH := alerts.NewHandlers(alertsSvc)

	r.Route("/v1/alerts", func(r chi.Router) {
		r.Use(requireAuth)
		r.Post("/", alertsH.Create(uidFromCtx))
		r.Get("/", alertsH.List(uidFromCtx))
		r.Delete("/{id}", alertsH.Delete(uidFromCtx))
	})

	// Notifications
	notifRepo := notifications.NewRepo(d.DB)
	notifH := notifications.NewHandlers(notifRepo)

	r.Route("/v1/notifications", func(r chi.Router) {
		r.Use(requireAuth)
		r.Get("/", notifH.List(uidFromCtx))
		r.Get("/unread_count", notifH.UnreadCount(uidFromCtx))
		r.Post("/{id}/read", notifH.MarkRead(uidFromCtx))
		r.Post("/read_all", notifH.MarkAllRead(uidFromCtx))
	})

	// Layouts
	layoutsRepo := layouts.NewRepo(d.DB)
	layoutsSvc := layouts.NewService(layoutsRepo, ent)
	layoutsH := layouts.NewHandlers(layoutsSvc)

	r.Route("/v1/layouts", func(r chi.Router) {
		r.Use(requireAuth)
		r.Get("/", layoutsH.List(uidFromCtx))
		r.Post("/", layoutsH.Create(uidFromCtx))
		r.Get("/{id}", layoutsH.Get(uidFromCtx))
		r.Put("/{id}", layoutsH.Update(uidFromCtx))
		r.Delete("/{id}", layoutsH.Delete(uidFromCtx))
	})

	// Drawings
	drawingsRepo := drawings.NewRepo(d.DB)
	drawingsH := drawings.NewHandlers(drawingsRepo)

	r.Route("/v1/drawings", func(r chi.Router) {
		r.Use(requireAuth)
		r.Get("/", drawingsH.List(uidFromCtx))
		r.Post("/", drawingsH.Create(uidFromCtx))
		r.Delete("/{id}", drawingsH.Delete(uidFromCtx))
	})

	// Admin (RBAC: role='admin')
	adminRepo := admin.NewRepo(d.DB)
	adminH := admin.NewHandlers(adminRepo, svc)
	requireAdmin := mw.RequireRole(d.DB, "admin")

	r.Route("/v1/admin", func(r chi.Router) {
		r.Use(requireAuth)
		r.Use(requireAdmin)
		r.Get("/users", adminH.ListUsers)
		r.Get("/users/{id}", adminH.GetUser)
		r.Post("/users/{id}/freeze", adminH.Freeze(uidFromCtx))
		r.Post("/users/{id}/unfreeze", adminH.Unfreeze(uidFromCtx))
		r.Post("/users/{id}/balance", adminH.AdjustBalance(uidFromCtx))
		r.Get("/audit", adminH.ListAudit)
	})

	r.Route("/v1/billing", func(r chi.Router) {
		// Webhook is public (Stripe calls it). Signature verification + idempotency
		// happen inside the handler.
		r.Post("/webhook", billingH.Webhook)

		// Authenticated billing actions.
		r.Group(func(r chi.Router) {
			r.Use(requireAuth)
			r.Get("/subscription", billingH.MySubscription(uidFromCtx))
			if billingSvc.StripeEnabled() {
				r.Post("/checkout", billingH.Checkout(uidFromCtx))
				r.Post("/portal", billingH.Portal(uidFromCtx))
			} else {
				r.Post("/upgrade", billingH.DevUpgrade(uidFromCtx))
			}
		})
	})

	return r
}

// kekProvider chooses a KEKProvider implementation from config: HTTP fetch
// when KEK_URL is set (sidecar / Vault / KMS proxy pattern), env-static when
// TOTP_KEK is set, otherwise nil (encryption disabled, dev path).
func kekProvider(cfg *config.Config) crypter.KEKProvider {
	if cfg.KEKURL != "" {
		h := http.Header{}
		if cfg.KEKHeaderName != "" {
			h.Set(cfg.KEKHeaderName, cfg.KEKHeaderValue)
		}
		return &crypter.HTTPProvider{URL: cfg.KEKURL, Header: h}
	}
	if len(cfg.TOTPKEK) > 0 {
		return &crypter.StaticProvider{K: cfg.TOTPKEK}
	}
	return nil
}

// authMailerAdapter bridges mailer.Mailer to auth.Mailer; the auth package
// owns its own minimal Mailer/MailMessage types so it doesn't pull in
// net/smtp transitively.
type authMailerAdapter struct{ m mailer.Mailer }

func (a *authMailerAdapter) Send(ctx context.Context, msg auth.MailMessage) error {
	return a.m.Send(ctx, mailer.Message{To: msg.To, Subject: msg.Subject, Body: msg.Body})
}

// billingUserAdapter exposes a tiny user-email lookup to the billing package
// without forcing a billing→auth import.
type billingUserAdapter struct{ repo *auth.Repo }

func (b *billingUserAdapter) Email(ctx context.Context, id uuid.UUID) (string, error) {
	u, err := b.repo.GetUserByID(ctx, id)
	if err != nil {
		return "", err
	}
	return u.Email, nil
}

// apiKeyResolverAdapter bridges apikeys.Repo to mw.APIKeyResolver. The two
// AuthLookup-shaped types live in different packages on purpose to keep the
// middleware free of an apikeys import.
type apiKeyResolverAdapter struct{ repo *apikeys.Repo }

func (a *apiKeyResolverAdapter) LookupByPlaintext(ctx context.Context, plaintext string) (*mw.APIKeyAuth, []string, error) {
	l, ips, err := a.repo.LookupByPlaintext(ctx, plaintext)
	if err != nil || l == nil {
		return nil, ips, err
	}
	return &mw.APIKeyAuth{
		UserID:        l.UserID,
		Scopes:        l.Scopes,
		SigningSecret: l.SigningSecret,
	}, ips, nil
}

func slogRequestLogger(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)
			start := time.Now()
			next.ServeHTTP(ww, r)
			log.Info("http",
				"method", r.Method,
				"path", r.URL.Path,
				"status", ww.Status(),
				"bytes", ww.BytesWritten(),
				"dur_ms", time.Since(start).Milliseconds(),
				"req_id", chimw.GetReqID(r.Context()),
			)
		})
	}
}
