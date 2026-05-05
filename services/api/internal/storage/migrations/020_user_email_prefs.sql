-- Per-user notification preferences. email_alerts gates the email send on
-- alert firing (in-app notification fires regardless). Default false so
-- existing users don't get unexpected mail after the rollout.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_alerts BOOLEAN NOT NULL DEFAULT FALSE;
