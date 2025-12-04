-- Migration to add whiteboard table for persistent storage

-- Create whiteboard table
CREATE TABLE IF NOT EXISTS whiteboard_states (
  id BIGSERIAL PRIMARY KEY,
  live_lecture_id BIGINT NOT NULL REFERENCES live_lectures(id) ON DELETE CASCADE,
  drawing_data JSONB NOT NULL, -- Store drawing actions as JSON
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whiteboard_states_lecture_id ON whiteboard_states(live_lecture_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_states_created_at ON whiteboard_states(created_at);

-- Add clear_timestamp to live_lectures for tracking when whiteboard was last cleared
ALTER TABLE live_lectures
ADD COLUMN IF NOT EXISTS whiteboard_cleared_at TIMESTAMPTZ;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_live_lectures_whiteboard_cleared_at ON live_lectures(whiteboard_cleared_at);