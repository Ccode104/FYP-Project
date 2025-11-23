-- Grading rubrics tables

-- Rubrics table
CREATE TABLE IF NOT EXISTS rubrics (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  course_offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rubric criteria
CREATE TABLE IF NOT EXISTS rubric_criteria (
  id BIGSERIAL PRIMARY KEY,
  rubric_id BIGINT NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  max_points NUMERIC(6,2) DEFAULT 10,
  weight NUMERIC(5,2) DEFAULT 1.0, -- Relative weight for calculating total
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Assignment rubrics (link assignments to rubrics)
CREATE TABLE IF NOT EXISTS assignment_rubrics (
  id BIGSERIAL PRIMARY KEY,
  assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  rubric_id BIGINT NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  UNIQUE(assignment_id)
);

-- Rubric grades (detailed grading per criterion)
CREATE TABLE IF NOT EXISTS rubric_grades (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  criterion_id BIGINT NOT NULL REFERENCES rubric_criteria(id) ON DELETE CASCADE,
  score NUMERIC(6,2),
  feedback TEXT,
  graded_by BIGINT REFERENCES users(id),
  graded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(submission_id, criterion_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rubrics_offering ON rubrics(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric ON rubric_criteria(rubric_id);
CREATE INDEX IF NOT EXISTS idx_assignment_rubrics_assignment ON assignment_rubrics(assignment_id);
CREATE INDEX IF NOT EXISTS idx_rubric_grades_submission ON rubric_grades(submission_id);
CREATE INDEX IF NOT EXISTS idx_rubric_grades_criterion ON rubric_grades(criterion_id);