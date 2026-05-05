package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/platform/api/internal/alerts"
	"github.com/platform/api/internal/auth"
	"github.com/platform/api/internal/config"
	"github.com/platform/api/internal/mailer"
	"github.com/platform/api/internal/notifications"
	"github.com/platform/api/internal/oms"
	"github.com/platform/api/internal/push"
	"github.com/platform/api/internal/server"
	"github.com/platform/api/internal/storage"
)

// alertMailerAdapter bridges mailer.Mailer to alerts.Mailer (alerts owns its
// minimal Mailer/MailMessage so the package stays free of net/smtp).
type alertMailerAdapter struct{ m mailer.Mailer }

func (a *alertMailerAdapter) Send(ctx context.Context, msg alerts.MailMessage) error {
	return a.m.Send(ctx, mailer.Message{To: msg.To, Subject: msg.Subject, Body: msg.Body})
}

// alertEmailAdapter exposes auth.Repo's AlertEmailFor through the alerts
// EmailLookup interface.
type alertEmailAdapter struct{ r *auth.Repo }

func (a *alertEmailAdapter) AlertEmailFor(ctx context.Context, uid uuid.UUID) (string, bool, error) {
	return a.r.AlertEmailFor(ctx, uid)
}

func init() {
	// Emit decimals as JSON numbers, not strings. Wire compatibility with the
	// existing FE (which expects `balance: number` and uses .toFixed). Server
	// math still happens in decimal — this only changes how the marshalled
	// value looks on the wire. JS Number can lose precision past 2^53; that's
	// acceptable for paper-trading display values (amounts comfortably fit).
	decimal.MarshalJSONWithoutQuotes = true
}

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(log)

	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}

	rootCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	bootCtx, cancelBoot := context.WithTimeout(rootCtx, 30*time.Second)
	defer cancelBoot()

	pg, err := storage.NewPostgres(bootCtx, cfg.PostgresDSN)
	if err != nil {
		log.Error("postgres", "err", err)
		os.Exit(1)
	}
	defer pg.Close()

	if err := pg.Migrate(bootCtx); err != nil {
		log.Error("migrate", "err", err)
		os.Exit(1)
	}

	rdb, err := storage.NewRedis(bootCtx, cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		log.Error("redis", "err", err)
		os.Exit(1)
	}
	defer func() { _ = rdb.Close() }()

	engine := oms.NewEngine(pg.Pool, rdb, log)
	go func() {
		if err := engine.Run(rootCtx); err != nil && !errors.Is(err, context.Canceled) {
			log.Error("oms engine", "err", err)
		}
	}()

	alertsRepo := alerts.NewRepo(pg.Pool)
	notifRepo := notifications.NewRepo(pg.Pool)
	authRepo := auth.NewRepo(pg.Pool)
	mail := mailer.New(log, cfg.SMTPAddr, cfg.SMTPUsername, cfg.SMTPPassword, cfg.MailFrom)
	pushRepo := push.NewRepo(pg.Pool)
	pushSender := push.NewSender(pushRepo, cfg.VAPIDPublicKey, cfg.VAPIDPrivateKey, cfg.VAPIDSubject, log)
	alertsEngine := alerts.NewEngine(pg.Pool, rdb, alertsRepo, notifRepo, log).
		WithEmail(&alertMailerAdapter{m: mail}, &alertEmailAdapter{r: authRepo}).
		WithPush(pushSender)
	go func() {
		if err := alertsEngine.Run(rootCtx); err != nil && !errors.Is(err, context.Canceled) {
			log.Error("alerts engine", "err", err)
		}
	}()

	handler := server.New(server.Deps{
		Cfg: cfg, Log: log, DB: pg.Pool, Redis: rdb,
		Engine: engine, AlertsEngine: alertsEngine,
	})

	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Info("api listening", "addr", cfg.HTTPAddr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("listen", "err", err)
			stop()
		}
	}()

	<-rootCtx.Done()
	log.Info("shutting down")
	shutCtx, cancelShut := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShut()
	if err := srv.Shutdown(shutCtx); err != nil {
		log.Error("shutdown", "err", err)
	}
}
