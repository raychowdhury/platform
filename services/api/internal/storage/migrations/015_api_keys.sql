-- Programmatic access tokens. Each row stores sha256(full_key) — the plaintext
-- key is shown to the user once at creation time and never persisted in clear.
CREATE TABLE IF NOT EXISTS api_keys (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    prefix        TEXT NOT NULL,         -- "pk_abcd1234" — first 11 chars, for display
    secret_hash   TEXT NOT NULL,         -- sha256 hex (64 chars)
    scopes        TEXT[] NOT NULL DEFAULT ARRAY['read']::TEXT[],
    ip_allowlist  TEXT[],                 -- NULL = any IP
    last_used_at  TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ,
    revoked_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_secret_idx ON api_keys(secret_hash);
CREATE INDEX        IF NOT EXISTS api_keys_user_idx   ON api_keys(user_id, created_at DESC);
