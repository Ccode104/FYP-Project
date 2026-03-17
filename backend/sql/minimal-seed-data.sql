-- Minimal Seed Data for LMS Testing
-- This script provides essential test data for core LMS features

-- Insert departments
INSERT INTO departments (code, name) VALUES
('CSE', 'Computer Science and Engineering'),
('ECE', 'Electronics and Communication Engineering')
ON CONFLICT (code) DO NOTHING;

-- Insert users
INSERT INTO users (email, name, role, department_id, roll_number, password_hash, is_active, created_at, updated_at) VALUES
-- Admins
('admin@lms.edu', 'System Admin', 'admin', 1, NULL, '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
-- Faculty
('faculty1@lms.edu', 'Dr. Alice Johnson', 'faculty', 1, NULL, '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
-- Students
('student1@lms.edu', 'Alice Student', 'student', 1, 'CS2024001', '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('student2@lms.edu', 'Bob Student', 'student', 1, 'CS2024002', '$2b$10$dummy.hash.for.demo', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert admin records
INSERT INTO admins (user_id, is_super, created_at, created_by) VALUES
(1, true, NOW(), 1)
ON CONFLICT (user_id) DO NOTHING;

-- Insert courses
INSERT INTO courses (code, title, description, department_id, credits, created_at) VALUES
('CS101', 'Introduction to Programming', 'Basic programming concepts using Python', 1, 4, NOW()),
('CS201', 'Data Structures and Algorithms', 'Advanced data structures and algorithm design', 1, 4, NOW())
ON CONFLICT (code) DO NOTHING;

-- Insert course offerings
INSERT INTO course_offerings (course_id, term, section, faculty_id, max_capacity, start_date, end_date, created_at) VALUES
(1, 'Fall 2024', 'A', 2, 50, '2024-08-15', '2024-12-15', NOW()),
(2, 'Fall 2024', 'A', 2, 40, '2024-08-15', '2024-12-15', NOW())
ON CONFLICT (course_id, term, section) DO NOTHING;

-- Insert enrollments
INSERT INTO enrollments (course_offering_id, student_id, enrolled_at, status) VALUES
(1, 3, NOW(), 'active'),
(1, 4, NOW(), 'active'),
(2, 3, NOW(), 'active')
ON CONFLICT (course_offering_id, student_id) DO NOTHING;

-- Insert assignments
INSERT INTO assignments (course_offering_id, title, description, assignment_type, release_at, due_at, max_score, allow_multiple_submissions, created_by, created_at) VALUES
(1, 'Hello World Program', 'Write a simple program that prints "Hello, World!" in Python', 'code', NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days', 100, false, 2, NOW()),
(2, 'Sorting Algorithms', 'Implement bubble sort and quick sort algorithms', 'code', NOW() - INTERVAL '5 days', NOW() + INTERVAL '5 days', 100, false, 2, NOW())
ON CONFLICT DO NOTHING;

-- Insert assignment submissions
INSERT INTO assignment_submissions (assignment_id, student_id, submitted_at, status, final_score, grader_id, graded_at, comments, attempt) VALUES
(1, 3, NOW() - INTERVAL '3 days', 'graded', 95, 2, NOW() - INTERVAL '2 days', 'Excellent work! Clean code and good comments.', 1),
(1, 4, NOW() - INTERVAL '4 days', 'graded', 88, 2, NOW() - INTERVAL '3 days', 'Good implementation but could use more comments.', 1)
ON CONFLICT DO NOTHING;

-- Insert quizzes
INSERT INTO quizzes (course_offering_id, title, start_at, end_at, max_score, is_proctored, time_limit, allow_suspension_resume, created_at) VALUES
(1, 'Python Basics Quiz', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 50, false, 30, true, NOW()),
(2, 'Algorithm Analysis Quiz', NOW() + INTERVAL '1 day', NOW() + INTERVAL '8 days', 100, false, 60, true, NOW())
ON CONFLICT DO NOTHING;

-- Insert quiz questions
INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata) VALUES
(1, 'What is the output of print(2 + 3)?', 'mcq', '{"options": ["5", "23", "2+3", "Error"], "correct_answer": "5", "points": 5}'),
(1, 'Which of the following is a valid Python variable name?', 'mcq', '{"options": ["2variable", "variable-name", "variable_name", "_variable"], "correct_answer": "_variable", "points": 5}')
ON CONFLICT DO NOTHING;

-- Insert quiz attempts
INSERT INTO quiz_attempts (quiz_id, student_id, started_at, finished_at, score, answers, violated) VALUES
(1, 3, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '25 minutes', 10, '{"1": "5", "2": "_variable"}', false),
(1, 4, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', 5, '{"1": "5", "2": "variable_name"}', false)
ON CONFLICT DO NOTHING;

-- Insert basic gamification data
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points_reward, rarity, is_active, created_at) VALUES
('First Submission', 'Submit your first assignment', '🎯', 'progress', 'submissions', 1, 10, 'common', true, NOW()),
('Problem Solver', 'Solve 10 coding problems', '🧠', 'coding', 'problems_solved', 10, 50, 'common', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert user achievements
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES
(3, 1, NOW() - INTERVAL '5 days'),
(4, 1, NOW() - INTERVAL '4 days')
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Insert user gamification stats
INSERT INTO user_gamification_stats (user_id, total_points, current_streak, longest_streak, problems_solved, easy_solved, medium_solved, hard_solved, total_submissions, successful_submissions, average_time_seconds, last_submission_date, level, experience_points, quizzes_completed, perfect_quiz_scores, high_quiz_scores, fast_quiz_completions, total_quiz_score, average_quiz_score, quiz_streak, last_quiz_date, unique_course_quizzes) VALUES
(3, 105, 2, 3, 5, 4, 1, 0, 8, 7, 1200, CURRENT_DATE, 2, 320, 2, 0, 1, 1, 60, 30.0, 1, CURRENT_DATE, 2),
(4, 58, 1, 1, 3, 3, 0, 0, 5, 4, 1500, CURRENT_DATE - INTERVAL '1 day', 1, 180, 1, 0, 0, 0, 25, 25.0, 0, CURRENT_DATE - INTERVAL '2 days', 1)
ON CONFLICT (user_id) DO NOTHING;

-- Insert notifications
INSERT INTO notifications (user_id, title, body, is_read, created_at) VALUES
(3, 'Assignment Graded', 'Your submission for "Hello World Program" has been graded. Score: 95/100', true, NOW() - INTERVAL '2 days'),
(4, 'Assignment Graded', 'Your submission for "Hello World Program" has been graded. Score: 88/100', true, NOW() - INTERVAL '3 days'),
(3, 'Achievement Unlocked', 'Congratulations! You unlocked the "First Submission" achievement', true, NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;

COMMIT;

