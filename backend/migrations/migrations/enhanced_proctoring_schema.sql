-- Enhanced Proctoring Schema Migration
-- Adds comprehensive proctoring tables for real-time monitoring

-- Proctoring sessions table
CREATE TABLE IF NOT EXISTS proctoring_sessions (
  id BIGSERIAL PRIMARY KEY,
  quiz_attempt_id BIGINT REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  device_info JSONB,
  browser_info JSONB,
  session_token VARCHAR(255) UNIQUE,
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, completed, terminated
  webcam_enabled BOOLEAN DEFAULT false,
  screen_monitoring_enabled BOOLEAN DEFAULT false,
  audio_monitoring_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Detailed violation logs table
CREATE TABLE IF NOT EXISTS proctoring_violations (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
  violation_type VARCHAR(50) NOT NULL, -- fullscreen_exit, tab_switch, face_not_detected, multiple_faces, etc.
  severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 4), -- 1=warning, 2=minor, 3=major, 4=critical
  timestamp TIMESTAMPTZ DEFAULT now(),
  evidence_data JSONB, -- screenshots, audio data, etc.
  evidence_url TEXT, -- URL to stored evidence files
  description TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by BIGINT REFERENCES users(id), -- teacher/admin who resolved
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Proctoring configurations table
CREATE TABLE IF NOT EXISTS proctoring_configs (
  id BIGSERIAL PRIMARY KEY,
  quiz_id BIGINT REFERENCES quizzes(id) ON DELETE CASCADE,
  name VARCHAR(100) DEFAULT 'Default Configuration',
  webcam_required BOOLEAN DEFAULT true,
  screen_monitoring BOOLEAN DEFAULT true,
  audio_monitoring BOOLEAN DEFAULT false,
  face_detection_required BOOLEAN DEFAULT true,
  max_warnings INTEGER DEFAULT 3,
  auto_suspend_severity INTEGER DEFAULT 3, -- severity level that triggers auto-suspension
  allow_recovery BOOLEAN DEFAULT true, -- allow student to continue after warnings
  recovery_wait_seconds INTEGER DEFAULT 30, -- wait time before allowing recovery
  violation_score_penalty DECIMAL(5,2) DEFAULT 1.0, -- multiplier for score penalty (1.0 = zero score)
  suspension_requires_teacher BOOLEAN DEFAULT true, -- require teacher intervention for suspension
  live_monitoring_enabled BOOLEAN DEFAULT false, -- enable real-time monitoring dashboard
  record_sessions BOOLEAN DEFAULT true, -- store session recordings
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quiz_id)
);

-- Proctoring analytics table for reporting
CREATE TABLE IF NOT EXISTS proctoring_analytics (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
  total_violations INTEGER DEFAULT 0,
  violations_by_type JSONB DEFAULT '{}',
  violations_by_severity JSONB DEFAULT '{}',
  session_duration_seconds INTEGER,
  compliance_score DECIMAL(5,2), -- 0-100 score based on violations
  risk_level VARCHAR(20), -- low, medium, high, critical
  flagged_for_review BOOLEAN DEFAULT false,
  reviewed_by BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_quiz_attempt ON proctoring_sessions(quiz_attempt_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_student ON proctoring_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_status ON proctoring_sessions(status);
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_session ON proctoring_violations(session_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_type ON proctoring_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_severity ON proctoring_violations(severity);
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_timestamp ON proctoring_violations(timestamp);
CREATE INDEX IF NOT EXISTS idx_proctoring_configs_quiz ON proctoring_configs(quiz_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_analytics_session ON proctoring_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_analytics_risk_level ON proctoring_analytics(risk_level);

-- Update existing quiz_attempts table to link with proctoring sessions
ALTER TABLE quiz_attempts
ADD COLUMN IF NOT EXISTS proctoring_session_id BIGINT REFERENCES proctoring_sessions(id),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resumed_by BIGINT REFERENCES users(id);

-- Update quizzes table to support enhanced proctoring
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS proctoring_config_id BIGINT REFERENCES proctoring_configs(id),
ADD COLUMN IF NOT EXISTS allow_suspension_resume BOOLEAN DEFAULT true;