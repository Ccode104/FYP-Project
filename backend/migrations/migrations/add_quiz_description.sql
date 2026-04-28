-- Add description column to quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS description TEXT;