-- Seed ESM6 into the FE-facing symbols table so the chart/order picker shows it.
-- tick_size 0.25 matches the CME ES contract; step_size/min_qty are 1 contract.
INSERT INTO symbols (symbol, exchange, base, quote, tick_size, step_size, min_qty, status)
VALUES ('ESM6', 'CME', 'ES', 'USD', 0.25, 1, 1, 'active')
ON CONFLICT (symbol) DO UPDATE SET
    exchange = EXCLUDED.exchange,
    tick_size = EXCLUDED.tick_size,
    step_size = EXCLUDED.step_size,
    min_qty   = EXCLUDED.min_qty;
