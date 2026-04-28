-- Migration: Add Code Questions Bank Tables
-- This migration adds support for code question bank and assignment-question mapping
-- Required for the Code Submission Assignment feature

-- Code questions bank (reusable questions that can be used in multiple assignments)
CREATE TABLE IF NOT EXISTS code_questions (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  constraints TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Test cases for code questions (supports both sample and hidden test cases)
CREATE TABLE IF NOT EXISTS code_question_testcases (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES code_questions(id) ON DELETE CASCADE,
  is_sample BOOLEAN DEFAULT false,  -- true: shown to students, false: hidden for grading
  input_path TEXT,                   -- S3 path for input file (optional)
  expected_path TEXT,                -- S3 path for expected output file (optional)
  input_text TEXT,                   -- Direct input text (optional)
  expected_text TEXT,                -- Direct expected output text (optional)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mapping questions to assignments (allows selecting multiple questions per assignment)
CREATE TABLE IF NOT EXISTS assignment_questions (
  id BIGSERIAL PRIMARY KEY,
  assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES code_questions(id) ON DELETE CASCADE,
  points NUMERIC(6,2) DEFAULT 0,    -- Points allocated for this question in this assignment
  position INT,                      -- Order of question in assignment
  UNIQUE(assignment_id, question_id)
);

-- Add column to code_submissions to link to specific assignment question
ALTER TABLE code_submissions
  ADD COLUMN IF NOT EXISTS assignment_question_id BIGINT REFERENCES assignment_questions(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_code_questions_created_by ON code_questions(created_by);
CREATE INDEX IF NOT EXISTS idx_code_question_testcases_question_id ON code_question_testcases(question_id);
CREATE INDEX IF NOT EXISTS idx_code_question_testcases_is_sample ON code_question_testcases(is_sample);
CREATE INDEX IF NOT EXISTS idx_assignment_questions_assignment_id ON assignment_questions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_questions_question_id ON assignment_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_assignment_question_id ON code_submissions(assignment_question_id);

-- Handle code_submission_results table
-- If it already exists (from your schema), add a column for code_question_testcases
-- If it doesn't exist, create it
DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'code_submission_results') THEN
    -- Table exists, add column for code_question_testcases reference
    ALTER TABLE code_submission_results
      ADD COLUMN IF NOT EXISTS code_testcase_id BIGINT REFERENCES code_question_testcases(id);
    
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'code_submission_results_code_submission_id_code_testcase_id_key'
    ) THEN
      ALTER TABLE code_submission_results
        ADD CONSTRAINT code_submission_results_code_submission_id_code_testcase_id_key
        UNIQUE (code_submission_id, code_testcase_id);
    END IF;
  ELSE
    -- Table doesn't exist, create it
    CREATE TABLE code_submission_results (
      id BIGSERIAL PRIMARY KEY,
      code_submission_id BIGINT NOT NULL REFERENCES code_submissions(id) ON DELETE CASCADE,
      testcase_id BIGINT REFERENCES code_question_testcases(id),
      code_testcase_id BIGINT REFERENCES code_question_testcases(id),
      passed BOOLEAN,
      student_output TEXT,
      error_output TEXT,
      execution_time_ms INT,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(code_submission_id, code_testcase_id)
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_code_submission_results_code_submission_id ON code_submission_results(code_submission_id);
CREATE INDEX IF NOT EXISTS idx_code_submission_results_code_testcase_id ON code_submission_results(code_testcase_id);

