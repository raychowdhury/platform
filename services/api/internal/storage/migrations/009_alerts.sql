CREATE TABLE IF NOT EXISTS alerts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol        TEXT NOT NULL,
    condition     TEXT NOT NULL CHECK (condition IN ('price_above','price_below')),
    threshold     NUMERIC(24,8) NOT NULL CHECK (threshold > 0),
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','triggered','disabled')),
    note          TEXT,
    triggered_at  TIMESTAMPTZ,
    triggered_price NUMERIC(24,8),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alerts_user_idx   ON alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_active_idx ON alerts(symbol) WHERE status = 'active';
