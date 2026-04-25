DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_level') THEN
    CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
  END IF;
END $$;

DO $$
DECLARE
  target_schema_name TEXT;
BEGIN
  FOR target_schema_name IN
    SELECT s.schema_name
    FROM information_schema.schemata s
    WHERE s.schema_name NOT IN (
      'public',
      'information_schema',
      'neon_auth',
      'auth',
      'storage',
      'realtime',
      'extensions',
      'graphql_public',
      'supabase_functions',
      'vault'
    )
    AND schema_name NOT LIKE 'pg_%'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema = target_schema_name
    )
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.views WHERE table_schema = target_schema_name
    )
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.sequences WHERE sequence_schema = target_schema_name
    ) THEN
      EXECUTE format('DROP SCHEMA IF EXISTS %I', target_schema_name);
    END IF;
  END LOOP;
END $$;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'file',
  ADD COLUMN IF NOT EXISTS assignment_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS submission_requirements JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS grading_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_points NUMERIC(6,2) DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_graded BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS file_size_limit_mb INTEGER,
  ADD COLUMN IF NOT EXISTS allow_github_repo BOOLEAN DEFAULT false;

ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS drive_url TEXT,
  ADD COLUMN IF NOT EXISTS drive_file_id TEXT;

ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS allow_suspension_resume BOOLEAN DEFAULT true;

ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS proctoring_session_id BIGINT,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resumed_by BIGINT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS violated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS grade NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS graded_by BIGINT REFERENCES users(id);

ALTER TABLE code_questions
  ADD COLUMN IF NOT EXISTS template_code JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS driver_code JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS difficulty difficulty_level DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER DEFAULT 1800,
  ADD COLUMN IF NOT EXISTS max_points INTEGER DEFAULT 100;

