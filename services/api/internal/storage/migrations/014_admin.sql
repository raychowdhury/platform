-- RBAC: simple role column on users. Default 'user'; 'admin' is set out-of-band
-- (manual SQL, bootstrap script, or a future "first user becomes admin" hook).
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user','admin'));

CREATE INDEX IF NOT EXISTS users_role_idx ON users(role) WHERE role <> 'user';

-- Append-only log of admin actions. Distinct from auth_audit so admin reads are cheap.
CREATE TABLE IF NOT EXISTS admin_audit (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    target_id   UUID,
    action      TEXT NOT NULL,
    metadata    JSONB,
    ip          TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_actor_idx  ON admin_audit(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_target_idx ON admin_audit(target_id, created_at DESC) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS admin_audit_action_idx ON admin_audit(action, created_at DESC);
