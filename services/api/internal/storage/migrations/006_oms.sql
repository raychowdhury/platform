-- Paper-trading OMS schema.
-- NOTE: amounts are NUMERIC(24,8); the Go service currently scans them as float64
-- via ::float8 casts. That is sufficient for paper trading; real-money trading
-- must move to a decimal type before going live.

CREATE TABLE IF NOT EXISTS accounts (
    user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance        NUMERIC(24,8) NOT NULL DEFAULT 100000,
    quote_currency TEXT NOT NULL DEFAULT 'USD',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill any existing users.
INSERT INTO accounts (user_id) SELECT id FROM users ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION create_account_for_user() RETURNS trigger AS $$
BEGIN
    INSERT INTO accounts (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_after_insert ON users;
CREATE TRIGGER users_after_insert AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_account_for_user();

CREATE TABLE IF NOT EXISTS orders (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_order_id  TEXT,
    symbol           TEXT NOT NULL,
    side             TEXT NOT NULL CHECK (side IN ('buy','sell')),
    type             TEXT NOT NULL CHECK (type IN ('market','limit')),
    limit_price      NUMERIC(24,8),
    qty              NUMERIC(24,8) NOT NULL CHECK (qty > 0),
    filled_qty       NUMERIC(24,8) NOT NULL DEFAULT 0,
    avg_fill_price   NUMERIC(24,8),
    status           TEXT NOT NULL CHECK (status IN ('open','filled','cancelled','rejected')),
    reject_reason    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_open_idx ON orders(symbol) WHERE status = 'open';
CREATE UNIQUE INDEX IF NOT EXISTS orders_client_idx
    ON orders(user_id, client_order_id) WHERE client_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS fills (
    id          BIGSERIAL PRIMARY KEY,
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol      TEXT NOT NULL,
    side        TEXT NOT NULL,
    price       NUMERIC(24,8) NOT NULL,
    qty         NUMERIC(24,8) NOT NULL,
    fee         NUMERIC(24,8) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fills_user_idx  ON fills(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fills_order_idx ON fills(order_id);

CREATE TABLE IF NOT EXISTS positions (
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol        TEXT NOT NULL,
    qty           NUMERIC(24,8) NOT NULL DEFAULT 0,
    avg_cost      NUMERIC(24,8) NOT NULL DEFAULT 0,
    realized_pnl  NUMERIC(24,8) NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, symbol)
);
