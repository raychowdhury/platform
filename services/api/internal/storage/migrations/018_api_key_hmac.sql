-- Optional HMAC signing material per key. Keys minted before this column
-- existed remain in legacy bearer mode (signing_secret NULL → middleware
-- falls back to sha256(secret) bearer match). Newly created keys default to
-- HMAC mode and store the random signing secret in this column. Storing it
-- plaintext is acceptable for the paper-trading dev environment; KMS envelope
-- encryption is a separate sprint.
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS signing_secret TEXT;
