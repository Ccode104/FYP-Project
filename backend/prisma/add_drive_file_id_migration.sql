-- Migration: Add drive_file_id column to videos table (safe - IF NOT EXISTS)
-- Fix for error: column v.drive_file_id does not exist

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'videos' 
    AND column_name = 'drive_file_id'
  ) THEN
    ALTER TABLE videos 
    ADD COLUMN drive_file_id TEXT;
    
    RAISE NOTICE 'Added drive_file_id column to videos table';
  ELSE
    RAISE NOTICE 'drive_file_id column already exists in videos table';
  END IF;
END$$;

-- Optional: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_videos_drive_file_id ON videos(drive_file_id);

RAISE NOTICE 'Migration completed successfully. You can now use Google Drive video uploads.';

