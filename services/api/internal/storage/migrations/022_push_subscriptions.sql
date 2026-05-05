-- Web Push subscriptions per user. Endpoint is unique across the system —
-- the same browser session reuses one endpoint regardless of who is logged
-- in, and we want the latest user binding (handled in upsert below).
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS push_subs_endpoint_idx ON push_subscriptions(endpoint);
CREATE INDEX        IF NOT EXISTS push_subs_user_idx     ON push_subscriptions(user_id);
