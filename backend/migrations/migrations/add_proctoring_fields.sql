-- Add proctoring fields to quizzes table
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS is_proctored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS time_limit INTEGER;