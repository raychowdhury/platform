INSERT INTO symbols (symbol, exchange, base, quote, status) VALUES
    ('ETH-USD', 'coinbase', 'ETH', 'USD', 'active'),
    ('SOL-USD', 'coinbase', 'SOL', 'USD', 'active'),
    ('ETHUSDT', 'binance',  'ETH', 'USDT','active'),
    ('SOLUSDT', 'binance',  'SOL', 'USDT','active')
ON CONFLICT (symbol) DO NOTHING;
