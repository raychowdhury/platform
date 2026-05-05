CREATE TABLE IF NOT EXISTS drawings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol      TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('price_line')),
    price       NUMERIC(24,8) NOT NULL,
    color       TEXT NOT NULL DEFAULT '#2962ff',
    label       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS drawings_user_symbol_idx ON drawings(user_id, symbol);
