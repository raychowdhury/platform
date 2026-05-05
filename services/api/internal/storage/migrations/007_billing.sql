-- Plans catalog. Limits are advisory entitlements consumed by API at request time.
CREATE TABLE IF NOT EXISTS plans (
    code              TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    price_cents       INTEGER NOT NULL,
    currency          TEXT NOT NULL DEFAULT 'USD',
    interval          TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month','year')),
    stripe_price_id   TEXT,
    max_alerts        INTEGER NOT NULL DEFAULT 0,
    max_layouts       INTEGER NOT NULL DEFAULT 0,
    max_indicators    INTEGER NOT NULL DEFAULT 0,
    history_days      INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plans (code, name, price_cents, max_alerts, max_layouts, max_indicators, history_days) VALUES
    ('free',  'Free',         0,   5,  1, 3, 7),
    ('pro',   'Pro',        2900, 100,  5, 10, 365),
    ('elite', 'Elite',      9900, 1000, 50, 50, 3650)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS subscriptions (
    user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan_code            TEXT NOT NULL REFERENCES plans(code),
    status               TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','trialing','past_due','cancelled','expired')),
    stripe_customer_id   TEXT,
    stripe_subscription_id TEXT,
    current_period_end   TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_idx ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Default-free for everyone, including pre-existing users.
INSERT INTO subscriptions (user_id, plan_code) SELECT id, 'free' FROM users
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION create_subscription_for_user() RETURNS trigger AS $$
BEGIN
    INSERT INTO subscriptions (user_id, plan_code) VALUES (NEW.id, 'free')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_after_insert_subscription ON users;
CREATE TRIGGER users_after_insert_subscription AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_subscription_for_user();

-- Idempotency log for Stripe webhooks (and any future async billing events).
CREATE TABLE IF NOT EXISTS billing_events (
    event_id    TEXT PRIMARY KEY,
    event_type  TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload     JSONB
);
