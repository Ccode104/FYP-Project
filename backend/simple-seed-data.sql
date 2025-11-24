-- Simple Seed Data for LMS Testing
-- Basic data to test core LMS functionality

-- Insert departments
INSERT INTO departments (code, name) VALUES
('CSE', 'Computer Science and Engineering'),
('ECE', 'Electronics and Communication Engineering')
ON CONFLICT (code) DO NOTHING;

-- Insert users
INSERT INTO users (email, name, role, department_id, roll_number, password_hash, is_active, created_at, updated_at) VALUES
('admin@lms.edu', 'System Admin', 'admin', 1, NULL, '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('faculty1@lms.edu', 'Dr. Alice Johnson', 'faculty', 1, NULL, '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('ta1@lms.edu', 'John TA', 'ta', 1, NULL, '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
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

-- Insert faculty course assignments
INSERT INTO faculty_courses (course_id, faculty_id, assigned_at) VALUES
(1, 2, NOW()),
(2, 2, NOW())
ON CONFLICT (course_id, faculty_id) DO NOTHING;

-- Insert faculty course offering assignments
INSERT INTO faculty_course_offerings (course_offering_id, faculty_id, assigned_at) VALUES
(1, 2, NOW()),
(2, 2, NOW())
ON CONFLICT (course_offering_id, faculty_id) DO NOTHING;

-- Insert TA assignments
INSERT INTO ta_assignments (course_offering_id, ta_id, role, assigned_at) VALUES
(1, 3, 'ta', NOW())
ON CONFLICT (course_offering_id, ta_id) DO NOTHING;

-- Insert enrollments
INSERT INTO enrollments (course_offering_id, student_id, enrolled_at, status) VALUES
(1, 4, NOW(), 'active'),
(1, 5, NOW(), 'active'),
(2, 4, NOW(), 'active')
ON CONFLICT (course_offering_id, student_id) DO NOTHING;

-- Note: Assignments and quizzes will be added separately after basic data is inserted

-- Note: Assignment submissions will be added after assignments are successfully inserted

-- Note: Code questions and submissions will be added after assignments are created

-- Insert basic gamification data
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points_reward, rarity, is_active, created_at) VALUES
('First Submission', 'Submit your first assignment', '🎯', 'progress', 'submissions', 1, 10, 'common', true, NOW()),
('Problem Solver', 'Solve 10 coding problems', '🧠', 'coding', 'problems_solved', 10, 50, 'common', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert user achievements
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES
(4, 1, NOW() - INTERVAL '5 days'),
(5, 1, NOW() - INTERVAL '4 days')
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Insert user gamification stats
INSERT INTO user_gamification_stats (user_id, total_points, current_streak, longest_streak, problems_solved, easy_solved, medium_solved, hard_solved, total_submissions, successful_submissions, average_time_seconds, last_submission_date, level, experience_points, quizzes_completed, perfect_quiz_scores, high_quiz_scores, fast_quiz_completions, total_quiz_score, average_quiz_score, quiz_streak, last_quiz_date, unique_course_quizzes) VALUES
(4, 105, 2, 3, 5, 4, 1, 0, 6, 6, 1200, CURRENT_DATE, 2, 350, 2, 0, 1, 1, 95, 47.5, 1, CURRENT_DATE, 2),
(5, 58, 1, 1, 3, 2, 1, 0, 4, 4, 1500, CURRENT_DATE - INTERVAL '1 day', 1, 180, 1, 0, 0, 0, 40, 40.0, 0, CURRENT_DATE - INTERVAL '2 days', 1)
ON CONFLICT (user_id) DO NOTHING;

-- Insert support tickets
INSERT INTO support_tickets (user_id, title, description, category, status, priority, assigned_to, course_offering_id, created_at, updated_at) VALUES
(4, 'Cannot submit programming assignment', 'Getting 403 error when trying to submit assignment #1. The submit button is disabled.', 'bug_report', 'open', 'high', NULL, 1, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
(5, 'Quiz timer not working properly', 'The quiz timer shows incorrect remaining time and sometimes counts backwards.', 'bug_report', 'in_progress', 'medium', 2, 1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 hours')
ON CONFLICT DO NOTHING;

-- Insert ticket comments
INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal, created_at) VALUES
(2, 2, 'We are investigating the timer issue. It appears to be related to timezone settings.', true, NOW() - INTERVAL '4 hours'),
(2, 5, 'Thanks for looking into this. The timer was showing negative time during my last quiz attempt.', false, NOW() - INTERVAL '3 hours')
ON CONFLICT DO NOTHING;

-- Insert messages
INSERT INTO messages (sender_id, receiver_id, subject, content, is_read, sent_at, created_at) VALUES
(2, 4, 'Assignment Feedback', 'Great work on your first assignment! Your code structure is excellent.', true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(4, 2, 'Question about Assignment 2', 'I have a question about the requirements for assignment 2. Can we discuss?', false, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Insert notifications
INSERT INTO notifications (user_id, title, body, is_read, created_at) VALUES
(4, 'Assignment Graded', 'Your submission for "Hello World Program" has been graded. Score: 95/100', true, NOW() - INTERVAL '2 days'),
(4, 'New Assignment Available', 'A new assignment "Sorting Algorithms" is now available in CS201', false, NOW() - INTERVAL '3 days'),
(5, 'Quiz Reminder', 'Your quiz "Python Basics Quiz" starts in 2 hours', false, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Insert study materials
INSERT INTO study_materials (department_id, course_id, title, description, category, material, storage_path, filename, uploaded_by, created_at, updated_at) VALUES
(1, 1, 'Python Programming Cheat Sheet', 'Quick reference guide for Python syntax and common operations', 'Reference', 'notes', '/materials/python-cheat-sheet.pdf', 'python-cheat-sheet.pdf', 2, NOW(), NOW()),
(1, 2, 'Data Structures Visual Guide', 'Visual explanations of common data structures', 'Study Aid', 'presentation', '/materials/ds-visual-guide.pptx', 'ds-visual-guide.pptx', 2, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert discussion messages
INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content, created_at) VALUES
(1, 4, NULL, 'Can someone explain the difference between lists and tuples in Python?', NOW() - INTERVAL '2 days'),
(1, 5, 1, 'Lists are mutable (can be changed) while tuples are immutable (cannot be changed after creation).', NOW() - INTERVAL '2 days' + INTERVAL '30 minutes'),
(1, 4, 1, 'Thanks for the explanations! That makes sense.', NOW() - INTERVAL '2 days' + INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

COMMIT;