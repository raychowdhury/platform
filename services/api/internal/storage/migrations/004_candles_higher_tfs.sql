-- Higher-TF candle continuous aggregates, all rolled up from candles_1m.
-- Each is a real-time aggregate (materialized_only=false) so the current
-- in-progress bucket reflects live ticks until the next refresh.

-- 5m
CREATE MATERIALIZED VIEW IF NOT EXISTS candles_5m
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
    time_bucket('5 minutes', bucket) AS bucket,
    symbol,
    first(open,  bucket) AS open,
    max(high)            AS high,
    min(low)             AS low,
    last(close,  bucket) AS close,
    sum(volume)          AS volume,
    sum(trades)::bigint  AS trades
FROM candles_1m
GROUP BY 1, symbol
WITH NO DATA;
SELECT add_continuous_aggregate_policy('candles_5m',
    start_offset => INTERVAL '7 days', end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '30 seconds', if_not_exists => TRUE);

-- 15m
CREATE MATERIALIZED VIEW IF NOT EXISTS candles_15m
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
    time_bucket('15 minutes', bucket) AS bucket,
    symbol,
    first(open,  bucket) AS open,
    max(high)            AS high,
    min(low)             AS low,
    last(close,  bucket) AS close,
    sum(volume)          AS volume,
    sum(trades)::bigint  AS trades
FROM candles_1m
GROUP BY 1, symbol
WITH NO DATA;
SELECT add_continuous_aggregate_policy('candles_15m',
    start_offset => INTERVAL '14 days', end_offset => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '1 minute', if_not_exists => TRUE);

-- 30m
CREATE MATERIALIZED VIEW IF NOT EXISTS candles_30m
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
    time_bucket('30 minutes', bucket) AS bucket,
    symbol,
    first(open,  bucket) AS open,
    max(high)            AS high,
    min(low)             AS low,
    last(close,  bucket) AS close,
    sum(volume)          AS volume,
    sum(trades)::bigint  AS trades
FROM candles_1m
GROUP BY 1, symbol
WITH NO DATA;
SELECT add_continuous_aggregate_policy('candles_30m',
    start_offset => INTERVAL '30 days', end_offset => INTERVAL '30 minutes',
    schedule_interval => INTERVAL '2 minutes', if_not_exists => TRUE);

-- 1h
CREATE MATERIALIZED VIEW IF NOT EXISTS candles_1h
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
    time_bucket('1 hour', bucket) AS bucket,
    symbol,
    first(open,  bucket) AS open,
    max(high)            AS high,
    min(low)             AS low,
    last(close,  bucket) AS close,
    sum(volume)          AS volume,
    sum(trades)::bigint  AS trades
FROM candles_1m
GROUP BY 1, symbol
WITH NO DATA;
SELECT add_continuous_aggregate_policy('candles_1h',
    start_offset => INTERVAL '60 days', end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '5 minutes', if_not_exists => TRUE);

-- 4h
CREATE MATERIALIZED VIEW IF NOT EXISTS candles_4h
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
    time_bucket('4 hours', bucket) AS bucket,
    symbol,
    first(open,  bucket) AS open,
    max(high)            AS high,
    min(low)             AS low,
    last(close,  bucket) AS close,
    sum(volume)          AS volume,
    sum(trades)::bigint  AS trades
FROM candles_1m
GROUP BY 1, symbol
WITH NO DATA;
SELECT add_continuous_aggregate_policy('candles_4h',
    start_offset => INTERVAL '180 days', end_offset => INTERVAL '4 hours',
    schedule_interval => INTERVAL '15 minutes', if_not_exists => TRUE);

-- 8h
CREATE MATERIALIZED VIEW IF NOT EXISTS candles_8h
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
    time_bucket('8 hours', bucket) AS bucket,
    symbol,
    first(open,  bucket) AS open,
    max(high)            AS high,
    min(low)             AS low,
    last(close,  bucket) AS close,
    sum(volume)          AS volume,
    sum(trades)::bigint  AS trades
FROM candles_1m
GROUP BY 1, symbol
WITH NO DATA;
SELECT add_continuous_aggregate_policy('candles_8h',
    start_offset => INTERVAL '365 days', end_offset => INTERVAL '8 hours',
    schedule_interval => INTERVAL '30 minutes', if_not_exists => TRUE);

-- 1d
CREATE MATERIALIZED VIEW IF NOT EXISTS candles_1d
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
    time_bucket('1 day', bucket) AS bucket,
    symbol,
    first(open,  bucket) AS open,
    max(high)            AS high,
    min(low)             AS low,
    last(close,  bucket) AS close,
    sum(volume)          AS volume,
    sum(trades)::bigint  AS trades
FROM candles_1m
GROUP BY 1, symbol
WITH NO DATA;
SELECT add_continuous_aggregate_policy('candles_1d',
    start_offset => INTERVAL '730 days', end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 hour', if_not_exists => TRUE);

-- 1w
CREATE MATERIALIZED VIEW IF NOT EXISTS candles_1w
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
    time_bucket('1 week', bucket) AS bucket,
    symbol,
    first(open,  bucket) AS open,
    max(high)            AS high,
    min(low)             AS low,
    last(close,  bucket) AS close,
    sum(volume)          AS volume,
    sum(trades)::bigint  AS trades
FROM candles_1m
GROUP BY 1, symbol
WITH NO DATA;
SELECT add_continuous_aggregate_policy('candles_1w',
    start_offset => INTERVAL '730 days', end_offset => INTERVAL '7 days',
    schedule_interval => INTERVAL '6 hours', if_not_exists => TRUE);
