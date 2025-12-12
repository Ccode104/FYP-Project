-- Migration: Add file_size_limit field to assignments table
-- This allows teachers to set a maximum file size limit for assignment submissions

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS file_size_limit_mb INTEGER DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN assignments.file_size_limit_mb IS 'Maximum file size limit in MB for assignment submissions. NULL means no limit.';