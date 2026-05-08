-- ES futures pivot: hide crypto symbols from the FE picker. Rows are kept
-- (legacy fills/positions reference them) but flipped to 'inactive' so
-- ListSymbols (WHERE status='active') only surfaces CME futures going forward.
UPDATE symbols
SET status = 'inactive'
WHERE exchange IN ('coinbase', 'binance')
  AND status = 'active';
