-- Compatibility adjustments for legacy schema.sql + comprehensive seed usage

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE course_offerings
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
