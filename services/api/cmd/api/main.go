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

	"github.com/platform/api/internal/config"
	"github.com/platform/api/internal/oms"
	"github.com/platform/api/internal/server"
	"github.com/platform/api/internal/storage"
)

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

	handler := server.New(server.Deps{Cfg: cfg, Log: log, DB: pg.Pool, Redis: rdb, Engine: engine})

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
