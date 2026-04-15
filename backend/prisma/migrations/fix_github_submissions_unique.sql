-- Fix github_submissions - add unique constraint on submission_id
ALTER TABLE github_submissions DROP CONSTRAINT IF EXISTS github_submissions_pkey;
ALTER TABLE github_submissions ADD PRIMARY KEY (id);
ALTER TABLE github_submissions ADD CONSTRAINT github_submissions_submission_id_key UNIQUE (submission_id);