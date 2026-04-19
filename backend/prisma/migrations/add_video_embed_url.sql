-- Add embed_url and direct_video_url to videos table
-- These columns were added to schema.sql but missing in the migration

ALTER TABLE videos ADD COLUMN IF NOT EXISTS embed_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS direct_video_url TEXT;
