-- Seed dummy data for LMS enhancements
-- Run this after applying all migrations

-- Insert sample rubrics
INSERT INTO rubrics (title, description, course_offering_id, created_by, created_at, updated_at) VALUES
('Programming Assignment Rubric', 'Comprehensive evaluation of coding assignments', 1, 1, NOW(), NOW()),
('Project Presentation Rubric', 'Evaluation criteria for project presentations', 1, 1, NOW(), NOW()),
('Quiz Performance Rubric', 'Assessment of quiz understanding and application', 2, 2, NOW(), NOW());

-- Insert rubric criteria
INSERT INTO rubric_criteria (rubric_id, title, description, max_points, weight, position, created_at) VALUES
-- Programming Assignment Rubric (ID: 1)
(1, 'Code Correctness', 'Program produces correct output and handles edge cases', 25, 1.0, 1, NOW()),
(1, 'Code Quality', 'Clean, readable, and well-structured code', 20, 0.8, 2, NOW()),
(1, 'Documentation', 'Proper comments and documentation', 15, 0.6, 3, NOW()),
(1, 'Efficiency', 'Optimal algorithm choice and implementation', 20, 0.8, 4, NOW()),
(1, 'Testing', 'Comprehensive test cases and validation', 20, 0.8, 5, NOW()),

-- Project Presentation Rubric (ID: 2)
(2, 'Content Knowledge', 'Demonstrates deep understanding of the topic', 25, 1.0, 1, NOW()),
(2, 'Presentation Skills', 'Clear communication and professional delivery', 20, 0.8, 2, NOW()),
(2, 'Visual Aids', 'Effective use of slides and demonstrations', 15, 0.6, 3, NOW()),
(2, 'Q&A Handling', 'Ability to answer questions effectively', 20, 0.8, 4, NOW()),
(2, 'Time Management', 'Stays within allotted time frame', 20, 0.8, 5, NOW()),

-- Quiz Performance Rubric (ID: 3)
(3, 'Conceptual Understanding', 'Demonstrates grasp of core concepts', 30, 1.0, 1, NOW()),
(3, 'Problem Solving', 'Applies concepts to solve problems', 25, 0.8, 2, NOW()),
(3, 'Accuracy', 'Correct application of formulas and methods', 25, 0.8, 3, NOW()),
(3, 'Explanation', 'Clear reasoning and justification', 20, 0.7, 4, NOW());

-- Assign rubrics to assignments (using the IDs that were just inserted)
-- We'll do this after creating assignments to ensure correct IDs

-- Insert sample viva sessions
INSERT INTO viva_sessions (course_offering_id, title, description, scheduled_at, duration_minutes, max_students, status, created_by, created_at, updated_at) VALUES
(1, 'Data Structures Viva', 'Oral examination on data structures and algorithms', NOW() + INTERVAL '2 days', 30, 2, 'scheduled', 1, NOW(), NOW()),
(1, 'Programming Concepts Viva', 'Assessment of core programming concepts', NOW() + INTERVAL '5 days', 45, 3, 'scheduled', 2, NOW(), NOW()),
(2, 'Database Systems Viva', 'Oral exam on database design and SQL', NOW() + INTERVAL '1 week', 30, 2, 'scheduled', 1, NOW(), NOW());

-- Insert viva participants
INSERT INTO viva_participants (viva_session_id, student_id, scheduled_order, status, notes) VALUES
(1, 3, 1, 'scheduled', 'Strong in algorithms'),
(1, 4, 2, 'scheduled', 'Needs practice in data structures'),
(2, 3, 1, 'scheduled', NULL),
(2, 4, 2, 'scheduled', NULL),
(2, 5, 3, 'scheduled', 'Advanced student'),
(3, 6, 1, 'scheduled', NULL),
(3, 7, 2, 'scheduled', NULL);

-- Insert viva grades (for completed sessions)
INSERT INTO viva_grades (viva_participant_id, grader_id, score, feedback, graded_at) VALUES
(1, 1, 85, 'Excellent understanding of algorithms. Could improve explanation of time complexity.', NOW()),
(2, 1, 78, 'Good grasp of basic concepts. Needs more practice with advanced data structures.', NOW());

