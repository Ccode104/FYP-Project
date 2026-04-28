-- Migration: Add Coding Contests Tables
-- This migration adds support for coding contests separate from regular assignments
-- Contests are time-bound coding competitions with multiple problems

-- Contests table (main contest information)
CREATE TABLE IF NOT EXISTS contests (
  id BIGSERIAL PRIMARY KEY,
  course_offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  max_score NUMERIC(6,2) DEFAULT 100,
  allow_multiple_submissions BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contest questions mapping (which questions are in which contest)
CREATE TABLE IF NOT EXISTS contest_questions (
  id BIGSERIAL PRIMARY KEY,
  contest_id BIGINT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES code_questions(id) ON DELETE CASCADE,
  points NUMERIC(6,2) DEFAULT 0,
  position INT,
  UNIQUE(contest_id, question_id)
);

-- Contest submissions (student submissions to contests)
CREATE TABLE IF NOT EXISTS contest_submissions (
  id BIGSERIAL PRIMARY KEY,
  contest_id BIGINT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  final_score NUMERIC(6,2),
  comments TEXT,
  graded_at TIMESTAMPTZ,
  grader_id BIGINT REFERENCES users(id),
  UNIQUE(contest_id, student_id)
);

-- Contest submission details (individual question submissions within a contest)
CREATE TABLE IF NOT EXISTS contest_submission_details (
  id BIGSERIAL PRIMARY KEY,
  contest_submission_id BIGINT NOT NULL REFERENCES contest_submissions(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES code_questions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  score NUMERIC(6,2),
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contest_submission_id, question_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contests_course_offering_id ON contests(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_contests_start_at ON contests(start_at);
CREATE INDEX IF NOT EXISTS idx_contests_end_at ON contests(end_at);
CREATE INDEX IF NOT EXISTS idx_contests_created_by ON contests(created_by);
CREATE INDEX IF NOT EXISTS idx_contest_questions_contest_id ON contest_questions(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_questions_question_id ON contest_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_contest_id ON contest_submissions(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_student_id ON contest_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_contest_submission_details_contest_submission_id ON contest_submission_details(contest_submission_id);
CREATE INDEX IF NOT EXISTS idx_contest_submission_details_question_id ON contest_submission_details(question_id);

-- Add template_code and driver_code columns to code_questions if they don't exist
ALTER TABLE code_questions
  ADD COLUMN IF NOT EXISTS template_code JSONB,
  ADD COLUMN IF NOT EXISTS driver_code JSONB;

-- Update trigger for contests updated_at
CREATE OR REPLACE FUNCTION update_contests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contests_updated_at_trigger
  BEFORE UPDATE ON contests
  FOR EACH ROW
  EXECUTE FUNCTION update_contests_updated_at();