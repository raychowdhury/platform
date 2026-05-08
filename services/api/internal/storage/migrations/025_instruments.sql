-- Futures pivot: instruments registry holding tick_size + multiplier per symbol.
-- Symbol stays the join key across orders/positions/ticks/fills (TEXT, no FK
-- enforced — crypto symbols predate this table). OMS looks up tick_size and
-- multiplier by symbol when present; absent rows fall through to spot defaults.
CREATE TABLE IF NOT EXISTS instruments (
    symbol         TEXT         PRIMARY KEY,
    asset_class    TEXT         NOT NULL,           -- 'futures' | 'spot'
    root           TEXT,                            -- 'ES'
    contract_month TEXT,                            -- '2026-06'
    expiry         DATE,                            -- 2026-06-19
    tick_size      NUMERIC(20,10) NOT NULL,
    multiplier     NUMERIC(20,10) NOT NULL,         -- $/point (ES = 50)
    exchange       TEXT         NOT NULL,           -- 'CME', 'COINBASE'
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO instruments
    (symbol, asset_class, root, contract_month, expiry, tick_size, multiplier, exchange)
VALUES
    ('ESM6', 'futures', 'ES', '2026-06', DATE '2026-06-19', 0.25, 50, 'CME')
ON CONFLICT (symbol) DO NOTHING;
