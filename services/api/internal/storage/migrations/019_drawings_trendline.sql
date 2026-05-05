-- Extend drawings to support trendlines (and leave room for fib/box later).
-- Two anchors are stored as (time1, price1) → (time2, price2) on the same row;
-- price_line rows leave the time/price2 columns NULL.
ALTER TABLE drawings DROP CONSTRAINT IF EXISTS drawings_type_check;
ALTER TABLE drawings ADD CONSTRAINT drawings_type_check
    CHECK (type IN ('price_line','trend_line'));

ALTER TABLE drawings ADD COLUMN IF NOT EXISTS time1  TIMESTAMPTZ;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS time2  TIMESTAMPTZ;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS price2 NUMERIC(24,8);

ALTER TABLE drawings ALTER COLUMN price DROP NOT NULL;
