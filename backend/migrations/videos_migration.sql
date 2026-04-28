-- Videos table for storing video lecture metadata
CREATE TABLE IF NOT EXISTS videos (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  uploaded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL, -- Cloudinary secure URL
  duration NUMERIC(10,2), -- Duration in seconds (if available)
  cloudinary_public_id TEXT, -- Cloudinary public ID for management
  upload_timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Video quiz questions table for storing quiz questions associated with videos
CREATE TABLE IF NOT EXISTS video_quiz_questions (
  id BIGSERIAL PRIMARY KEY,
  video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'mcq', -- mcq, true_false, short_answer, etc.
  options JSONB, -- For MCQ: array of options
  correct_answer TEXT NOT NULL, -- For MCQ: option index or text, for true/false: 'true'/'false', for short answer: expected answer
  points NUMERIC(6,2) DEFAULT 1.0, -- Points for this question
  explanation TEXT, -- Explanation shown after answering
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_uploaded_by ON videos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_videos_upload_timestamp ON videos(upload_timestamp);
CREATE INDEX IF NOT EXISTS idx_videos_course_offering_id ON videos(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_video_quiz_questions_video_id ON video_quiz_questions(video_id);

