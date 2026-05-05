-- Force-logout support: any access token (JWT) whose issued-at predates this
-- timestamp is rejected by the auth middleware. Bumped on admin freeze and on
-- any future event that should kick a user off all sessions (password change,
-- key compromise, etc.). NULL = never invalidated.
ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_invalid_after TIMESTAMPTZ;
