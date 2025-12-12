-- Refactor submissions schema to eliminate redundant columns
-- Create separate tables for each assignment type

-- Create file_submissions table for file-based assignments
CREATE TABLE IF NOT EXISTS file_submissions (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  zip_file_url TEXT,
  submission_type TEXT DEFAULT 'file',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create github_submissions table for GitHub repository assignments
CREATE TABLE IF NOT EXISTS github_submissions (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  repo_url TEXT NOT NULL,
  repo_name TEXT,
  repo_description TEXT,
  repo_language TEXT,
  repo_private BOOLEAN,
  repo_stars INTEGER,
  repo_forks INTEGER,
  repo_created_at TIMESTAMPTZ,
  repo_updated_at TIMESTAMPTZ,
  repo_default_branch TEXT,
  repo_size_kb INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create mixed_submissions table for mixed assignments (files + GitHub)
CREATE TABLE IF NOT EXISTS mixed_submissions (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  zip_file_url TEXT,
  repo_url TEXT,
  repo_name TEXT,
  repo_description TEXT,
  repo_language TEXT,
  repo_private BOOLEAN,
  repo_stars INTEGER,
  repo_forks INTEGER,
  repo_created_at TIMESTAMPTZ,
  repo_updated_at TIMESTAMPTZ,
  repo_default_branch TEXT,
  repo_size_kb INTEGER,
  submission_type TEXT DEFAULT 'mixed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Migrate existing data from assignment_submissions to new tables
-- Insert GitHub submissions
INSERT INTO github_submissions (
  submission_id, repo_url, repo_name, repo_description, repo_language,
  repo_private, repo_stars, repo_forks, repo_created_at, repo_updated_at,
  repo_default_branch, repo_size_kb, created_at
)
SELECT
  id, github_repo_url, github_repo_name, github_repo_description, github_repo_language,
  github_repo_private, github_repo_stars, github_repo_forks, github_repo_created_at, github_repo_updated_at,
  github_repo_default_branch, github_repo_size_kb, now()
FROM assignment_submissions
WHERE github_repo_url IS NOT NULL AND (zip_file_url IS NULL OR submission_type != 'mixed');

-- Insert mixed submissions
INSERT INTO mixed_submissions (
  submission_id, zip_file_url, repo_url, repo_name, repo_description, repo_language,
  repo_private, repo_stars, repo_forks, repo_created_at, repo_updated_at,
  repo_default_branch, repo_size_kb, submission_type, created_at
)
SELECT
  id, zip_file_url, github_repo_url, github_repo_name, github_repo_description, github_repo_language,
  github_repo_private, github_repo_stars, github_repo_forks, github_repo_created_at, github_repo_updated_at,
  github_repo_default_branch, github_repo_size_kb, submission_type, now()
FROM assignment_submissions
WHERE github_repo_url IS NOT NULL AND zip_file_url IS NOT NULL AND submission_type = 'mixed';

-- Insert file submissions (for submissions with zip_file_url but no GitHub data)
INSERT INTO file_submissions (submission_id, zip_file_url, submission_type, created_at)
SELECT id, zip_file_url, submission_type, now()
FROM assignment_submissions
WHERE zip_file_url IS NOT NULL AND github_repo_url IS NULL;

-- Now remove the redundant columns from assignment_submissions
-- First check if columns exist before dropping
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'github_repo_url') THEN
    ALTER TABLE assignment_submissions DROP COLUMN github_repo_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'github_repo_name') THEN
    ALTER TABLE assignment_submissions DROP COLUMN github_repo_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'github_repo_description') THEN
    ALTER TABLE assignment_submissions DROP COLUMN github_repo_description;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'github_repo_language') THEN
    ALTER TABLE assignment_submissions DROP COLUMN github_repo_language;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'github_repo_private') THEN
    ALTER TABLE assignment_submissions DROP COLUMN github_repo_private;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'github_repo_stars') THEN
    ALTER TABLE assignment_submissions DROP COLUMN github_repo_stars;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'github_repo_forks') THEN
    ALTER TABLE assignment_submissions DROP COLUMN github_repo_forks;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'github_repo_created_at') THEN
    ALTER TABLE assignment_submissions DROP COLUMN github_repo_created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'github_repo_updated_at') THEN
    ALTER TABLE assignment_submissions DROP COLUMN github_repo_updated_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'github_repo_default_branch') THEN
    ALTER TABLE assignment_submissions DROP COLUMN github_repo_default_branch;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'github_repo_size_kb') THEN
    ALTER TABLE assignment_submissions DROP COLUMN github_repo_size_kb;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'zip_file_url') THEN
    ALTER TABLE assignment_submissions DROP COLUMN zip_file_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'submission_type') THEN
    ALTER TABLE assignment_submissions DROP COLUMN submission_type;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_submissions_submission_id ON file_submissions(submission_id);
CREATE INDEX IF NOT EXISTS idx_github_submissions_submission_id ON github_submissions(submission_id);
CREATE INDEX IF NOT EXISTS idx_mixed_submissions_submission_id ON mixed_submissions(submission_id);