CREATE TABLE IF NOT EXISTS layouts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    grid        TEXT NOT NULL CHECK (grid IN ('1','2','4')),
    panels      JSONB NOT NULL,
    is_default  BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS layouts_user_idx ON layouts(user_id, created_at DESC);
-- only one default per user
CREATE UNIQUE INDEX IF NOT EXISTS layouts_default_idx ON layouts(user_id) WHERE is_default;
