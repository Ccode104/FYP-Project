-- Fix proctoring session foreign key constraint
-- Make quiz_attempt_id nullable since proctoring session is created before quiz attempt

ALTER TABLE proctoring_sessions
ALTER COLUMN quiz_attempt_id DROP NOT NULL;

-- Update the foreign key to allow null values
ALTER TABLE proctoring_sessions
DROP CONSTRAINT IF EXISTS proctoring_sessions_quiz_attempt_id_fkey,
ADD CONSTRAINT proctoring_sessions_quiz_attempt_id_fkey
FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE;

-- Update index to handle null values
DROP INDEX IF EXISTS idx_proctoring_sessions_quiz_attempt;
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_quiz_attempt ON proctoring_sessions(quiz_attempt_id) WHERE quiz_attempt_id IS NOT NULL;