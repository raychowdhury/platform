CREATE TABLE IF NOT EXISTS notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_id    UUID REFERENCES alerts(id) ON DELETE SET NULL,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT,
    metadata    JSONB,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx     ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx   ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
