
-- Comprehensive Seed Data for LMS Testing
-- This script populates all tables with test data for comprehensive feature testing

-- Insert departments
INSERT INTO departments (code, name) VALUES
('CSE', 'Computer Science and Engineering'),
('ECE', 'Electronics and Communication Engineering'),
('ME', 'Mechanical Engineering'),
('CE', 'Civil Engineering')
ON CONFLICT (code) DO NOTHING;

-- Insert users with different roles
INSERT INTO users (email, name, role, department_id, roll_number, password_hash, is_active, created_at, updated_at) VALUES
-- Admins
('admin@lms.edu', 'System Admin', 'admin', 1, NULL, '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('admin2@lms.edu', 'Super Admin', 'admin', 1, NULL, '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),

-- Faculty
('faculty1@lms.edu', 'Dr. Alice Johnson', 'faculty', 1, NULL, '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('faculty2@lms.edu', 'Prof. Bob Smith', 'faculty', 2, NULL, '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('faculty3@lms.edu', 'Dr. Carol Davis', 'faculty', 1, NULL, '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),

-- TAs
('ta1@lms.edu', 'John TA', 'ta', 1, NULL, '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('ta2@lms.edu', 'Jane TA', 'ta', 1, NULL, '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),

-- Students
('student1@lms.edu', 'Alice Student', 'student', 1, 'CS2024001', '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('student2@lms.edu', 'Bob Student', 'student', 1, 'CS2024002', '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('student3@lms.edu', 'Carol Student', 'student', 1, 'CS2024003', '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('student4@lms.edu', 'David Student', 'student', 1, 'CS2024004', '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('student5@lms.edu', 'Eve Student', 'student', 1, 'CS2024005', '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('student6@lms.edu', 'Frank Student', 'student', 2, 'EC2024001', '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('student7@lms.edu', 'Grace Student', 'student', 2, 'EC2024002', '$2b$10$dummy.hash.for.demo', true, NOW(), NOW()),
('student8@lms.edu', 'Henry Student', 'student', 3, 'ME2024001', '$2b$10$dummy.hash.for.demo', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert admin records
INSERT INTO admins (user_id, is_super, created_at, created_by) VALUES
(1, true, NOW(), 1),
(2, true, NOW(), 1)
ON CONFLICT (user_id) DO NOTHING;

-- Insert courses
INSERT INTO courses (code, title, description, department_id, credits, created_at) VALUES
('CS101', 'Introduction to Programming', 'Basic programming concepts using Python', 1, 4, NOW()),
('CS201', 'Data Structures and Algorithms', 'Advanced data structures and algorithm design', 1, 4, NOW()),
('CS301', 'Database Systems', 'Relational databases, SQL, and database design', 1, 3, NOW()),
('CS401', 'Machine Learning', 'Introduction to ML algorithms and applications', 1, 3, NOW()),
('EC201', 'Digital Electronics', 'Digital circuit design and analysis', 2, 3, NOW()),
('ME101', 'Engineering Mechanics', 'Statics and dynamics principles', 3, 3, NOW())
ON CONFLICT (code) DO NOTHING;

-- Insert course offerings
INSERT INTO course_offerings (course_id, term, section, faculty_id, max_capacity, start_date, end_date, created_at) VALUES
(1, 'Fall 2024', 'A', 3, 50, '2024-08-15', '2024-12-15', NOW()),
(1, 'Fall 2024', 'B', 4, 45, '2024-08-15', '2024-12-15', NOW()),
(2, 'Fall 2024', 'A', 3, 40, '2024-08-15', '2024-12-15', NOW()),
(3, 'Fall 2024', 'A', 4, 35, '2024-08-15', '2024-12-15', NOW()),
(4, 'Spring 2025', 'A', 3, 30, '2025-01-15', '2025-05-15', NOW()),
(5, 'Fall 2024', 'A', 5, 40, '2024-08-15', '2024-12-15', NOW())
ON CONFLICT (course_id, term, section) DO NOTHING;

-- Insert faculty course assignments
INSERT INTO faculty_courses (course_id, faculty_id, assigned_at) VALUES
(1, 3, NOW()),
(2, 3, NOW()),
(3, 4, NOW()),
(4, 3, NOW()),
(5, 5, NOW()),
(6, 6, NOW())
ON CONFLICT (course_id, faculty_id) DO NOTHING;

-- Insert faculty course offering assignments
INSERT INTO faculty_course_offerings (course_offering_id, faculty_id, assigned_at) VALUES
(1, 3, NOW()),
(2, 4, NOW()),
(3, 3, NOW()),
(4, 4, NOW()),
(5, 3, NOW()),
(6, 5, NOW())
ON CONFLICT (course_offering_id, faculty_id) DO NOTHING;

-- Insert TA assignments
INSERT INTO ta_assignments (course_offering_id, ta_id, role, assigned_at) VALUES
(1, 7, 'ta', NOW()),
(2, 8, 'ta', NOW()),
(3, 7, 'ta', NOW())
ON CONFLICT (course_offering_id, ta_id) DO NOTHING;

-- Insert enrollments
INSERT INTO enrollments (course_offering_id, student_id, enrolled_at, status) VALUES
-- CS101-A
(1, 9, NOW(), 'active'),
(1, 10, NOW(), 'active'),
(1, 11, NOW(), 'active'),
(1, 12, NOW(), 'active'),
(1, 13, NOW(), 'active'),
-- CS101-B
(2, 14, NOW(), 'active'),
(2, 15, NOW(), 'active'),
-- CS201-A
(3, 9, NOW(), 'active'),
(3, 10, NOW(), 'active'),
(3, 11, NOW(), 'active'),
(3, 12, NOW(), 'active'),
-- CS301-A
(4, 9, NOW(), 'active'),
(4, 10, NOW(), 'active'),
(4, 11, NOW(), 'active'),
-- EC201-A
(6, 14, NOW(), 'active'),
(6, 15, NOW(), 'active'),
-- No enrollments for ME101 since we removed that course offering
ON CONFLICT (course_offering_id, student_id) DO NOTHING;

-- Insert assignments
INSERT INTO assignments (course_offering_id, title, description, assignment_type, release_at, due_at, max_score, allow_multiple_submissions, created_by, created_at) VALUES
(1, 'Hello World Program', 'Write a simple program that prints "Hello, World!" in Python', 'code', NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days', 100, false, 3, NOW()),
(1, 'Basic Calculator', 'Implement a basic calculator with addition, subtraction, multiplication, and division', 'code', NOW() - INTERVAL '3 days', NOW() + INTERVAL '10 days', 100, true, 3, NOW()),
(3, 'Sorting Algorithms', 'Implement bubble sort, quick sort, and merge sort algorithms', 'code', NOW() - INTERVAL '5 days', NOW() + INTERVAL '5 days', 100, false, 3, NOW()),
(3, 'Data Structure Implementation', 'Implement Stack, Queue, and Linked List data structures', 'code', NOW() - INTERVAL '2 days', NOW() + INTERVAL '12 days', 100, true, 3, NOW()),
(4, 'Database Design Project', 'Design and implement a database for a library management system', 'file', NOW() - INTERVAL '10 days', NOW() + INTERVAL '3 days', 100, false, 4, NOW()),
(4, 'SQL Query Assignment', 'Write complex SQL queries for data analysis', 'file', NOW() - INTERVAL '1 day', NOW() + INTERVAL '14 days', 100, true, 4, NOW())
ON CONFLICT DO NOTHING;

-- Insert quizzes
INSERT INTO quizzes (course_offering_id, title, start_at, end_at, max_score, is_proctored, time_limit, proctoring_config_id, allow_suspension_resume, created_at) VALUES
(1, 'Python Basics Quiz', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 50, false, 30, NULL, true, NOW()),
(1, 'Programming Concepts Quiz', NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days', 75, true, 45, NULL, true, NOW()),
(3, 'Algorithm Analysis Quiz', NOW() + INTERVAL '1 day', NOW() + INTERVAL '8 days', 100, false, 60, NULL, true, NOW()),
(4, 'Database Design Quiz', NOW() + INTERVAL '2 days', NOW() + INTERVAL '9 days', 80, true, 50, NULL, false, NOW())
ON CONFLICT DO NOTHING;

-- Insert quiz questions
INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata) VALUES
(1, 'What is the output of print(2 + 3)?', 'mcq', '{"options": ["5", "23", "2+3", "Error"], "correct_answer": "5", "points": 5}'),
(1, 'Which of the following is a valid Python variable name?', 'mcq', '{"options": ["2variable", "variable-name", "variable_name", "_variable"], "correct_answer": "_variable", "points": 5}'),
(1, 'What does the len() function return?', 'mcq', '{"options": ["Length of string", "Length of list", "Both A and B", "None of the above"], "correct_answer": "Both A and B", "points": 5}'),
(2, 'Explain the difference between lists and tuples in Python.', 'essay', '{"points": 25, "max_length": 500}'),
(2, 'What is recursion in programming?', 'essay', '{"points": 25, "max_length": 300}'),
(2, 'Write a function to check if a number is prime.', 'code', '{"points": 25, "language": "python"}'),
(3, 'What is the time complexity of bubble sort in worst case?', 'mcq', '{"options": ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], "correct_answer": "O(n²)", "points": 10}'),
(3, 'Explain the concept of Big O notation.', 'essay', '{"points": 30, "max_length": 400}'),
(4, 'What is normalization in database design?', 'essay', '{"points": 40, "max_length": 600}'),
(4, 'Write an SQL query to find the second highest salary from an employee table.', 'code', '{"points": 40, "language": "sql"}')
ON CONFLICT DO NOTHING;

-- Insert assignment submissions
INSERT INTO assignment_submissions (assignment_id, student_id, submitted_at, status, final_score, grader_id, graded_at, comments, attempt) VALUES
(1, 9, NOW() - INTERVAL '3 days', 'graded', 95, 3, NOW() - INTERVAL '2 days', 'Excellent work! Clean code and good comments.', 1),
(1, 10, NOW() - INTERVAL '4 days', 'graded', 88, 3, NOW() - INTERVAL '3 days', 'Good implementation but could use more comments.', 1),
(1, 11, NOW() - INTERVAL '2 days', 'graded', 92, 3, NOW() - INTERVAL '1 day', 'Well done! Minor improvements in variable naming.', 1),
(1, 12, NOW() - INTERVAL '5 days', 'graded', 85, 7, NOW() - INTERVAL '4 days', 'Basic implementation works. Consider edge cases.', 1),
(2, 9, NOW() - INTERVAL '1 day', 'submitted', NULL, NULL, NULL, NULL, 1),
(3, 9, NOW() - INTERVAL '2 days', 'graded', 90, 3, NOW() - INTERVAL '1 day', 'Good algorithm implementations.', 1),
(3, 10, NOW() - INTERVAL '3 days', 'graded', 87, 3, NOW() - INTERVAL '2 days', 'Correct implementations but could be optimized.', 1),
(4, 9, NOW() - INTERVAL '1 day', 'submitted', NULL, NULL, NULL, NULL, 1),
(5, 9, NOW() - INTERVAL '5 days', 'graded', 93, 4, NOW() - INTERVAL '3 days', 'Excellent database design with proper relationships.', 1),
(6, 9, NOW() - INTERVAL '2 hours', 'submitted', NULL, NULL, NULL, NULL, 1)
ON CONFLICT DO NOTHING;

-- Insert quiz attempts
INSERT INTO quiz_attempts (quiz_id, student_id, started_at, finished_at, score, answers, proctoring_session_id, violated) VALUES
(1, 9, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '25 minutes', 45, '{"1": "5", "2": "_variable", "3": "Both A and B"}', NULL, false),
(1, 10, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', 40, '{"1": "5", "2": "variable_name", "3": "Length of string"}', NULL, false),
(1, 11, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour', 48, '{"1": "5", "2": "_variable", "3": "Both A and B"}', NULL, false),
(2, 9, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '40 minutes', 65, '{"4": "Lists are mutable, tuples are immutable", "5": "A function that calls itself", "6": "def is_prime(n): if n <= 1: return False; for i in range(2, int(n**0.5)+1): if n % i == 0: return False; return True"}', NULL, false),
(3, 9, NOW() - INTERVAL '2 hours', NULL, NULL, '{}', NULL, false),
(4, 9, NOW() - INTERVAL '1 hour', NULL, NULL, '{}', NULL, false)
ON CONFLICT DO NOTHING;

-- Insert code questions
INSERT INTO code_questions (title, description, constraints, created_by, created_at, difficulty, time_limit_seconds, max_points) VALUES
('Two Sum Problem', 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.', 'Time complexity: O(n), Space complexity: O(n)', 3, NOW(), 'easy', 1800, 100),
('Valid Parentheses', 'Given a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.', 'Use stack data structure', 3, NOW(), 'medium', 1800, 100),
('Merge Two Sorted Lists', 'Merge two sorted linked lists and return it as a sorted list.', 'Time complexity: O(n + m)', 3, NOW(), 'easy', 1800, 100),
('Maximum Subarray', 'Given an integer array nums, find the contiguous subarray with the largest sum, and return its sum.', 'Kadane''s algorithm', 3, NOW(), 'medium', 1800, 100),
('Binary Tree Traversal', 'Implement inorder, preorder, and postorder traversal of a binary tree.', 'Recursive and iterative solutions', 3, NOW(), 'medium', 1800, 100)
ON CONFLICT DO NOTHING;

-- Insert code question testcases
INSERT INTO code_question_testcases (question_id, is_sample, input_text, expected_text) VALUES
(1, true, '[2,7,11,15]\n9', '[0,1]'),
(1, false, '[3,2,4]\n6', '[1,2]'),
(1, false, '[3,3]\n6', '[0,1]'),
(2, true, '"()"', 'true'),
(2, true, '"()[]{}"', 'true'),
(2, false, '"(]"', 'false'),
(3, true, '[1,2,4]\n[1,3,4]', '[1,1,2,3,4,4]'),
(4, true, '[-2,1,-3,4,-1,2,1,-5,4]', '6'),
(5, true, '[1,null,2,3]', 'Inorder: [1,3,2], Preorder: [1,2,3], Postorder: [3,2,1]')
ON CONFLICT DO NOTHING;

-- Insert assignment questions (linking code questions to assignments)
INSERT INTO assignment_questions (assignment_id, question_id, points, position) VALUES
(1, 1, 100, 1),
(2, 2, 50, 1),
(2, 3, 50, 2),
(3, 4, 50, 1),
(3, 5, 50, 2),
(4, 1, 30, 1),
(4, 2, 35, 2),
(4, 4, 35, 3)
ON CONFLICT (assignment_id, question_id) DO NOTHING;

-- Insert code submissions
INSERT INTO code_submissions (submission_id, language, code, run_output, test_results, created_at, assignment_question_id, started_at, completed_at, time_spent_seconds, gamified_score, attempts_count, efficiency_score) VALUES
(1, 'python', 'def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []', 'Test passed', '{"passed": 3, "total": 3}', NOW(), 1, NOW() - INTERVAL '30 minutes', NOW(), 1800, 95, 1, 85.5),
(2, 'python', 'def is_valid(s):\n    stack = []\n    mapping = {"(": ")", "[": "]", "{": "}"}\n    for char in s:\n        if char in mapping:\n            stack.append(char)\n        elif not stack or mapping[stack.pop()] != char:\n            return False\n    return not stack', 'All tests passed', '{"passed": 3, "total": 3}', NOW(), 2, NOW() - INTERVAL '45 minutes', NOW(), 2700, 90, 1, 78.2),
(3, 'python', 'def merge_two_lists(list1, list2):\n    if not list1: return list2\n    if not list2: return list1\n    if list1.val < list2.val:\n        list1.next = merge_two_lists(list1.next, list2)\n        return list1\n    else:\n        list2.next = merge_two_lists(list1, list2.next)\n        return list2', 'Tests passed', '{"passed": 2, "total": 2}', NOW(), 3, NOW() - INTERVAL '20 minutes', NOW(), 1200, 88, 1, 92.1)
ON CONFLICT DO NOTHING;

-- Insert code submission results
INSERT INTO code_submission_results (code_submission_id, testcase_id, passed, student_output, execution_time_ms, code_testcase_id) VALUES
(1, NULL, true, '[0,1]', 5, 1),
(1, NULL, true, '[1,2]', 3, 2),
(1, NULL, true, '[0,1]', 4, 3),
(2, NULL, true, 'true', 2, 4),
(2, NULL, true, 'true', 3, 5),
(2, NULL, true, 'false', 2, 6),
(3, NULL, true, '[1,1,2,3,4,4]', 4, 7)
ON CONFLICT (code_submission_id, code_testcase_id) DO NOTHING;

-- Insert assignment testcases
INSERT INTO assignment_testcases (assignment_id, input, expected_output, is_hidden) VALUES
(1, '[2,7,11,15]\n9', '[0,1]', false),
(1, '[3,2,4]\n6', '[1,2]', true),
(2, '"()[]{}"', 'true', false),
(2, '"([)]"', 'false', true),
(3, '[-2,1,-3,4,-1,2,1,-5,4]', '6', false)
ON CONFLICT DO NOTHING;

-- Insert gamification data
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points_reward, rarity, is_active, created_at) VALUES
('First Submission', 'Submit your first assignment', '🎯', 'progress', 'submissions', 1, 10, 'common', true, NOW()),
('Problem Solver', 'Solve 10 coding problems', '🧠', 'coding', 'problems_solved', 10, 50, 'common', true, NOW()),
('Speed Demon', 'Solve a problem in under 5 minutes', '⚡', 'coding', 'fast_solve', 1, 25, 'rare', true, NOW()),
('Perfect Score', 'Get 100% on an assignment', '💯', 'excellence', 'perfect_score', 1, 100, 'epic', true, NOW()),
('Streak Master', 'Maintain a 7-day solving streak', '🔥', 'consistency', 'streak', 7, 75, 'rare', true, NOW()),
('Quiz Champion', 'Score 95% or higher on 5 quizzes', '🏆', 'academic', 'high_quiz_scores', 5, 150, 'epic', true, NOW()),
('Early Bird', 'Complete daily challenge before 8 AM', '🌅', 'consistency', 'early_completion', 1, 20, 'uncommon', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert user achievements
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES
(9, 1, NOW() - INTERVAL '5 days'),
(9, 2, NOW() - INTERVAL '3 days'),
(10, 1, NOW() - INTERVAL '4 days'),
(11, 1, NOW() - INTERVAL '6 days'),
(9, 4, NOW() - INTERVAL '2 days')
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Insert user gamification stats
INSERT INTO user_gamification_stats (user_id, total_points, current_streak, longest_streak, problems_solved, easy_solved, medium_solved, hard_solved, total_submissions, successful_submissions, average_time_seconds, last_submission_date, level, experience_points, quizzes_completed, perfect_quiz_scores, high_quiz_scores, fast_quiz_completions, total_quiz_score, average_quiz_score, quiz_streak, last_quiz_date, unique_course_quizzes) VALUES
(9, 285, 3, 5, 12, 8, 3, 1, 15, 14, 1200, CURRENT_DATE, 3, 850, 4, 1, 3, 2, 310, 77.5, 2, CURRENT_DATE, 3),
(10, 145, 1, 2, 8, 6, 2, 0, 10, 9, 1500, CURRENT_DATE - INTERVAL '1 day', 2, 420, 2, 0, 1, 1, 165, 82.5, 1, CURRENT_DATE - INTERVAL '2 days', 2),
(11, 198, 2, 3, 9, 7, 2, 0, 11, 10, 1350, CURRENT_DATE - INTERVAL '2 days', 2, 580, 3, 0, 2, 1, 225, 75.0, 1, CURRENT_DATE - INTERVAL '3 days', 2),
(12, 95, 0, 1, 5, 4, 1, 0, 6, 5, 1800, CURRENT_DATE - INTERVAL '5 days', 1, 280, 1, 0, 0, 0, 75, 75.0, 0, CURRENT_DATE - INTERVAL '7 days', 1)
ON CONFLICT (user_id) DO NOTHING;

-- Insert daily challenges
INSERT INTO daily_challenges (date, question_id, bonus_points, is_active, created_at) VALUES
(CURRENT_DATE, 1, 50, true, NOW()),
(CURRENT_DATE - INTERVAL '1 day', 2, 50, true, NOW()),
(CURRENT_DATE - INTERVAL '2 days', 3, 50, true, NOW())
ON CONFLICT (date) DO NOTHING;

-- Insert user daily challenges
INSERT INTO user_daily_challenges (user_id, challenge_id, completed_at, points_earned, time_spent_seconds) VALUES
(9, 1, NOW() - INTERVAL '2 hours', 50, 900),
(9, 2, NOW() - INTERVAL '1 day' - INTERVAL '3 hours', 50, 1200),
(10, 1, NOW() - INTERVAL '4 hours', 50, 1500),
(11, 2, NOW() - INTERVAL '1 day' - INTERVAL '2 hours', 50, 800)
ON CONFLICT (user_id, challenge_id) DO NOTHING;

-- Insert leaderboards
INSERT INTO leaderboards (leaderboard_type, reference_id, user_id, score, rank, time_spent_seconds, submission_date, period_start, period_end) VALUES
('course', 1, 9, 95, 1, 1800, CURRENT_DATE, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE),
('course', 1, 10, 88, 2, 2100, CURRENT_DATE, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE),
('course', 1, 11, 92, 3, 1950, CURRENT_DATE, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE),
('assignment', 1, 9, 95, 1, 1800, CURRENT_DATE, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE),
('assignment', 1, 10, 88, 2, 2100, CURRENT_DATE, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE),
('global', NULL, 9, 285, 1, NULL, CURRENT_DATE, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE),
('global', NULL, 10, 145, 2, NULL, CURRENT_DATE, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE)
ON CONFLICT (leaderboard_type, reference_id, user_id, period_start) DO NOTHING;

-- Insert proctoring configs
INSERT INTO proctoring_configs (quiz_id, name, webcam_required, screen_monitoring, audio_monitoring, face_detection_required, max_warnings, auto_suspend_severity, allow_recovery, recovery_wait_seconds, violation_score_penalty, suspension_requires_teacher, live_monitoring_enabled, record_sessions, created_by, created_at, updated_at) VALUES
(2, 'Standard Proctoring Configuration', true, true, false, true, 3, 3, true, 30, 1.0, true, false, true, 3, NOW(), NOW()),
(4, 'Advanced Proctoring Configuration', true, true, true, true, 2, 2, false, 60, 1.5, false, true, true, 4, NOW(), NOW())
ON CONFLICT (quiz_id) DO NOTHING;

-- Update quizzes with proctoring config IDs
UPDATE quizzes SET proctoring_config_id = 1 WHERE id = 2;
UPDATE quizzes SET proctoring_config_id = 2 WHERE id = 4;

-- Insert proctoring sessions
INSERT INTO proctoring_sessions (quiz_attempt_id, student_id, started_at, ended_at, device_info, browser_info, session_token, status, webcam_enabled, screen_monitoring_enabled, audio_monitoring_enabled, created_at, updated_at) VALUES
(4, 9, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '40 minutes', '{"os": "Windows", "browser": "Chrome"}', '{"version": "119.0"}', 'session-token-123', 'completed', true, true, false, NOW(), NOW()),
(6, 9, NOW() - INTERVAL '1 hour', NULL, '{"os": "Windows", "browser": "Chrome"}', '{"version": "119.0"}', 'session-token-456', 'active', true, true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert proctoring violations
INSERT INTO proctoring_violations (session_id, violation_type, severity, timestamp, evidence_data, evidence_url, description, resolved, resolved_by, resolved_at, created_at) VALUES
(1, 'face_not_visible', 2, NOW() - INTERVAL '1 day' + INTERVAL '10 minutes', '{"confidence": 0.85}', '/evidence/face-001.jpg', 'Student looked away from camera', true, 3, NOW() - INTERVAL '1 day' + INTERVAL '15 minutes', NOW()),
(1, 'multiple_faces', 3, NOW() - INTERVAL '1 day' + INTERVAL '25 minutes', '{"face_count": 2}', '/evidence/faces-001.jpg', 'Multiple faces detected in frame', false, NULL, NULL, NOW())
ON CONFLICT DO NOTHING;

-- Insert proctoring analytics
INSERT INTO proctoring_analytics (session_id, total_violations, violations_by_type, violations_by_severity, session_duration_seconds, compliance_score, risk_level, flagged_for_review, reviewed_by, reviewed_at, created_at) VALUES
(1, 2, '{"face_not_visible": 1, "multiple_faces": 1}', '{"1": 0, "2": 1, "3": 1, "4": 0}', 2400, 85.5, 'medium', true, 3, NOW() - INTERVAL '1 day' + INTERVAL '45 minutes', NOW())
ON CONFLICT DO NOTHING;

-- Insert rubrics
INSERT INTO rubrics (title, description, course_offering_id, created_by, created_at, updated_at) VALUES
('Programming Assignment Rubric', 'Comprehensive evaluation of coding assignments', 1, 3, NOW(), NOW()),
('Algorithm Implementation Rubric', 'Assessment of algorithm correctness and efficiency', 3, 3, NOW(), NOW()),
('Database Design Rubric', 'Evaluation of database design and implementation', 4, 4, NOW(), NOW()),
('Project Presentation Rubric', 'Assessment of presentation skills and content', 1, 3, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert rubric criteria
INSERT INTO rubric_criteria (rubric_id, title, description, max_points, weight, position, created_at) VALUES
-- Programming Assignment Rubric (ID: 1)
(1, 'Code Correctness', 'Program produces correct output and handles edge cases', 25, 1.0, 1, NOW()),
(1, 'Code Quality', 'Clean, readable, and well-structured code', 20, 0.8, 2, NOW()),
(1, 'Documentation', 'Proper comments and documentation', 15, 0.6, 3, NOW()),
(1, 'Efficiency', 'Optimal algorithm choice and implementation', 20, 0.8, 4, NOW()),
(1, 'Testing', 'Comprehensive test cases and validation', 20, 0.8, 5, NOW()),

-- Algorithm Implementation Rubric (ID: 2)
(2, 'Algorithm Correctness', 'Algorithm produces correct results', 30, 1.0, 1, NOW()),
(2, 'Time Complexity', 'Optimal time complexity achieved', 25, 0.8, 2, NOW()),
(2, 'Space Complexity', 'Efficient use of memory', 20, 0.7, 3, NOW()),
(2, 'Code Clarity', 'Clear and understandable implementation', 15, 0.6, 4, NOW()),
(2, 'Edge Cases', 'Handles all edge cases properly', 10, 0.5, 5, NOW()),

-- Database Design Rubric (ID: 3)
(3, 'Schema Design', 'Proper normalization and relationships', 30, 1.0, 1, NOW()),
(3, 'Query Optimization', 'Efficient SQL queries', 25, 0.8, 2, NOW()),
(3, 'Data Integrity', 'Proper constraints and validation', 20, 0.7, 3, NOW()),
(3, 'Documentation', 'Clear schema documentation', 15, 0.6, 4, NOW()),
(3, 'Functionality', 'All required features implemented', 10, 0.5, 5, NOW()),

-- Project Presentation Rubric (ID: 4)
(4, 'Content Knowledge', 'Demonstrates deep understanding of the topic', 25, 1.0, 1, NOW()),
(4, 'Presentation Skills', 'Clear communication and professional delivery', 20, 0.8, 2, NOW()),
(4, 'Visual Aids', 'Effective use of slides and demonstrations', 15, 0.6, 3, NOW()),
(4, 'Q&A Handling', 'Ability to answer questions effectively', 20, 0.8, 4, NOW()),
(4, 'Time Management', 'Stays within allotted time frame', 20, 0.8, 5, NOW())
ON CONFLICT DO NOTHING;

-- Insert rubric grades
INSERT INTO rubric_grades (submission_id, criterion_id, score, feedback, graded_by, graded_at) VALUES
(1, 1, 22, 'Good implementation but missed edge case handling', 3, NOW()),
(1, 2, 18, 'Code is readable but could use better variable naming', 3, NOW()),
(1, 3, 12, 'Missing docstrings for functions', 3, NOW()),
(1, 4, 18, 'Algorithm is correct but not optimal', 3, NOW()),
(1, 5, 16, 'Basic test cases covered but missing edge cases', 3, NOW()),
(3, 6, 28, 'Correct algorithm implementation', 3, NOW()),
(3, 7, 22, 'Good time complexity achieved', 3, NOW()),
(3, 8, 18, 'Reasonable space usage', 3, NOW()),
(3, 9, 14, 'Code is understandable', 3, NOW()),
(3, 10, 9, 'Most edge cases handled', 3, NOW()),
(5, 11, 28, 'Well normalized schema with proper relationships', 4, NOW()),
(5, 12, 23, 'Queries are reasonably optimized', 4, NOW()),
(5, 13, 18, 'Good use of constraints', 4, NOW()),
(5, 14, 14, 'Schema is documented', 4, NOW()),
(5, 15, 9, 'All features implemented', 4, NOW())
ON CONFLICT (submission_id, criterion_id) DO NOTHING;

-- Insert support tickets
INSERT INTO support_tickets (user_id, title, description, category, status, priority, assigned_to, course_offering_id, created_at, updated_at) VALUES
(9, 'Cannot submit programming assignment', 'Getting 403 error when trying to submit assignment #1. The submit button is disabled.', 'bug_report', 'open', 'high', NULL, 1, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
(10, 'Quiz timer not working properly', 'The quiz timer shows incorrect remaining time and sometimes counts backwards.', 'bug_report', 'in_progress', 'medium', 3, 1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 hours'),
(11, 'Feature request: Dark mode toggle', 'Please add a dark mode option to reduce eye strain during long study sessions.', 'feature_request', 'open', 'low', NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(12, 'Video lecture buffering issues', 'Videos buffer frequently and quality degrades on slower connections.', 'technical_issue', 'resolved', 'medium', 4, 3, NOW() - INTERVAL '1 week', NOW() - INTERVAL '2 days'),
(9, 'Grade not visible for assignment #2', 'Submitted assignment 2 days ago but grade is still not visible in my dashboard.', 'technical_issue', 'open', 'medium', NULL, 1, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
(10, 'Request for code review feedback', 'It would be helpful to get more detailed code review comments instead of just grades.', 'feature_request', 'open', 'low', NULL, NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
(14, ' Proctoring session disconnected', 'My proctoring session disconnected during quiz attempt and I cannot resume.', 'technical_issue', 'in_progress', 'high', 3, 1, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
(15, 'Assignment rubric not loading', 'Cannot view the grading rubric for assignment #3.', 'bug_report', 'open', 'medium', NULL, 3, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour')
ON CONFLICT DO NOTHING;

-- Insert ticket comments
INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal, created_at) VALUES
(2, 3, 'We are investigating the timer issue. It appears to be related to timezone settings.', true, NOW() - INTERVAL '4 hours'),
(2, 10, 'Thanks for looking into this. The timer was showing negative time during my last quiz attempt.', false, NOW() - INTERVAL '3 hours'),
(4, 4, 'We have optimized the video streaming settings. Please try again and let us know if the issue persists.', false, NOW() - INTERVAL '2 days'),
(4, 12, 'The buffering issue seems to be resolved. Videos are loading much faster now. Thank you!', false, NOW() - INTERVAL '1 day'),
(7, 3, 'We''re looking into the proctoring disconnection issue. Can you provide more details about when it happened?', true, NOW() - INTERVAL '25 minutes'),
(7, 14, 'It happened at 2:15 PM during the programming quiz. I was in the middle of question 3.', false, NOW() - INTERVAL '20 minutes')
ON CONFLICT DO NOTHING;

-- Insert messages
INSERT INTO messages (sender_id, receiver_id, subject, content, is_read, sent_at, created_at) VALUES
(3, 9, 'Assignment Feedback', 'Great work on your first assignment! Your code structure is excellent.', true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(9, 3, 'Question about Assignment 2', 'I have a question about the requirements for assignment 2. Can we discuss?', false, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(4, 10, 'Database Project Extension', 'Due to technical issues, I''m extending the deadline for the database project by 2 days.', true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(7, 9, 'TA Office Hours', 'I''ll be available for questions about data structures during office hours tomorrow 3-5 PM.', false, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
(3, 11, 'Quiz Performance', 'You did well on the recent quiz. Keep up the good work!', true, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week')
ON CONFLICT DO NOTHING;

-- Insert notifications
INSERT INTO notifications (user_id, title, body, is_read, created_at) VALUES
(9, 'Assignment Graded', 'Your submission for "Hello World Program" has been graded. Score: 95/100', true, NOW() - INTERVAL '2 days'),
(9, 'New Assignment Available', 'A new assignment "Basic Calculator" is now available in CS101', false, NOW() - INTERVAL '3 days'),
(10, 'Quiz Reminder', 'Your quiz "Programming Concepts Quiz" starts in 2 hours', false, NOW() - INTERVAL '1 day'),
(11, 'Achievement Unlocked', 'Congratulations! You unlocked the "First Submission" achievement', true, NOW() - INTERVAL '5 days'),
(9, 'Daily Challenge Available', 'Today''s coding challenge is now available. Bonus points: 50', false, NOW() - INTERVAL '6 hours'),
(12, 'Grade Updated', 'Your grade for "Database Design Project" has been updated', false, NOW() - INTERVAL '1 day'),
(14, 'Proctoring Session Alert', 'Suspicious activity detected during your quiz session', true, NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;

-- Insert study materials
INSERT INTO study_materials (department_id, course_id, title, description, category, material, storage_path, filename, uploaded_by, created_at, updated_at) VALUES
(1, 1, 'Python Programming Cheat Sheet', 'Quick reference guide for Python syntax and common operations', 'Reference', 'notes', '/materials/python-cheat-sheet.pdf', 'python-cheat-sheet.pdf', 3, NOW(), NOW()),
(1, 2, 'Data Structures Visual Guide', 'Visual explanations of common data structures', 'Study Aid', 'presentation', '/materials/ds-visual-guide.pptx', 'ds-visual-guide.pptx', 3, NOW(), NOW()),
(1, 3, 'SQL Query Examples', 'Comprehensive collection of SQL query examples', 'Practice', 'question_bank', '/materials/sql-examples.pdf', 'sql-examples.pdf', 4, NOW(), NOW()),
(2, 5, 'Digital Logic Gates Tutorial', 'Interactive tutorial on digital logic gates', 'Tutorial', 'video', '/materials/logic-gates-tutorial.mp4', 'logic-gates-tutorial.mp4', 5, NOW(), NOW()),
(1, NULL, 'Algorithm Complexity Analysis', 'Guide to analyzing time and space complexity', 'Reference', 'notes', '/materials/complexity-analysis.pdf', 'complexity-analysis.pdf', 3, NOW(), NOW()),
(3, 6, 'Engineering Mechanics Formulas', 'Complete formula sheet for mechanics', 'Reference', 'notes', '/materials/mechanics-formulas.pdf', 'mechanics-formulas.pdf', 6, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert discussion messages
INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content, created_at) VALUES
(1, 9, NULL, 'Can someone explain the difference between lists and tuples in Python?', NOW() - INTERVAL '2 days'),
(1, 10, 1, 'Lists are mutable (can be changed) while tuples are immutable (cannot be changed after creation).', NOW() - INTERVAL '2 days' + INTERVAL '30 minutes'),
(1, 11, 1, 'Also, tuples are usually faster and use less memory than lists.', NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
(1, 9, 1, 'Thanks for the explanations! That makes sense.', NOW() - INTERVAL '2 days' + INTERVAL '2 hours'),
(3, 9, NULL, 'What are the practical applications of different sorting algorithms?', NOW() - INTERVAL '1 day'),
(3, 3, 5, 'Quick sort is generally fastest for random data, merge sort for linked lists, bubble sort is mainly educational.', NOW() - INTERVAL '1 day' + INTERVAL '1 hour'),
(4, 9, NULL, 'How do I optimize my database queries for better performance?', NOW() - INTERVAL '3 days'),
(4, 4, 7, 'Use indexes on frequently queried columns, avoid SELECT *, and consider query execution plans.', NOW() - INTERVAL '3 days' + INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- Insert videos
INSERT INTO videos (title, description, uploaded_by, video_url, duration, cloudinary_public_id, upload_timestamp, created_at, updated_at, course_offering_id) VALUES
('Introduction to Programming', 'Welcome to CS101 - Basic concepts and course overview', 3, 'https://example.com/video1.mp4', 1800.50, 'video_12345', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', 1),
('Data Structures Overview', 'Understanding arrays, linked lists, stacks, and queues', 3, 'https://example.com/video2.mp4', 2400.75, 'video_67890', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', 3),
('Database Design Principles', 'Normalization, relationships, and best practices', 4, 'https://example.com/video3.mp4', 2100.25, 'video_abcde', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 4)
ON CONFLICT DO NOTHING;

-- Insert video quiz questions
INSERT INTO video_quiz_questions (video_id, question_text, question_type, options, correct_answer, points, explanation, created_at, updated_at, timestamp) VALUES
(1, 'What is the primary purpose of a programming language?', 'mcq', '["To communicate with computers", "To create websites", "To store data", "To design graphics"]', 'To communicate with computers', 5.0, 'Programming languages allow humans to give instructions to computers.', NOW(), NOW(), 300.5),
(1, 'Which of the following is NOT a high-level programming language?', 'mcq', '["Python", "Java", "Assembly", "JavaScript"]', 'Assembly', 5.0, 'Assembly language is a low-level language that directly corresponds to machine code.', NOW(), NOW(), 600.0),
(2, 'What is the time complexity of accessing an element in an array by index?', 'mcq', '["O(1)", "O(n)", "O(log n)", "O(n²)"]', 'O(1)', 10.0, 'Array access by index is constant time O(1) because it directly calculates the memory location.', NOW(), NOW(), 900.25),
(3, 'What does ACID stand for in database systems?', 'mcq', '["Atomicity, Consistency, Isolation, Durability", "Access, Control, Integrity, Design", "Automatic, Concurrent, Independent, Distributed", "Advanced, Complex, Interactive, Dynamic"]', 'Atomicity, Consistency, Isolation, Durability', 15.0, 'ACID properties ensure reliable database transactions.', NOW(), NOW(), 1200.75)
ON CONFLICT DO NOTHING;

-- Insert video quiz attempts
INSERT INTO video_quiz_attempts (video_id, student_id, started_at, completed_at, score, max_score, answers, created_at, updated_at) VALUES
(1, 9, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '15 minutes', 8.0, 10.0, '{"1": "To communicate with computers", "2": "Assembly"}', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
(1, 10, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '12 minutes', 9.0, 10.0, '{"1": "To communicate with computers", "2": "Assembly"}', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
(2, 9, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '20 minutes', 8.0, 10.0, '{"3": "O(1)"}', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
(3, 9, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '25 minutes', 13.0, 15.0, '{"4": "Atomicity, Consistency, Isolation, Durability"}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
ON CONFLICT (video_id, student_id) DO NOTHING;

-- Insert settings
INSERT INTO settings (key, value, updated_at) VALUES
('system.maintenance_mode', '{"enabled": false, "message": "System is under maintenance"}', NOW()),
('gamification.enabled', '{"value": true}', NOW()),
('proctoring.enabled', '{"value": true}', NOW()),
('notifications.email_enabled', '{"value": true}', NOW()),
('system.max_file_size', '{"value": 10485760}', NOW()),
('academic.year', '{"start": "2024-08-15", "end": "2025-05-15"}', NOW())
ON CONFLICT (key) DO NOTHING;

COMMIT;