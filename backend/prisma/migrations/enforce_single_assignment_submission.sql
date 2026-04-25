-- Enforce one submission per assignment/student pair.
-- Keeps the most recent submission and deletes older duplicates.

BEGIN;

UPDATE assignments
SET allow_multiple_submissions = false
WHERE allow_multiple_submissions IS DISTINCT FROM false;

WITH ranked_submissions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY assignment_id, student_id
      ORDER BY submitted_at DESC NULLS LAST, graded_at DESC NULLS LAST, id DESC
    ) AS row_num
  FROM assignment_submissions
)
DELETE FROM assignment_submissions s
USING ranked_submissions r
WHERE s.id = r.id
  AND r.row_num > 1;

UPDATE assignment_submissions
SET attempt = 1
WHERE attempt IS DISTINCT FROM 1;

ALTER TABLE assignment_submissions
  DROP CONSTRAINT IF EXISTS assignment_submissions_assignment_id_student_id_attempt_key;

ALTER TABLE assignment_submissions
  DROP CONSTRAINT IF EXISTS assignment_submissions_assignment_id_student_id_key;

ALTER TABLE assignment_submissions
  ADD CONSTRAINT assignment_submissions_assignment_id_student_id_key
  UNIQUE (assignment_id, student_id);

COMMIT;
