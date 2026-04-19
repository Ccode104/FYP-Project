ALTER TABLE live_lectures
ADD COLUMN IF NOT EXISTS meeting_url TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_event_url TEXT,
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ;
