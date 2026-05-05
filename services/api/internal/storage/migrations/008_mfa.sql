-- TOTP (RFC 6238) + recovery codes.
-- NOTE: totp_secret is stored in plaintext (base32) for paper-trading dev.
-- Production must encrypt at rest with envelope encryption (KMS / pgcrypto + KEK).

CREATE TABLE IF NOT EXISTS user_mfa (
    user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    totp_secret  TEXT NOT NULL,
    enabled_at   TIMESTAMPTZ,            -- NULL until user confirms first valid code
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   TEXT NOT NULL,           -- sha256 hex of "platform-recovery:<code>"
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mfa_recovery_user_idx ON mfa_recovery_codes(user_id) WHERE used_at IS NULL;
