-- Migration to add timestamp field to video_quiz_questions and create video_quiz_attempts table

-- Add timestamp column to video_quiz_questions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'video_quiz_questions' 
    AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE video_quiz_questions 
    ADD COLUMN timestamp NUMERIC(10,2); -- Timestamp in seconds where question appears
    
    CREATE INDEX IF NOT EXISTS idx_video_quiz_questions_timestamp ON video_quiz_questions(video_id, timestamp);
    
    RAISE NOTICE 'Added timestamp column to video_quiz_questions table';
  ELSE
    RAISE NOTICE 'Column timestamp already exists in video_quiz_questions table';
  END IF;
END$$;

-- Create video_quiz_attempts table to track student attempts
CREATE TABLE IF NOT EXISTS video_quiz_attempts (
  id BIGSERIAL PRIMARY KEY,
  video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  score NUMERIC(6,2), -- Final score
  max_score NUMERIC(6,2), -- Maximum possible score
  answers JSONB, -- Student answers: { question_id: { answer: "...", is_correct: true/false, points_earned: 1.0 } }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(video_id, student_id) -- One attempt per student per video
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_quiz_attempts_video_id ON video_quiz_attempts(video_id);
CREATE INDEX IF NOT EXISTS idx_video_quiz_attempts_student_id ON video_quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_video_quiz_attempts_completed_at ON video_quiz_attempts(completed_at);

