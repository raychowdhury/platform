-- OCO (one-cancels-other) groups. Two orders share an oco_group_id; when
-- either leg fills or cancels, the other is auto-cancelled by the engine.
-- oco_locks_qty distinguishes which leg holds the position.locked_qty
-- reservation in a sell bracket: the limit (take-profit) leg locks qty,
-- the stop (stop-loss) leg does not — the limit's lock covers the group.
-- On stop-leg fill, the position drops by fillQty without touching locked_qty;
-- the subsequent cancel of the limit sibling releases the lock.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS oco_group_id  UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS oco_locks_qty BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS orders_oco_group_idx
    ON orders(oco_group_id) WHERE oco_group_id IS NOT NULL;
