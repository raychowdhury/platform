CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email              CITEXT NOT NULL,
    password_hash      TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'active',
    email_verified_at  TIMESTAMPTZ,
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until       TIMESTAMPTZ,
    last_login_at      TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);

CREATE TABLE IF NOT EXISTS auth_audit (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID,
    event       TEXT NOT NULL,
    ip          TEXT,
    user_agent  TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_audit_user_idx  ON auth_audit (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_audit_event_idx ON auth_audit (event, created_at DESC);
