/**
 * Migration: Add AI-Enhanced Code Editor Tables
 * This migration creates tables for:
 * - Code complexity analysis logging
 * - Logical bug injection tracking
 * - AI query logging and rate limiting
 */

-- Code Analysis Logs Table
CREATE TABLE IF NOT EXISTS code_analysis_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES code_questions(id) ON DELETE CASCADE,
  code_hash VARCHAR(255),
  time_complexity VARCHAR(50),
  space_complexity VARCHAR(50),
  analysis TEXT,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_code_analysis_user ON code_analysis_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_code_analysis_question ON code_analysis_logs(question_id);

-- Logical Bug Injection Tracking Table
CREATE TABLE IF NOT EXISTS logical_bug_injections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES code_questions(id) ON DELETE CASCADE,
  original_code VARCHAR(255),
  modified_code VARCHAR(255),
  bug_type VARCHAR(50),
  bug_description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bug_injection_user ON logical_bug_injections(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_injection_question ON logical_bug_injections(question_id);

-- AI Query Logs Table (for rate limiting and analytics)
CREATE TABLE IF NOT EXISTS ai_query_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES code_questions(id) ON DELETE SET NULL,
  query_type VARCHAR(50),
  code_hash VARCHAR(255),
  response_preview TEXT,
  contest_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_query_user ON ai_query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_query_question ON ai_query_logs(question_id);
CREATE INDEX IF NOT EXISTS idx_ai_query_date ON ai_query_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_query_user_date ON ai_query_logs(user_id, created_at);

-- Contest Editor Settings Table (optional, for storing user preferences)
CREATE TABLE IF NOT EXISTS contest_editor_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  ai_enabled BOOLEAN DEFAULT true,
  distraction_mode BOOLEAN DEFAULT false,
  max_ai_queries INTEGER DEFAULT 15,
  theme VARCHAR(20) DEFAULT 'dark',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, contest_id)
);

CREATE INDEX IF NOT EXISTS idx_contest_settings_user ON contest_editor_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_settings_contest ON contest_editor_settings(contest_id);
