-- Add violated column to quiz_attempts table
ALTER TABLE quiz_attempts
ADD COLUMN IF NOT EXISTS violated BOOLEAN DEFAULT false;