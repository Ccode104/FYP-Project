-- Add resume requests table for student resume requests
CREATE TABLE IF NOT EXISTS resume_requests (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES users(id),
  quiz_attempt_id BIGINT REFERENCES quiz_attempts(id),
  proctoring_session_id BIGINT REFERENCES proctoring_sessions(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  requested_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  response_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quiz_attempt_id), -- One request per attempt
  CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resume_requests_student ON resume_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_resume_requests_attempt ON resume_requests(quiz_attempt_id);
CREATE INDEX IF NOT EXISTS idx_resume_requests_session ON resume_requests(proctoring_session_id);
CREATE INDEX IF NOT EXISTS idx_resume_requests_status ON resume_requests(status);