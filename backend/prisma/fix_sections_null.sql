-- Fix: Allow NULL for start_time and end_time in video_sections

ALTER TABLE video_sections ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE video_sections ALTER COLUMN end_time DROP NOT NULL;

-- Drop the check constraint if it exists
ALTER TABLE video_sections DROP CONSTRAINT IF EXISTS video_sections_start_time_check;

-- Drop the time index (cannot index null columns for partial index without WHERE)
DROP INDEX IF EXISTS idx_video_sections_time;