-- Add grade columns to submissions and quiz_attempts tables
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS grade DECIMAL(5,2);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS graded_by BIGINT REFERENCES users(id);

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS grade DECIMAL(5,2);
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS graded_by BIGINT REFERENCES users(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_grade ON submissions(grade);
CREATE INDEX IF NOT EXISTS idx_submissions_graded_by ON submissions(graded_by);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_grade ON quiz_attempts(grade);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_graded_by ON quiz_attempts(graded_by);