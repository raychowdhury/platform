-- Trailing-stop orders: stop_price tracks a watermark of the most-favorable
-- tick since placement. On each tick the engine slides the watermark and
-- recomputes stop = watermark * (1 ∓ trail_percent/100). Reuses the
-- stop_market reservation accounting; the only state change vs a fixed-stop
-- is the watermark walk.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_type_check
    CHECK (type IN ('market','limit','stop_market','trailing_stop'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS trail_percent NUMERIC(8,4);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS watermark     NUMERIC(24,8);
