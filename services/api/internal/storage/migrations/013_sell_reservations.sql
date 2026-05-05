-- Sell-side qty reservation: open sell orders lock qty out of the position so a
-- user can't oversell across multiple concurrent orders. Mirrors the buy-side
-- accounts.locked / orders.reserved_cost shape.
ALTER TABLE positions ADD COLUMN IF NOT EXISTS locked_qty NUMERIC(24,8) NOT NULL DEFAULT 0;
