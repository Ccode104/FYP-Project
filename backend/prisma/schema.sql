-- departments
CREATE TABLE IF NOT EXISTS departments (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

-- user role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('student','faculty','ta','admin');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  department_id BIGINT REFERENCES departments(id),
  password_hash TEXT,
  roll_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  department_id BIGINT REFERENCES departments(id),
  credits INT
);

CREATE TABLE IF NOT EXISTS course_offerings (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  section TEXT,
  faculty_id BIGINT NOT NULL REFERENCES users(id),
  max_capacity INT,
  start_date DATE,
  end_date DATE,
  UNIQUE(course_id, term, section)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id BIGSERIAL PRIMARY KEY,
  course_offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active',
  UNIQUE(course_offering_id, student_id)
);

CREATE TABLE IF NOT EXISTS ta_assignments (
  id BIGSERIAL PRIMARY KEY,
  course_offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  ta_id BIGINT NOT NULL REFERENCES users(id),
  role TEXT DEFAULT 'ta',
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_offering_id, ta_id)
);

CREATE TABLE IF NOT EXISTS resources (
  id BIGSERIAL PRIMARY KEY,
  course_offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  uploaded_by BIGINT REFERENCES users(id),
  title TEXT,
  description TEXT,
  resource_type TEXT,
  storage_path TEXT NOT NULL,
  filename TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id BIGSERIAL PRIMARY KEY,
  course_offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignment_type TEXT NOT NULL,
  release_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  max_score NUMERIC(6,2) DEFAULT 100,
  allow_multiple_submissions BOOLEAN DEFAULT false,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id BIGSERIAL PRIMARY KEY,
  assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'submitted',
  final_score NUMERIC(6,2),
  grader_id BIGINT REFERENCES users(id),
  graded_at TIMESTAMPTZ,
  comments TEXT,
  attempt INT DEFAULT 1,
  UNIQUE(assignment_id, student_id, attempt)
);

CREATE TABLE IF NOT EXISTS submission_files (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS code_submissions (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  language TEXT,
  code TEXT,
  repo_link TEXT,
  run_output TEXT,
  test_results JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submission_grades (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  grader_id BIGINT NOT NULL REFERENCES users(id),
  score NUMERIC(6,2) NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quizzes (
  id BIGSERIAL PRIMARY KEY,
  course_offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  title TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  max_score NUMERIC(6,2) DEFAULT 100
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id BIGSERIAL PRIMARY KEY,
  quiz_id BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT,
  question_type TEXT DEFAULT 'mcq',
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id BIGSERIAL PRIMARY KEY,
  quiz_id BIGINT NOT NULL REFERENCES quizzes(id),
  student_id BIGINT NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  score NUMERIC(6,2),
  answers JSONB
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  title TEXT,
  body TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Discussion forum for each course offering
CREATE TABLE IF NOT EXISTS discussion_messages (
  id BIGSERIAL PRIMARY KEY,
  course_offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  parent_id BIGINT REFERENCES discussion_messages(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discussion_messages_offering ON discussion_messages(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_discussion_messages_parent ON discussion_messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_discussion_messages_created_at ON discussion_messages(created_at);

-- Code questions bank
CREATE TABLE IF NOT EXISTS code_questions (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  constraints TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS code_question_testcases (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES code_questions(id) ON DELETE CASCADE,
  is_sample BOOLEAN DEFAULT false,
  input_path TEXT,
  expected_path TEXT,
  input_text TEXT,
  expected_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mapping questions into a code assignment
CREATE TABLE IF NOT EXISTS assignment_questions (
  id BIGSERIAL PRIMARY KEY,
  assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES code_questions(id) ON DELETE CASCADE,
  points NUMERIC(6,2) DEFAULT 0,
  position INT,
  UNIQUE(assignment_id, question_id)
);

-- Link code submission to assignment question (if provided)
ALTER TABLE code_submissions
  ADD COLUMN IF NOT EXISTS assignment_question_id BIGINT REFERENCES assignment_questions(id);
