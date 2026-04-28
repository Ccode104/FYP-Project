-- Create a simple key-value settings table used for password reset tokens and other app settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful index for cleanup or auditing
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings (updated_at);