-- Insert sample support tickets
INSERT INTO support_tickets (user_id, title, description, category, status, priority, assigned_to, course_offering_id, created_at, updated_at) VALUES
(3, 'Cannot submit programming assignment', 'Getting 403 error when trying to submit assignment #1. The submit button is disabled.', 'bug_report', 'open', 'high', NULL, 1, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
(4, 'Quiz timer not working properly', 'The quiz timer shows incorrect remaining time and sometimes counts backwards.', 'bug_report', 'in_progress', 'medium', 1, 1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 hours'),
(5, 'Feature request: Dark mode toggle', 'Please add a dark mode option to reduce eye strain during long study sessions.', 'feature_request', 'open', 'low', NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(6, 'Video lecture buffering issues', 'Videos buffer frequently and quality degrades on slower connections.', 'technical_issue', 'resolved', 'medium', 2, 2, NOW() - INTERVAL '1 week', NOW() - INTERVAL '2 days'),
(3, 'Grade not visible for assignment #2', 'Submitted assignment 2 days ago but grade is still not visible in my dashboard.', 'technical_issue', 'open', 'medium', NULL, 1, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
(7, 'Request for code review feedback', 'It would be helpful to get more detailed code review comments instead of just grades.', 'feature_request', 'open', 'low', NULL, NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days');

-- Insert ticket comments
INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal, created_at) VALUES
(2, 1, 'We are investigating the timer issue. It appears to be related to timezone settings.', true, NOW() - INTERVAL '4 hours'),
(2, 4, 'Thanks for looking into this. The timer was showing negative time during my last quiz attempt.', false, NOW() - INTERVAL '3 hours'),
(4, 2, 'We have optimized the video streaming settings. Please try again and let us know if the issue persists.', false, NOW() - INTERVAL '2 days'),
(4, 6, 'The buffering issue seems to be resolved. Videos are loading much faster now. Thank you!', false, NOW() - INTERVAL '1 day');

-- Insert sample rubric grades (for demonstration)
INSERT INTO rubric_grades (submission_id, criterion_id, score, feedback, graded_by, graded_at) VALUES
(1, 1, 22, 'Good implementation but missed edge case handling', 1, NOW()),
(1, 2, 18, 'Code is readable but could use better variable naming', 1, NOW()),
(1, 3, 12, 'Missing docstrings for functions', 1, NOW()),
(1, 4, 18, 'Algorithm is correct but not optimal', 1, NOW()),
(1, 5, 16, 'Basic test cases covered but missing edge cases', 1, NOW());

-- Update assignment submissions with rubric-calculated grades
UPDATE assignment_submissions SET grade = 86, graded_at = NOW(), graded_by = 1 WHERE id = 1;

-- Insert some sample data for existing tables to support the new features
-- Add a few more users if they don't exist
INSERT INTO users (name, email, role, password_hash, created_at) VALUES
('Alice Johnson', 'alice@student.edu', 'student', '$2b$10$dummy.hash.for.demo', NOW()),
('Bob Smith', 'bob@student.edu', 'student', '$2b$10$dummy.hash.for.demo', NOW()),
('Carol Davis', 'carol@student.edu', 'student', '$2b$10$dummy.hash.for.demo', NOW()),
('David Wilson', 'david@student.edu', 'student', '$2b$10$dummy.hash.for.demo', NOW()),
('Emma Brown', 'emma@student.edu', 'student', '$2b$10$dummy.hash.for.demo', NOW())
ON CONFLICT (email) DO NOTHING;

-- Add sample courses and offerings
INSERT INTO courses (code, title, description, created_by) VALUES
('CS101', 'Introduction to Programming', 'Basic programming concepts and problem solving', 1),
('CS201', 'Data Structures and Algorithms', 'Advanced programming with focus on efficiency', 1),
('DB101', 'Database Systems', 'Database design, SQL, and data management', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO course_offerings (course_id, faculty_id, term, section, year) VALUES
(1, 1, 'Fall', 'A', 2024),
(2, 1, 'Fall', 'A', 2024),
(3, 2, 'Fall', 'B', 2024)
ON CONFLICT DO NOTHING;

-- Add sample assignments
INSERT INTO assignments (course_offering_id, title, description, assignment_type, release_at, due_at, max_score, created_by) VALUES
(1, 'Hello World Program', 'Write a simple program that prints "Hello, World!"', 'code', NOW() - INTERVAL '1 week', NOW() + INTERVAL '1 week', 100, 1),
(1, 'Project Presentation', 'Present your final project to the class', 'file', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 week', 100, 1),
(2, 'Algorithm Analysis Quiz', 'Quiz on algorithm complexity and analysis', 'quiz', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', 100, 1)
ON CONFLICT DO NOTHING;

-- Add enrollments
INSERT INTO enrollments (course_offering_id, student_id) VALUES
(1, 3), (1, 4), (1, 5),
(2, 3), (2, 4), (2, 6),
(3, 6), (3, 7)
ON CONFLICT DO NOTHING;

-- Add sample submissions
INSERT INTO assignment_submissions (assignment_id, student_id, submitted_at, status) VALUES
(1, 3, NOW() - INTERVAL '2 days', 'graded'),
(1, 4, NOW() - INTERVAL '1 day', 'graded'),
(2, 3, NOW() - INTERVAL '6 hours', 'submitted')
ON CONFLICT DO NOTHING;

-- Add submission files
INSERT INTO submission_files (submission_id, storage_path, filename, mime_type) VALUES
(1, 'submissions/assignment1_alice.zip', 'assignment1_alice.zip', 'application/zip'),
(2, 'submissions/assignment1_bob.zip', 'assignment1_bob.zip', 'application/zip'),
(3, 'submissions/presentation_alice.pdf', 'presentation_alice.pdf', 'application/pdf')
ON CONFLICT DO NOTHING;

COMMIT;

-- Summary of inserted data
SELECT
  (SELECT COUNT(*) FROM rubrics) as rubrics_count,
  (SELECT COUNT(*) FROM rubric_criteria) as criteria_count,
  (SELECT COUNT(*) FROM viva_sessions) as viva_sessions_count,
  (SELECT COUNT(*) FROM viva_participants) as viva_participants_count,
  (SELECT COUNT(*) FROM support_tickets) as tickets_count,
  (SELECT COUNT(*) FROM ticket_comments) as comments_count,
  (SELECT COUNT(*) FROM rubric_grades) as rubric_grades_count;