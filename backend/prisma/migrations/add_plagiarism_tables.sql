-- Add plagiarism checking tables

CREATE TABLE IF NOT EXISTS plagiarism_checks (
  id BIGSERIAL PRIMARY KEY,
  assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ DEFAULT now(),
  report_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plagiarism_matches (
  id BIGSERIAL PRIMARY KEY,
  check_id BIGINT NOT NULL REFERENCES plagiarism_checks(id) ON DELETE CASCADE,
  submission1_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  submission2_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  similarity_percentage NUMERIC(5,2), -- e.g., 85.50
  match_details JSONB, -- store additional info like matched lines
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(check_id, submission1_id, submission2_id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_plagiarism_checks_assignment ON plagiarism_checks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_matches_check ON plagiarism_matches(check_id);