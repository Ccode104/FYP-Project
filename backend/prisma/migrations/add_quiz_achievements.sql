-- Add Quiz Performance Achievements
-- These achievements reward quiz performance, not proctoring compliance

INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points_reward, rarity) VALUES
('Quiz Taker', 'Complete your first quiz', '📝', 'quiz', 'quizzes_completed', 1, 15, 'common'),
('Quiz Master', 'Complete 10 quizzes', '🎓', 'quiz', 'quizzes_completed', 10, 75, 'common'),
('Quiz Champion', 'Complete 25 quizzes', '🏆', 'quiz', 'quizzes_completed', 25, 150, 'rare'),
('Perfect Score', 'Score 100% on a quiz', '💯', 'quiz', 'perfect_quiz_score', 1, 50, 'rare'),
('High Scorer', 'Score 90% or higher on 5 quizzes', '🎯', 'quiz', 'high_quiz_scores', 5, 100, 'rare'),
('Speed Quizzer', 'Complete a quiz in under 10 minutes', '⚡', 'quiz', 'fast_quiz_completion', 1, 30, 'common'),
('Consistent Performer', 'Maintain an average quiz score above 80%', '📊', 'quiz', 'consistent_quiz_performance', 1, 125, 'epic'),
('Quiz Streak', 'Complete quizzes for 7 consecutive days', '🔥', 'quiz', 'quiz_streak', 7, 200, 'epic'),
('Knowledge Seeker', 'Attempt quizzes from 5 different courses', '🌍', 'quiz', 'diverse_quiz_topics', 5, 75, 'rare'),
('Quick Thinker', 'Answer all questions correctly in under 5 minutes per question', '🧠', 'quiz', 'rapid_quiz_mastery', 1, 100, 'legendary')
ON CONFLICT (name) DO NOTHING;

-- Add quiz-related columns to user_gamification_stats if they don't exist
ALTER TABLE user_gamification_stats
ADD COLUMN IF NOT EXISTS quizzes_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS perfect_quiz_scores INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS high_quiz_scores INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fast_quiz_completions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_quiz_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_quiz_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quiz_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_quiz_date DATE,
ADD COLUMN IF NOT EXISTS unique_course_quizzes INTEGER DEFAULT 0;