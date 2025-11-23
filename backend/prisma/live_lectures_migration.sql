-- Live lectures table for real-time video streaming sessions
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
  stream_key TEXT UNIQUE, -- Unique key for the stream
  recording_url TEXT, -- URL to recorded video if available
  max_participants INTEGER DEFAULT 100,
  is_recording BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Live lecture participants table
CREATE TABLE IF NOT EXISTS live_lecture_participants (
  id BIGSERIAL PRIMARY KEY,
  live_lecture_id BIGINT NOT NULL REFERENCES live_lectures(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'ta')),
  UNIQUE(live_lecture_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_lectures_course_offering_id ON live_lectures(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_live_lectures_created_by ON live_lectures(created_by);
CREATE INDEX IF NOT EXISTS idx_live_lectures_status ON live_lectures(status);
CREATE INDEX IF NOT EXISTS idx_live_lectures_scheduled_at ON live_lectures(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_lecture_participants_lecture_id ON live_lecture_participants(live_lecture_id);
CREATE INDEX IF NOT EXISTS idx_live_lecture_participants_user_id ON live_lecture_participants(user_id);