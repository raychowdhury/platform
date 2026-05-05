-- symbols catalog
CREATE TABLE IF NOT EXISTS symbols (
    symbol      TEXT PRIMARY KEY,
    exchange    TEXT NOT NULL,
    base        TEXT NOT NULL,
    quote       TEXT NOT NULL,
    tick_size   NUMERIC,
    step_size   NUMERIC,
    min_qty     NUMERIC,
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO symbols (symbol, exchange, base, quote, status)
VALUES ('BTCUSDT', 'binance', 'BTC', 'USDT', 'active')
ON CONFLICT (symbol) DO NOTHING;

-- raw trades (ticks)
CREATE TABLE IF NOT EXISTS ticks (
    "time"          TIMESTAMPTZ NOT NULL,
    symbol          TEXT NOT NULL,
    trade_id        BIGINT,
    price           DOUBLE PRECISION NOT NULL,
    qty             DOUBLE PRECISION NOT NULL,
    is_buyer_maker  BOOLEAN
);

SELECT create_hypertable('ticks', 'time',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS ticks_symbol_time_idx ON ticks (symbol, "time" DESC);

-- continuous aggregate: 1m OHLCV (real-time view, unmaterialized buckets fall through to ticks)
CREATE MATERIALIZED VIEW IF NOT EXISTS candles_1m
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
    time_bucket('1 minute', "time") AS bucket,
    symbol,
    first(price, "time") AS open,
    max(price)           AS high,
    min(price)           AS low,
    last(price, "time")  AS close,
    sum(qty)             AS volume,
    count(*)             AS trades
FROM ticks
GROUP BY bucket, symbol
WITH NO DATA;

-- refresh policy: keep last 7 days materialized, run every 30s
SELECT add_continuous_aggregate_policy('candles_1m',
    start_offset      => INTERVAL '7 days',
    end_offset        => INTERVAL '1 minute',
    schedule_interval => INTERVAL '30 seconds',
    if_not_exists     => TRUE);
