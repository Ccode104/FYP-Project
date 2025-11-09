-- Migration script to add course_offering_id column to videos table if it doesn't exist
-- Run this if you already have the videos table without the course_offering_id column

DO $$
BEGIN
  -- Check if course_offering_id column exists, if not, add it
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'videos' 
    AND column_name = 'course_offering_id'
  ) THEN
    ALTER TABLE videos 
    ADD COLUMN course_offering_id BIGINT REFERENCES course_offerings(id) ON DELETE CASCADE;
    
    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS idx_videos_course_offering_id ON videos(course_offering_id);
    
    RAISE NOTICE 'Added course_offering_id column to videos table';
  ELSE
    RAISE NOTICE 'Column course_offering_id already exists in videos table';
  END IF;
END$$;

