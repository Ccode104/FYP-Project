-- Additional compatibility adjustments for legacy schema variants

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'file';
