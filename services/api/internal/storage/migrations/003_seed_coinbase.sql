INSERT INTO symbols (symbol, exchange, base, quote, status)
VALUES ('BTC-USD', 'coinbase', 'BTC', 'USD', 'active')
ON CONFLICT (symbol) DO NOTHING;
