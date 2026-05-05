-- Add fib_retracement to allowed drawing types. Same row shape as trend_line:
-- two anchors (time1/price1, time2/price2). Renderer draws horizontal levels
-- at the standard Fibonacci ratios (0, 0.236, 0.382, 0.5, 0.618, 0.786, 1)
-- between the two prices.
ALTER TABLE drawings DROP CONSTRAINT IF EXISTS drawings_type_check;
ALTER TABLE drawings ADD CONSTRAINT drawings_type_check
    CHECK (type IN ('price_line','trend_line','fib_retracement'));
