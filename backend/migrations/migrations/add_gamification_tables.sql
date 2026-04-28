-- Migration: Add Gamification Tables
-- This migration adds comprehensive gamification features including difficulty levels,
-- points system, achievements, leaderboards, and enhanced time tracking

-- Add difficulty levels to code_questions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_level') THEN
    CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
  END IF;
END $$;

ALTER TABLE code_questions
ADD COLUMN IF NOT EXISTS difficulty difficulty_level DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER DEFAULT 1800, -- 30 minutes default
ADD COLUMN IF NOT EXISTS max_points INTEGER DEFAULT 100;

-- Add time tracking to code_submissions
ALTER TABLE code_submissions
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER,
ADD COLUMN IF NOT EXISTS gamified_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attempts_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS efficiency_score DECIMAL(5,2) DEFAULT 0;

-- User gamification stats table
CREATE TABLE IF NOT EXISTS user_gamification_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  UNIQUE(user_id)
);

-- Achievement definitions table
CREATE TABLE IF NOT EXISTS achievements (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT, -- URL or icon identifier
  category TEXT NOT NULL, -- 'solving', 'speed', 'streak', 'consistency', etc.
  requirement_type TEXT NOT NULL, -- 'problems_solved', 'streak', 'time', 'points', etc.
  requirement_value INTEGER NOT NULL,
  points_reward INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id BIGINT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Leaderboards table
CREATE TABLE IF NOT EXISTS leaderboards (
  id BIGSERIAL PRIMARY KEY,
  leaderboard_type TEXT NOT NULL, -- 'assignment', 'course', 'global', 'weekly', 'monthly'
  reference_id BIGINT, -- assignment_id or course_id depending on type
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  rank INTEGER,
  time_spent_seconds INTEGER,
  submission_date TIMESTAMPTZ DEFAULT now(),
  period_start DATE, -- for time-based leaderboards
  period_end DATE,
  UNIQUE(leaderboard_type, reference_id, user_id, period_start)
);

-- Daily challenges table
CREATE TABLE IF NOT EXISTS daily_challenges (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  question_id BIGINT NOT NULL REFERENCES code_questions(id),
  bonus_points INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User daily challenge completions
CREATE TABLE IF NOT EXISTS user_daily_challenges (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id BIGINT NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  points_earned INTEGER DEFAULT 0,
  time_spent_seconds INTEGER,
  UNIQUE(user_id, challenge_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_gamification_stats_user_id ON user_gamification_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_type_reference ON leaderboards(leaderboard_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_user_period ON leaderboards(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_code_submissions_started_completed ON code_submissions(started_at, completed_at);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(date);
CREATE INDEX IF NOT EXISTS idx_user_daily_challenges_user ON user_daily_challenges(user_id);

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points_reward, rarity) VALUES
('First Solve', 'Solve your first coding problem', '🎯', 'solving', 'problems_solved', 1, 10, 'common'),
('Problem Solver', 'Solve 10 coding problems', '🧠', 'solving', 'problems_solved', 10, 50, 'common'),
('Code Master', 'Solve 50 coding problems', '👑', 'solving', 'problems_solved', 50, 200, 'rare'),
('Speed Demon', 'Solve a problem in under 5 minutes', '⚡', 'speed', 'fast_solve', 1, 25, 'rare'),
('Streak Starter', 'Maintain a 7-day solving streak', '🔥', 'streak', 'streak', 7, 75, 'rare'),
('Consistency King', 'Maintain a 30-day solving streak', '👑', 'streak', 'streak', 30, 300, 'epic'),
('Easy Conqueror', 'Solve 10 easy problems', '🟢', 'solving', 'easy_solved', 10, 30, 'common'),
('Medium Master', 'Solve 10 medium problems', '🟡', 'solving', 'medium_solved', 10, 75, 'rare'),
('Hard Hero', 'Solve 5 hard problems', '🔴', 'solving', 'hard_solved', 5, 150, 'epic'),
('Perfect Score', 'Get 100% on a problem with optimal solution', '💎', 'efficiency', 'perfect_solve', 1, 100, 'legendary'),
('Early Bird', 'Solve the daily challenge', '🌅', 'daily', 'daily_challenge', 1, 25, 'common'),
('Challenge Champion', 'Solve 7 daily challenges in a week', '🏆', 'daily', 'daily_challenge', 7, 100, 'rare')
ON CONFLICT (name) DO NOTHING;