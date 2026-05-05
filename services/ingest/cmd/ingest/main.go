package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/platform/ingest/internal/config"
	"github.com/platform/ingest/internal/exchange"
	"github.com/platform/ingest/internal/exchange/binance"
	"github.com/platform/ingest/internal/exchange/coinbase"
	"github.com/platform/ingest/internal/store"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(log)

	cfg := config.Load()

	streamer, err := selectStreamer(cfg)
	if err != nil {
		log.Error("select streamer", "err", err)
		os.Exit(1)
	}
	log.Info("ingest starting", "exchange", streamer.Name(), "symbols", cfg.Symbols)

	rootCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	bootCtx, cancel := context.WithTimeout(rootCtx, 30*time.Second)
	defer cancel()

	pg, err := pgxpool.New(bootCtx, cfg.PostgresDSN)
	if err != nil {
		log.Error("pg connect", "err", err)
		os.Exit(1)
	}
	defer pg.Close()
	if err := waitForTable(rootCtx, pg, "ticks", 60*time.Second); err != nil {
		log.Error("wait for ticks table", "err", err)
		os.Exit(1)
	}

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr, Password: cfg.RedisPassword})
	if err := rdb.Ping(bootCtx).Err(); err != nil {
		log.Error("redis ping", "err", err)
		os.Exit(1)
	}
	defer func() { _ = rdb.Close() }()

	st := store.New(pg, rdb, log)

	ticks := make(chan exchange.Tick, 1024)

	go func() {
		err := streamer.Stream(rootCtx, cfg.Symbols, log, ticks)
		if err != nil && !errors.Is(err, context.Canceled) {
			log.Error("stream ended", "err", err)
		}
		close(ticks)
	}()

	if err := st.Run(rootCtx, ticks, cfg.BatchSize, cfg.BatchInterval); err != nil && !errors.Is(err, context.Canceled) {
		log.Error("store run", "err", err)
		os.Exit(1)
	}
	log.Info("shutdown")
}

func selectStreamer(cfg *config.Config) (exchange.Streamer, error) {
	switch cfg.Exchange {
	case "binance":
		return &binance.Streamer{BaseURL: cfg.BinanceWSURL}, nil
	case "coinbase":
		return &coinbase.Streamer{URL: cfg.CoinbaseWSURL}, nil
	default:
		return nil, fmt.Errorf("%w: %q", exchange.ErrUnknown, cfg.Exchange)
	}
}

func waitForTable(ctx context.Context, pg *pgxpool.Pool, table string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	var exists bool
	for {
		err := pg.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`, table).Scan(&exists)
		if err == nil && exists {
			return nil
		}
		if time.Now().After(deadline) {
			if err == nil {
				return errors.New("table " + table + " not found")
			}
			return err
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
}
