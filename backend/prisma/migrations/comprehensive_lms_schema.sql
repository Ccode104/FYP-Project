-- Comprehensive LMS Schema Migration
-- This script adds all advanced features to the existing basic schema

-- Create schemas if they don't exist
CREATE SCHEMA IF NOT EXISTS "public";
CREATE SCHEMA IF NOT EXISTS "neon_auth";

-- Create enums if they don't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM('student', 'faculty', 'ta', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE material_type AS ENUM('notes', 'video', 'presentation', 'question_bank', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM('easy', 'medium', 'hard');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS roll_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add columns to assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'file';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS allow_multiple_submissions BOOLEAN DEFAULT false;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Add columns to assignment_submissions
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted';
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS final_score NUMERIC(6,2);
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS grader_id BIGINT REFERENCES users(id);
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS attempt INT DEFAULT 1;

-- Add columns to quizzes
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_proctored BOOLEAN DEFAULT false;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS time_limit INTEGER;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS proctoring_config_id BIGINT;

-- Add columns to quiz_attempts
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS proctoring_session_id BIGINT;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS resumed_by BIGINT REFERENCES users(id);
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS violated BOOLEAN DEFAULT false;

-- Create new tables for advanced features

-- Gamification tables
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

CREATE TABLE IF NOT EXISTS daily_challenges (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    question_id BIGINT NOT NULL,
    bonus_points INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_daily_challenges (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id BIGINT NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT now(),
    points_earned INTEGER DEFAULT 0,
    time_spent_seconds INTEGER,
    UNIQUE(user_id, challenge_id)
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

-- Proctoring tables
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
    session_id BIGINT REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
    total_violations INTEGER DEFAULT 0,
    violations_by_type JSONB DEFAULT '{}',
    violations_by_severity JSONB DEFAULT '{}',
    session_duration_seconds INTEGER,
    compliance_score NUMERIC(5,2),
    risk_level VARCHAR(20),
    flagged_for_review BOOLEAN DEFAULT false,
    reviewed_by BIGINT REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Rubrics tables
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

-- Support system tables
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

CREATE TABLE IF NOT EXISTS ticket_attachments (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT,
    uploaded_by BIGINT REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Code questions and submissions
CREATE TABLE IF NOT EXISTS code_questions (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    constraints TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    difficulty difficulty_level DEFAULT 'medium',
    time_limit_seconds INTEGER DEFAULT 1800,
    max_points INTEGER DEFAULT 100
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

CREATE TABLE IF NOT EXISTS assignment_questions (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES code_questions(id) ON DELETE CASCADE,
    points NUMERIC(6,2) DEFAULT 0,
    position INTEGER,
    UNIQUE(assignment_id, question_id)
);

CREATE TABLE IF NOT EXISTS code_submissions (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    language TEXT,
    code TEXT,
    repo_link TEXT,
    run_output TEXT,
    test_results JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    assignment_question_id BIGINT REFERENCES assignment_questions(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER,
    gamified_score INTEGER DEFAULT 0,
    attempts_count INTEGER DEFAULT 1,
    efficiency_score NUMERIC(5,2) DEFAULT 0
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

-- Assignment testcases
CREATE TABLE IF NOT EXISTS assignment_testcases (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Video and video quiz tables
CREATE TABLE IF NOT EXISTS videos (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    uploaded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    duration NUMERIC(10,2),
    cloudinary_public_id TEXT,
    upload_timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    course_offering_id INTEGER NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS video_quiz_questions (
    id BIGSERIAL PRIMARY KEY,
    video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'mcq',
    options JSONB,
    correct_answer TEXT NOT NULL,
    points NUMERIC(6,2) DEFAULT 1.0,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    timestamp NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS video_quiz_attempts (
    id BIGSERIAL PRIMARY KEY,
    video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    score NUMERIC(6,2),
    max_score NUMERIC(6,2),
    answers JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(video_id, student_id)
);

-- Activity logging table
CREATE TABLE IF NOT EXISTS admin_activities (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'course', 'department', 'offering', 'assignment', 'quiz', 'enrollment', 'support')),
    entity_id BIGINT,
    entity_name TEXT,
    details JSONB DEFAULT '{}',
    undo_data JSONB,
    undoable BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Additional tables
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

CREATE TABLE IF NOT EXISTS pdf_documents (
    id BIGSERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    uploaded_by BIGINT REFERENCES users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faculty_course_offerings (
    id BIGSERIAL PRIMARY KEY,
    course_offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    faculty_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(course_offering_id, faculty_id)
);

CREATE TABLE IF NOT EXISTS faculty_courses (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    faculty_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(course_id, faculty_id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- TA Quiz Access Permissions
CREATE TABLE IF NOT EXISTS ta_quiz_permissions (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    ta_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    granted_by BIGINT REFERENCES users(id),
    granted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(quiz_id, ta_id)
);

-- Quiz Access Requests
CREATE TABLE IF NOT EXISTS quiz_access_requests (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    ta_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('view', 'edit', 'create')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMPTZ DEFAULT now(),
    responded_at TIMESTAMPTZ,
    response_message TEXT,
    UNIQUE(quiz_id, ta_id, request_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_achievements_name ON achievements(name);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_stats_user_id ON user_gamification_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(date);
CREATE INDEX IF NOT EXISTS idx_user_daily_challenges_user ON user_daily_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_type_reference ON leaderboards(leaderboard_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_user_period ON leaderboards(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_proctoring_configs_quiz ON proctoring_configs(quiz_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_quiz_attempt ON proctoring_sessions(quiz_attempt_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_status ON proctoring_sessions(status);
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_student ON proctoring_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_session ON proctoring_violations(session_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_severity ON proctoring_violations(severity);
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_timestamp ON proctoring_violations(timestamp);
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_type ON proctoring_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_proctoring_analytics_risk_level ON proctoring_analytics(risk_level);
CREATE INDEX IF NOT EXISTS idx_proctoring_analytics_session ON proctoring_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_offering ON rubrics(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric ON rubric_criteria(rubric_id);
CREATE INDEX IF NOT EXISTS idx_rubric_grades_criterion ON rubric_grades(criterion_id);
CREATE INDEX IF NOT EXISTS idx_rubric_grades_submission ON rubric_grades(submission_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_course ON support_tickets(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_code_questions_created_by ON code_questions(created_by);
CREATE INDEX IF NOT EXISTS idx_code_question_testcases_question_id ON code_question_testcases(question_id);
CREATE INDEX IF NOT EXISTS idx_code_question_testcases_is_sample ON code_question_testcases(is_sample);
CREATE INDEX IF NOT EXISTS idx_assignment_questions_assignment_id ON assignment_questions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_questions_question_id ON assignment_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_assignment_question_id ON code_submissions(assignment_question_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_started_completed ON code_submissions(started_at, completed_at);
CREATE INDEX IF NOT EXISTS idx_code_submission_results_code_submission_id ON code_submission_results(code_submission_id);
CREATE INDEX IF NOT EXISTS idx_code_submission_results_code_testcase_id ON code_submission_results(code_testcase_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_uploaded_by ON pdf_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_videos_upload_timestamp ON videos(upload_timestamp);
CREATE INDEX IF NOT EXISTS idx_videos_uploaded_by ON videos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_video_quiz_attempts_completed_at ON video_quiz_attempts(completed_at);
CREATE INDEX IF NOT EXISTS idx_video_quiz_attempts_student_id ON video_quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_video_quiz_attempts_video_id ON video_quiz_attempts(video_id);
CREATE INDEX IF NOT EXISTS idx_video_quiz_questions_timestamp ON video_quiz_questions(video_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_video_quiz_questions_video_id ON video_quiz_questions(video_id);
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_id ON admin_activities(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON admin_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activities_entity ON admin_activities(entity_type, entity_id);

-- Create neon_auth schema table
CREATE TABLE IF NOT EXISTS neon_auth.users_sync (
    raw_json JSONB NOT NULL,
    id TEXT PRIMARY KEY GENERATED ALWAYS AS ((raw_json ->> 'id'::text)) STORED,
    name TEXT GENERATED ALWAYS AS ((raw_json ->> 'display_name'::text)) STORED,
    email TEXT GENERATED ALWAYS AS ((raw_json ->> 'primary_email'::text)) STORED,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (to_timestamp((trunc((((raw_json ->> 'signed_up_at_millis'::text))::bigint)::double precision) / (1000)::double precision))) STORED,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_sync_deleted_at_idx ON neon_auth.users_sync(deleted_at);

-- Create view for student detailed progress
CREATE OR REPLACE VIEW student_detailed_progress AS
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
    asub.submitted_at,
    asub.final_score AS score,
    asub.status,
    asub.attempt,
    asub.graded_at,
    asub.comments,
    now() AS last_updated
FROM enrollments e
JOIN users u ON e.student_id = u.id
JOIN course_offerings co ON e.course_offering_id = co.id
JOIN courses c ON co.course_id = c.id
JOIN assignments a ON a.course_offering_id = co.id
LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = e.student_id
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
    NULL::integer AS attempt,
    NULL::timestamptz AS graded_at,
    NULL::text AS comments,
    now() AS last_updated
FROM enrollments e
JOIN users u ON e.student_id = u.id
JOIN course_offerings co ON e.course_offering_id = co.id
JOIN courses c ON co.course_id = c.id
JOIN quizzes q ON q.course_offering_id = co.id
LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = e.student_id
ORDER BY 3, 1, 6, 7;

COMMIT;