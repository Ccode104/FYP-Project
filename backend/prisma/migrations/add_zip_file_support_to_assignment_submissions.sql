-- Add zip file support to assignment_submissions table
-- This migration adds columns to support storing zip file links and submission types
-- for mixed assignments that can have either GitHub repos or external zip file links

ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS zip_file_url TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS submission_type TEXT;