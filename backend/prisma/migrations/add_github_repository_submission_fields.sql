-- Add GitHub repository submission fields to assignment_submissions table
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS github_repo_url TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS github_repo_name TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS github_repo_description TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS github_repo_language TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS github_repo_private BOOLEAN DEFAULT false;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS github_repo_stars INTEGER DEFAULT 0;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS github_repo_forks INTEGER DEFAULT 0;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS github_repo_created_at TIMESTAMPTZ;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS github_repo_updated_at TIMESTAMPTZ;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS github_repo_default_branch TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS github_repo_size_kb INTEGER;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_github_repo_url ON assignment_submissions(github_repo_url);