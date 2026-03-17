-- Simple Test Seed Data for LMS Features Testing
-- Focused on DummyStudent, DummyTA, DummyTeacher, and DummyAdmin

-- Create a test course
INSERT INTO courses (code, title, description, department_id, credits, created_at) VALUES
('LMS101', 'LMS Feature Testing Course', 'Course for testing all LMS features and functionality', 11, 3, NOW())
ON CONFLICT (code) DO NOTHING;

-- Create course offering
INSERT INTO course_offerings (course_id, term, section, faculty_id, max_capacity, start_date, end_date, created_at) VALUES
((SELECT id FROM courses WHERE code = 'LMS101'), 'Fall 2024', 'TEST', 33, 50, '2024-08-15', '2024-12-15', NOW())
ON CONFLICT (course_id, term, section) DO NOTHING;

-- Enroll DummyStudent
INSERT INTO enrollments (course_offering_id, student_id, enrolled_at, status) VALUES
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'LMS101')), 38, NOW(), 'active')
ON CONFLICT (course_offering_id, student_id) DO NOTHING;

-- Assign DummyTA
INSERT INTO ta_assignments (course_offering_id, ta_id, role, assigned_at) VALUES
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'LMS101')), 53, 'ta', NOW())
ON CONFLICT (course_offering_id, ta_id) DO NOTHING;

-- Create assignments
INSERT INTO assignments (course_offering_id, title, description, assignment_type, release_at, due_at, max_score, created_by, created_at) VALUES
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'LMS101')), 'Test Assignment', 'Basic assignment for testing', 'code', NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days', 100, 33, NOW())
ON CONFLICT DO NOTHING;

-- Create assignment submission
INSERT INTO assignment_submissions (assignment_id, student_id, submitted_at, status, final_score, grader_id, graded_at, comments) VALUES
((SELECT id FROM assignments WHERE title = 'Test Assignment'), 38, NOW() - INTERVAL '2 hours', 'graded', 95, 33, NOW() - INTERVAL '1 hour', 'Good work!')
ON CONFLICT DO NOTHING;

-- Create quiz
INSERT INTO quizzes (course_offering_id, title, start_at, end_at, max_score, is_proctored, time_limit) VALUES
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'LMS101')), 'Test Quiz', NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days', 50, true, 30)
ON CONFLICT DO NOTHING;

-- Create quiz question
INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata) VALUES
((SELECT id FROM quizzes WHERE title = 'Test Quiz'), 'What is 2+2?', 'mcq', '{"options": ["3", "4", "5", "6"], "correct_answer": "4", "points": 10}')
ON CONFLICT DO NOTHING;

-- Create quiz attempt
INSERT INTO quiz_attempts (quiz_id, student_id, started_at, finished_at, score, answers) VALUES
((SELECT id FROM quizzes WHERE title = 'Test Quiz'), 38, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '10 hours', 50, '{"1": "4"}')
ON CONFLICT DO NOTHING;

-- Create proctoring config
INSERT INTO proctoring_configs (quiz_id, name, webcam_required, screen_monitoring, created_by, created_at) VALUES
((SELECT id FROM quizzes WHERE title = 'Test Quiz'), 'Test Proctoring', true, true, 33, NOW())
ON CONFLICT (quiz_id) DO NOTHING;

-- Create proctoring session
INSERT INTO proctoring_sessions (quiz_attempt_id, student_id, started_at, ended_at, status, webcam_enabled, screen_monitoring_enabled) VALUES
((SELECT id FROM quiz_attempts WHERE quiz_id = (SELECT id FROM quizzes WHERE title = 'Test Quiz')), 38, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '10 hours', 'completed', true, true)
ON CONFLICT DO NOTHING;

-- Create support ticket
INSERT INTO support_tickets (user_id, title, description, category, status, priority, assigned_to, course_offering_id, created_at) VALUES
(38, 'Test Issue', 'Testing support ticket system', 'bug_report', 'open', 'medium', 53, (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'LMS101')), NOW())
ON CONFLICT DO NOTHING;

-- Create notification
INSERT INTO notifications (user_id, title, body, is_read, created_at) VALUES
(38, 'Test Notification', 'This is a test notification', false, NOW())
ON CONFLICT DO NOTHING;

-- Create message
INSERT INTO messages (sender_id, receiver_id, subject, content, is_read, sent_at) VALUES
(33, 38, 'Test Message', 'This is a test message from teacher to student', false, NOW())
ON CONFLICT DO NOTHING;

COMMIT;

