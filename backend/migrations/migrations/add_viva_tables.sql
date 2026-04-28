-- Viva (oral examination) tables

-- Viva sessions table
CREATE TABLE IF NOT EXISTS viva_sessions (
  id BIGSERIAL PRIMARY KEY,
  course_offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  max_students INTEGER DEFAULT 1,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Viva participants (students scheduled for viva)
CREATE TABLE IF NOT EXISTS viva_participants (
  id BIGSERIAL PRIMARY KEY,
  viva_session_id BIGINT NOT NULL REFERENCES viva_sessions(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_order INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'absent', 'cancelled')),
  notes TEXT,
  UNIQUE(viva_session_id, student_id)
);

-- Viva grades/results
CREATE TABLE IF NOT EXISTS viva_grades (
  id BIGSERIAL PRIMARY KEY,
  viva_participant_id BIGINT NOT NULL REFERENCES viva_participants(id) ON DELETE CASCADE,
  grader_id BIGINT NOT NULL REFERENCES users(id),
  score NUMERIC(6,2),
  max_score NUMERIC(6,2) DEFAULT 100,
  feedback TEXT,
  graded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(viva_participant_id, grader_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_viva_sessions_offering ON viva_sessions(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_viva_sessions_scheduled ON viva_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_viva_participants_session ON viva_participants(viva_session_id);
CREATE INDEX IF NOT EXISTS idx_viva_participants_student ON viva_participants(student_id);
CREATE INDEX IF NOT EXISTS idx_viva_grades_participant ON viva_grades(viva_participant_id);