CREATE TABLE IF NOT EXISTS admins (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_super BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by BIGINT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT,
  category TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  points_reward INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'common',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id BIGINT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS user_gamification_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  problems_solved INTEGER DEFAULT 0,
  easy_solved INTEGER DEFAULT 0,
  medium_solved INTEGER DEFAULT 0,
  hard_solved INTEGER DEFAULT 0,
  total_submissions INTEGER DEFAULT 0,
  successful_submissions INTEGER DEFAULT 0,
  average_time_seconds INTEGER DEFAULT 0,
  last_submission_date DATE,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  quizzes_completed INTEGER DEFAULT 0,
  perfect_quiz_scores INTEGER DEFAULT 0,
  high_quiz_scores INTEGER DEFAULT 0,
  fast_quiz_completions INTEGER DEFAULT 0,
  total_quiz_score INTEGER DEFAULT 0,
  average_quiz_score NUMERIC(5,2) DEFAULT 0,
  quiz_streak INTEGER DEFAULT 0,
  last_quiz_date DATE,
  unique_course_quizzes INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leaderboards (
  id BIGSERIAL PRIMARY KEY,
  leaderboard_type TEXT NOT NULL,
  reference_id BIGINT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  rank INTEGER,
  time_spent_seconds INTEGER,
  submission_date TIMESTAMPTZ DEFAULT now(),
  period_start DATE,
  period_end DATE,
  UNIQUE(leaderboard_type, reference_id, user_id, period_start)
);

CREATE TABLE IF NOT EXISTS rubrics (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  course_offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rubric_criteria (
  id BIGSERIAL PRIMARY KEY,
  rubric_id BIGINT NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  max_points NUMERIC(6,2) DEFAULT 10,
  weight NUMERIC(5,2) DEFAULT 1.0,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS grading_tasks (
  id BIGSERIAL PRIMARY KEY,
  assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ta_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
  UNIQUE(assignment_id, student_id, ta_id)
);

CREATE TABLE IF NOT EXISTS regrade_requests (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  criterion_id BIGINT REFERENCES rubric_criteria(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'resolved')),
  requested_by BIGINT NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  responded_by BIGINT REFERENCES users(id),
  responded_at TIMESTAMPTZ,
  response_message TEXT,
  UNIQUE(submission_id, criterion_id, requested_by)
);

CREATE TABLE IF NOT EXISTS file_submissions (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  zip_file_url TEXT,
  submission_type TEXT DEFAULT 'file',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS github_submissions (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL UNIQUE REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  repo_url TEXT NOT NULL,
  repo_name TEXT,
  repo_description TEXT,
  repo_language TEXT,
  repo_private BOOLEAN,
  repo_stars INTEGER,
  repo_forks INTEGER,
  repo_created_at TIMESTAMPTZ,
  repo_updated_at TIMESTAMPTZ,
  repo_default_branch TEXT,
  repo_size_kb INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mixed_submissions (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  zip_file_url TEXT,
  repo_url TEXT,
  repo_name TEXT,
  repo_description TEXT,
  repo_language TEXT,
  repo_private BOOLEAN,
  repo_stars INTEGER,
  repo_forks INTEGER,
  repo_created_at TIMESTAMPTZ,
  repo_updated_at TIMESTAMPTZ,
  repo_default_branch TEXT,
  repo_size_kb INTEGER,
  submission_type TEXT DEFAULT 'mixed',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignment_component_submissions (
  id BIGSERIAL PRIMARY KEY,
  assignment_submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL,
  submission_type TEXT NOT NULL,
  content TEXT,
  file_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_submission_id, component_id)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'assignment_component_submissions'::regclass
      AND conname = 'assignment_component_submissions_submission_type_check'
  ) THEN
    ALTER TABLE assignment_component_submissions
      DROP CONSTRAINT assignment_component_submissions_submission_type_check;
  END IF;
END $$;

ALTER TABLE assignment_component_submissions
  ADD CONSTRAINT assignment_component_submissions_submission_type_check
  CHECK (submission_type IN ('file', 'file_upload', 'text', 'link', 'url', 'code'));

CREATE TABLE IF NOT EXISTS component_grades (
  id BIGSERIAL PRIMARY KEY,
  assignment_submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL,
  score NUMERIC(6,2),
  feedback TEXT,
  graded_by BIGINT REFERENCES users(id),
  graded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_submission_id, component_id)
);

CREATE TABLE IF NOT EXISTS assignment_testcases (
  id BIGSERIAL PRIMARY KEY,
  assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS code_submission_results (
  id BIGSERIAL PRIMARY KEY,
  code_submission_id BIGINT NOT NULL REFERENCES code_submissions(id) ON DELETE CASCADE,
  testcase_id BIGINT REFERENCES assignment_testcases(id),
  passed BOOLEAN,
  student_output TEXT,
  error_output TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  code_testcase_id BIGINT REFERENCES code_question_testcases(id),
  UNIQUE(code_submission_id, code_testcase_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bug_report', 'technical_issue', 'feature_request', 'other')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to BIGINT REFERENCES users(id),
  course_offering_id BIGINT REFERENCES course_offerings(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_activities (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT,
  entity_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  undo_data JSONB,
  undoable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proctoring_configs (
  id BIGSERIAL PRIMARY KEY,
  quiz_id BIGINT UNIQUE REFERENCES quizzes(id) ON DELETE CASCADE,
  name VARCHAR(100) DEFAULT 'Default Configuration',
  webcam_required BOOLEAN DEFAULT true,
  screen_monitoring BOOLEAN DEFAULT true,
  audio_monitoring BOOLEAN DEFAULT false,
  face_detection_required BOOLEAN DEFAULT true,
  max_warnings INTEGER DEFAULT 3,
  auto_suspend_severity INTEGER DEFAULT 3,
  allow_recovery BOOLEAN DEFAULT true,
  recovery_wait_seconds INTEGER DEFAULT 30,
  violation_score_penalty NUMERIC(5,2) DEFAULT 1.0,
  suspension_requires_teacher BOOLEAN DEFAULT true,
  live_monitoring_enabled BOOLEAN DEFAULT false,
  record_sessions BOOLEAN DEFAULT true,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proctoring_sessions (
  id BIGSERIAL PRIMARY KEY,
  quiz_attempt_id BIGINT REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  device_info JSONB,
  browser_info JSONB,
  session_token VARCHAR(255) UNIQUE,
  status VARCHAR(20) DEFAULT 'active',
  webcam_enabled BOOLEAN DEFAULT false,
  screen_monitoring_enabled BOOLEAN DEFAULT false,
  audio_monitoring_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proctoring_violations (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
  violation_type VARCHAR(50) NOT NULL,
  severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 4),
  timestamp TIMESTAMPTZ DEFAULT now(),
  evidence_data JSONB,
  evidence_url TEXT,
  description TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by BIGINT REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proctoring_analytics (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT UNIQUE REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
  total_violations INTEGER DEFAULT 0,
  violations_by_type JSONB DEFAULT '{}'::jsonb,
  violations_by_severity JSONB DEFAULT '{}'::jsonb,
  session_duration_seconds INTEGER,
  compliance_score NUMERIC(5,2),
  risk_level VARCHAR(20),
  flagged_for_review BOOLEAN DEFAULT false,
  reviewed_by BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_lectures (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  course_offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  stream_key TEXT UNIQUE,
  recording_url TEXT,
  meeting_url TEXT,
  max_participants INTEGER DEFAULT 100,
  is_recording BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_lecture_participants (
  id BIGSERIAL PRIMARY KEY,
  live_lecture_id BIGINT NOT NULL REFERENCES live_lectures(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'ta')),
  UNIQUE(live_lecture_id, user_id)
);

CREATE TABLE IF NOT EXISTS resume_requests (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES users(id),
  quiz_attempt_id BIGINT REFERENCES quiz_attempts(id),
  proctoring_session_id BIGINT REFERENCES proctoring_sessions(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  response_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quiz_attempt_id),
  CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_file_submissions_submission_id ON file_submissions(submission_id);
CREATE INDEX IF NOT EXISTS idx_assignment_component_submissions_submission ON assignment_component_submissions(assignment_submission_id);
CREATE INDEX IF NOT EXISTS idx_component_grades_submission ON component_grades(assignment_submission_id);
CREATE INDEX IF NOT EXISTS idx_grading_tasks_assignment_student ON grading_tasks(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_resume_requests_student ON resume_requests(student_id);

DROP VIEW IF EXISTS student_detailed_progress CASCADE;

CREATE VIEW student_detailed_progress AS
SELECT
  e.student_id,
  u.name AS student_name,
  co.id AS course_offering_id,
  c.code AS course_code,
  c.title AS course_title,
  'assignment'::text AS activity_type,
  a.id AS activity_id,
  a.title AS activity_title,
  a.assignment_type AS subtype,
  a.due_at,
  s.submitted_at,
  s.final_score AS score,
  COALESCE(s.status, 'not_submitted') AS status,
  s.attempt,
  s.graded_at,
  s.comments,
  now() AS last_updated
FROM enrollments e
JOIN users u ON u.id = e.student_id
JOIN course_offerings co ON co.id = e.course_offering_id
JOIN courses c ON c.id = co.course_id
JOIN assignments a ON a.course_offering_id = co.id
LEFT JOIN assignment_submissions s
  ON s.assignment_id = a.id
 AND s.student_id = e.student_id
UNION ALL
SELECT
  e.student_id,
  u.name AS student_name,
  co.id AS course_offering_id,
  c.code AS course_code,
  c.title AS course_title,
  'quiz'::text AS activity_type,
  q.id AS activity_id,
  q.title AS activity_title,
  NULL::text AS subtype,
  q.end_at AS due_at,
  qa.finished_at AS submitted_at,
  qa.score,
  CASE WHEN qa.id IS NULL THEN 'not_attempted'::text ELSE 'completed'::text END AS status,
  NULL::INTEGER AS attempt,
  qa.graded_at,
  qa.feedback AS comments,
  now() AS last_updated
FROM enrollments e
JOIN users u ON u.id = e.student_id
JOIN course_offerings co ON co.id = e.course_offering_id
JOIN courses c ON c.id = co.course_id
JOIN quizzes q ON q.course_offering_id = co.id
LEFT JOIN quiz_attempts qa
  ON qa.quiz_id = q.id
 AND qa.student_id = e.student_id;
