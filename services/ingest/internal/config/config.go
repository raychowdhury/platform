package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	PostgresDSN      string
	RedisAddr        string
	RedisPassword    string
	Exchange         string // "coinbase" | "binance" | "databento"
	BinanceWSURL     string
	CoinbaseWSURL    string
	DatabentoAPIKey  string
	DatabentoDataset string
	Symbols          []string
	BatchSize        int
	BatchInterval    time.Duration
}

func Load() *Config {
	return &Config{
		PostgresDSN:      envStr("POSTGRES_DSN", "postgres://platform:platform_dev@localhost:5432/platform?sslmode=disable"),
		RedisAddr:        envStr("REDIS_ADDR", "localhost:6379"),
		RedisPassword:    envStr("REDIS_PASSWORD", ""),
		Exchange:         strings.ToLower(envStr("EXCHANGE", "databento")),
		BinanceWSURL:     envStr("BINANCE_WS_URL", "wss://stream.binance.us:9443"),
		CoinbaseWSURL:    envStr("COINBASE_WS_URL", "wss://ws-feed.exchange.coinbase.com"),
		DatabentoAPIKey:  envStr("DATABENTO_API_KEY", ""),
		DatabentoDataset: envStr("DATABENTO_DATASET", "GLBX.MDP3"),
		Symbols:          splitNative(envStr("INGEST_SYMBOLS", "ESM6")),
		BatchSize:        envInt("INGEST_BATCH_SIZE", 200),
		BatchInterval:    envDuration("INGEST_BATCH_INTERVAL", 500*time.Millisecond),
	}
}

// splitNative trims whitespace but preserves case (Coinbase product IDs are uppercase
// like BTC-USD; Binance is also uppercase). The exchange adapter handles its own casing.
func splitNative(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func envStr(k, def string) string {
	if v, ok := os.LookupEnv(k); ok {
		return v
	}
	return def
}
func envInt(k string, def int) int {
	if v, ok := os.LookupEnv(k); ok {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}
func envDuration(k string, def time.Duration) time.Duration {
	if v, ok := os.LookupEnv(k); ok {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return def
}

