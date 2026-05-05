-- Buy-side balance reservations: cost is moved from `balance` to `locked` at place
-- time and reversed (or settled) at fill/cancel/reject. Positions stay full-fill only;
-- sell-side reservation uses live qty check at fill (no per-order reserved qty for now).
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS locked NUMERIC(24,8) NOT NULL DEFAULT 0;

-- Stop-market support.
-- 'pending' = waiting for stop trigger; once trigger crosses, engine flips to 'open'
-- and the existing market path takes over.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stop_price    NUMERIC(24,8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reserved_cost NUMERIC(24,8) NOT NULL DEFAULT 0;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE orders ADD  CONSTRAINT orders_type_check
    CHECK (type IN ('market','limit','stop_market'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD  CONSTRAINT orders_status_check
    CHECK (status IN ('open','pending','filled','cancelled','rejected'));

CREATE INDEX IF NOT EXISTS orders_pending_idx ON orders(symbol) WHERE status = 'pending';
