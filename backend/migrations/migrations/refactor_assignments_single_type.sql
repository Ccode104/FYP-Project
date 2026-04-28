-- Refactor assignments to use single type with GitHub repo option
-- Add allow_github_repo column to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS allow_github_repo BOOLEAN DEFAULT false;

-- Set allow_github_repo to true for assignments that previously allowed GitHub (mixed type)
UPDATE assignments SET allow_github_repo = true WHERE assignment_type = 'mixed';

-- Remove assignment_type column (no longer needed with single assignment type)
-- Use CASCADE to drop dependent objects
ALTER TABLE assignments DROP COLUMN IF EXISTS assignment_type CASCADE;

-- Add comment to document the change
COMMENT ON COLUMN assignments.allow_github_repo IS 'Whether students can optionally submit a GitHub repository for this assignment';