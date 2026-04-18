-- Video Sections Migration: Add transcript & sections tables, link quizzes to sections

-- Add video_transcripts table
CREATE TABLE IF NOT EXISTS video_transcripts (
  id BIGSERIAL PRIMARY KEY,
  video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  full_transcript TEXT,
  word_timestamps JSONB, -- Optional: detailed timestamps
  language TEXT DEFAULT 'en',
  processed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(video_id)
);

-- Add video_sections table
CREATE TABLE IF NOT EXISTS video_sections (
  id BIGSERIAL PRIMARY KEY,
  video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  start_time NUMERIC(10,2),
  end_time NUMERIC(10,2),
  title TEXT NOT NULL,
  summary TEXT,
  transcript_snippet TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_sections_video ON video_sections(video_id);
CREATE INDEX IF NOT EXISTS idx_video_sections_time ON video_sections(start_time, end_time);

-- Add section_id to video_quiz_questions (nullable for migration)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'video_quiz_questions' AND column_name = 'section_id'
  ) THEN
    ALTER TABLE video_quiz_questions 
    ADD COLUMN section_id BIGINT REFERENCES video_sections(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_video_quiz_questions_section ON video_quiz_questions(section_id);
    
    RAISE NOTICE 'Added section_id to video_quiz_questions';
  ELSE
    RAISE NOTICE 'section_id already exists';
  END IF;
END $$;

-- Update existing questions: set section_id based on closest timestamp match (for migration)
UPDATE video_quiz_questions vqq
SET section_id = (
  SELECT vs.id 
  FROM video_sections vs 
  WHERE vs.video_id = vqq.video_id 
    AND (vqq.timestamp BETWEEN vs.start_time AND vs.end_time 
         OR vqq.timestamp IS NULL)
  ORDER BY ABS(COALESCE(vqq.timestamp, 0) - vs.start_time) ASC
  LIMIT 1
)
WHERE vqq.timestamp IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM video_sections vs WHERE vs.id = vqq.section_id);

RAISE NOTICE 'Migration completed. Run after sections are processed for existing videos.';

