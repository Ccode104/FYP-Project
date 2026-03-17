
-- Comprehensive Test Seed Data for LMS Features Testing
-- This script adds extensive test data centered around DummyStudent, DummyTA, DummyTeacher, and DummyAdmin
-- All existing data is preserved

-- User IDs for reference:
-- DummyStudent: 38
-- DummyTA: 53
-- DummyTeacher: 33
-- DummyAdmin: 44

-- Create CSE304 Computer Programming Course for comprehensive testing
INSERT INTO courses (code, title, description, department_id, credits, created_at) VALUES
('CSE304', 'Computer Programming Course', 'Comprehensive course covering programming fundamentals, algorithms, and software development practices', 1, 4, NOW())
ON CONFLICT (code) DO NOTHING;

-- Create course offering taught by DummyTeacher with DummyTA as assistant
INSERT INTO course_offerings (course_id, term, section, faculty_id, max_capacity, start_date, end_date, created_at) VALUES
((SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1), 'Fall 2024', 'A', 33, 50, '2024-08-15', '2024-12-15', NOW())
ON CONFLICT (course_id, term, section) DO NOTHING;

-- Get the course offering ID
-- Enroll DummyStudent in CSE304
INSERT INTO enrollments (course_offering_id, student_id, enrolled_at, status) VALUES
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1) AND term = 'Fall 2024'), 38, NOW(), 'active')
ON CONFLICT (course_offering_id, student_id) DO NOTHING;

-- Assign DummyTA to CSE304
INSERT INTO ta_assignments (course_offering_id, ta_id, role, assigned_at) VALUES
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1) AND term = 'Fall 2024'), 53, 'ta', NOW())
ON CONFLICT (course_offering_id, ta_id) DO NOTHING;

-- Create comprehensive assignments for testing
INSERT INTO assignments (course_offering_id, title, description, assignment_type, release_at, due_at, max_score, allow_multiple_submissions, created_by, created_at) VALUES
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 'Basic Programming Assignment', 'Implement basic programming concepts including variables, loops, and functions', 'code', NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days', 100, true, 33, NOW()),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 'Algorithm Design Assignment', 'Design and implement efficient algorithms for common problems', 'code', NOW() - INTERVAL '3 days', NOW() + INTERVAL '10 days', 100, false, 33, NOW()),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 'Database Design Project', 'Design a complete database schema for a real-world application', 'file', NOW() - INTERVAL '5 days', NOW() + INTERVAL '5 days', 100, false, 33, NOW()),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 'Research Paper', 'Write a research paper on emerging technologies in computer science', 'file', NOW() - INTERVAL '10 days', NOW() + INTERVAL '14 days', 100, true, 33, NOW())
ON CONFLICT DO NOTHING;

-- Create assignment submissions for DummyStudent
INSERT INTO assignment_submissions (assignment_id, student_id, submitted_at, status, final_score, grader_id, graded_at, comments, attempt) VALUES
((SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' AND course_offering_id = (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1) LIMIT 1)), 38, NOW() - INTERVAL '2 days', 'graded', 92, 33, NOW() - INTERVAL '1 day', 'Excellent implementation with good code structure and comments.', 1),
((SELECT id FROM assignments WHERE title = 'Algorithm Design Assignment' AND course_offering_id = (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1) LIMIT 1)), 38, NOW() - INTERVAL '1 day', 'graded', 88, 53, NOW() - INTERVAL '12 hours', 'Good algorithmic approach but could be optimized further.', 1),
((SELECT id FROM assignments WHERE title = 'Database Design Project' AND course_offering_id = (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1) LIMIT 1)), 38, NOW() - INTERVAL '2 hours', 'submitted', NULL, NULL, NULL, NULL, 1)
ON CONFLICT DO NOTHING;

-- Create submission files
INSERT INTO submission_files (submission_id, storage_path, filename, mime_type, uploaded_at) VALUES
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND student_id = 38), '/submissions/CSE304_basic_programming.zip', 'basic_programming_solution.zip', 'application/zip', NOW() - INTERVAL '2 days'),
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Algorithm Design Assignment' ORDER BY id LIMIT 1) AND student_id = 38), '/submissions/CSE304_algorithms.zip', 'algorithm_solutions.zip', 'application/zip', NOW() - INTERVAL '1 day'),
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Database Design Project' ORDER BY id LIMIT 1) AND student_id = 38), '/submissions/CSE304_database_design.pdf', 'database_schema_design.pdf', 'application/pdf', NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- Create quizzes with different configurations
INSERT INTO quizzes (course_offering_id, title, start_at, end_at, max_score, is_proctored, time_limit, allow_suspension_resume, created_at) VALUES
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 'Basic Programming Quiz', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', 50, false, 30, true, NOW()),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 'Advanced Algorithms Quiz', NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 days', 75, true, 45, false, NOW()),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 'Database Concepts Quiz', NOW() + INTERVAL '2 days', NOW() + INTERVAL '9 days', 60, true, 40, true, NOW())
ON CONFLICT DO NOTHING;

-- Create quiz questions
INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata) VALUES
-- Basic Programming Quiz
((SELECT id FROM quizzes WHERE title = 'Basic Programming Quiz' ORDER BY id LIMIT 1), 'What is the output of print(2 ** 3)?', 'mcq', '{"options": ["6", "8", "9", "Error"], "correct_answer": "8", "points": 5}'),
((SELECT id FROM quizzes WHERE title = 'Basic Programming Quiz' ORDER BY id LIMIT 1), 'Which of the following is a mutable data type in Python?', 'mcq', '{"options": ["tuple", "string", "list", "int"], "correct_answer": "list", "points": 5}'),
((SELECT id FROM quizzes WHERE title = 'Basic Programming Quiz' ORDER BY id LIMIT 1), 'What does the range(5) function return?', 'mcq', '{"options": ["[0,1,2,3,4]", "[1,2,3,4,5]", "[0,1,2,3,4,5]", "Error"], "correct_answer": "[0,1,2,3,4]", "points": 5}'),
((SELECT id FROM quizzes WHERE title = 'Basic Programming Quiz' ORDER BY id LIMIT 1), 'Explain the difference between a function and a method in Python.', 'essay', '{"points": 15, "max_length": 300}'),
((SELECT id FROM quizzes WHERE title = 'Basic Programming Quiz' ORDER BY id LIMIT 1), 'Write a function that checks if a number is even.', 'code', '{"points": 20, "language": "python"}'),

-- Advanced Algorithms Quiz
((SELECT id FROM quizzes WHERE title = 'Advanced Algorithms Quiz' ORDER BY id LIMIT 1), 'What is the time complexity of binary search?', 'mcq', '{"options": ["O(1)", "O(log n)", "O(n)", "O(n²)"], "correct_answer": "O(log n)", "points": 10}'),
((SELECT id FROM quizzes WHERE title = 'Advanced Algorithms Quiz' ORDER BY id LIMIT 1), 'Which sorting algorithm has the best worst-case time complexity?', 'mcq', '{"options": ["Bubble Sort", "Quick Sort", "Merge Sort", "Insertion Sort"], "correct_answer": "Merge Sort", "points": 10}'),
((SELECT id FROM quizzes WHERE title = 'Advanced Algorithms Quiz' ORDER BY id LIMIT 1), 'Explain the concept of dynamic programming with an example.', 'essay', '{"points": 25, "max_length": 400}'),
((SELECT id FROM quizzes WHERE title = 'Advanced Algorithms Quiz' ORDER BY id LIMIT 1), 'Implement a function to find the nth Fibonacci number using memoization.', 'code', '{"points": 30, "language": "python"}'),

-- Database Concepts Quiz
((SELECT id FROM quizzes WHERE title = 'Database Concepts Quiz' ORDER BY id LIMIT 1), 'What does ACID stand for in database transactions?', 'mcq', '{"options": ["Atomicity, Consistency, Isolation, Durability", "Access, Control, Integrity, Design", "Automatic, Concurrent, Independent, Distributed"], "correct_answer": "Atomicity, Consistency, Isolation, Durability", "points": 10}'),
((SELECT id FROM quizzes WHERE title = 'Database Concepts Quiz' ORDER BY id LIMIT 1), 'Which normal form eliminates transitive dependencies?', 'mcq', '{"options": ["1NF", "2NF", "3NF", "BCNF"], "correct_answer": "3NF", "points": 10}'),
((SELECT id FROM quizzes WHERE title = 'Database Concepts Quiz' ORDER BY id LIMIT 1), 'Explain the difference between INNER JOIN and LEFT JOIN.', 'essay', '{"points": 20, "max_length": 350}'),
((SELECT id FROM quizzes WHERE title = 'Database Concepts Quiz' ORDER BY id LIMIT 1), 'Write an SQL query to find employees with salary greater than their manager.', 'code', '{"points": 20, "language": "sql"}')
ON CONFLICT DO NOTHING;

-- Create quiz attempts for DummyStudent
INSERT INTO quiz_attempts (quiz_id, student_id, started_at, finished_at, score, answers, violated) VALUES
((SELECT id FROM quizzes WHERE title = 'Basic Programming Quiz' ORDER BY id LIMIT 1), 38, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '25 minutes', 45, '{"1": "8", "2": "list", "3": "[0,1,2,3,4]", "4": "Functions are standalone blocks of code, methods are functions that belong to objects.", "5": "def is_even(n): return n % 2 == 0"}', false),
((SELECT id FROM quizzes WHERE title = 'Advanced Algorithms Quiz' ORDER BY id LIMIT 1), 38, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '10 hours', 68, '{"6": "O(log n)", "7": "Merge Sort", "8": "Dynamic programming breaks down complex problems into simpler subproblems and stores results to avoid recomputation.", "9": "def fibonacci(n, memo={}): if n in memo: return memo[n]; if n <= 1: return n; memo[n] = fibonacci(n-1, memo) + fibonacci(n-2, memo); return memo[n]"}', false),
((SELECT id FROM quizzes WHERE title = 'Database Concepts Quiz' ORDER BY id LIMIT 1), 38, NOW() + INTERVAL '3 hours', NULL, NULL, '{}', false)
ON CONFLICT DO NOTHING;

-- Create proctoring configurations for proctored quizzes
INSERT INTO proctoring_configs (quiz_id, name, webcam_required, screen_monitoring, audio_monitoring, face_detection_required, max_warnings, auto_suspend_severity, allow_recovery, recovery_wait_seconds, violation_score_penalty, suspension_requires_teacher, live_monitoring_enabled, record_sessions, created_by, created_at, updated_at) VALUES
((SELECT id FROM quizzes WHERE title = 'Advanced Algorithms Quiz' ORDER BY id LIMIT 1), 'Strict Proctoring - Advanced Quiz', true, true, true, true, 2, 2, false, 60, 2.0, false, true, true, 33, NOW(), NOW()),
((SELECT id FROM quizzes WHERE title = 'Database Concepts Quiz' ORDER BY id LIMIT 1), 'Standard Proctoring - Database Quiz', true, true, false, true, 3, 3, true, 30, 1.5, true, false, true, 33, NOW(), NOW())
ON CONFLICT (quiz_id) DO NOTHING;

-- Update quizzes with proctoring config IDs
UPDATE quizzes SET proctoring_config_id = (SELECT id FROM proctoring_configs WHERE quiz_id = quizzes.id ORDER BY id LIMIT 1) WHERE title IN ('Advanced Algorithms Quiz', 'Database Concepts Quiz');

-- Create proctoring sessions
INSERT INTO proctoring_sessions (quiz_attempt_id, student_id, started_at, ended_at, device_info, browser_info, session_token, status, webcam_enabled, screen_monitoring_enabled, audio_monitoring_enabled, created_at, updated_at) VALUES
((SELECT id FROM quiz_attempts WHERE quiz_id = (SELECT id FROM quizzes WHERE title = 'Advanced Algorithms Quiz' ORDER BY id LIMIT 1) AND student_id = 38), 38, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '10 hours', '{"os": "Windows 11", "browser": "Chrome 120.0"}', '{"version": "120.0.6099.109"}', 'proctor-session-001', 'completed', true, true, true, NOW(), NOW()),
((SELECT id FROM quiz_attempts WHERE quiz_id = (SELECT id FROM quizzes WHERE title = 'Database Concepts Quiz' ORDER BY id LIMIT 1) AND student_id = 38), 38, NOW() + INTERVAL '3 hours', NULL, '{"os": "Windows 11", "browser": "Chrome 120.0"}', '{"version": "120.0.6099.109"}', 'proctor-session-002', 'active', true, true, false, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Create proctoring violations
INSERT INTO proctoring_violations (session_id, violation_type, severity, timestamp, evidence_data, evidence_url, description, resolved, resolved_by, resolved_at, created_at) VALUES
((SELECT id FROM proctoring_sessions WHERE session_token = 'proctor-session-001' ORDER BY id LIMIT 1), 'face_not_visible', 2, NOW() - INTERVAL '11 hours' + INTERVAL '15 minutes', '{"confidence": 0.78}', '/evidence/face-violation-001.jpg', 'Student briefly looked away from camera during quiz', true, 33, NOW() - INTERVAL '10 hours' + INTERVAL '30 minutes', NOW()),
((SELECT id FROM proctoring_sessions WHERE session_token = 'proctor-session-001' ORDER BY id LIMIT 1), 'multiple_tabs', 3, NOW() - INTERVAL '10 hours' + INTERVAL '45 minutes', '{"tab_count": 3}', '/evidence/tab-violation-001.png', 'Multiple browser tabs detected', false, NULL, NULL, NOW())
ON CONFLICT DO NOTHING;

-- Create proctoring analytics
INSERT INTO proctoring_analytics (session_id, total_violations, violations_by_type, violations_by_severity, session_duration_seconds, compliance_score, risk_level, flagged_for_review, reviewed_by, reviewed_at, created_at) VALUES
((SELECT id FROM proctoring_sessions WHERE session_token = 'proctor-session-001' ORDER BY id LIMIT 1), 2, '{"face_not_visible": 1, "multiple_tabs": 1}', '{"2": 1, "3": 1}', 7200, 82.5, 'medium', true, 33, NOW() - INTERVAL '10 hours', NOW())
ON CONFLICT DO NOTHING;

-- Create code questions for programming assignments
INSERT INTO code_questions (title, description, constraints, created_by, created_at, difficulty, time_limit_seconds, max_points) VALUES
('Two Sum Problem', 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution.', 'Time: O(n), Space: O(n), Use hash map approach', 33, NOW(), 'easy', 1800, 100),
('Valid Parentheses', 'Given a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.', 'Use stack data structure, handle all bracket types', 33, NOW(), 'medium', 1800, 100),
('Merge Sorted Arrays', 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.', 'Time: O(log(m+n)), handle edge cases', 33, NOW(), 'hard', 2400, 100),
('Binary Tree Maximum Path Sum', 'A path in a binary tree is a sequence of nodes where each pair of adjacent nodes in the sequence has an edge connecting them. Find the maximum path sum.', 'Handle negative values, recursive solution', 33, NOW(), 'hard', 2400, 100),
('LRU Cache Implementation', 'Design and implement a data structure for Least Recently Used (LRU) cache. It should support get and put operations.', 'O(1) time complexity for both operations', 33, NOW(), 'hard', 2400, 100)
ON CONFLICT DO NOTHING;

-- Create code question test cases
INSERT INTO code_question_testcases (question_id, is_sample, input_text, expected_text) VALUES
((SELECT id FROM code_questions WHERE title = 'Two Sum Problem' ORDER BY id LIMIT 1), true, '[2,7,11,15]\n9', '[0,1]'),
((SELECT id FROM code_questions WHERE title = 'Two Sum Problem' ORDER BY id LIMIT 1), false, '[3,2,4]\n6', '[1,2]'),
((SELECT id FROM code_questions WHERE title = 'Two Sum Problem' ORDER BY id LIMIT 1), false, '[3,3]\n6', '[0,1]'),
((SELECT id FROM code_questions WHERE title = 'Valid Parentheses' ORDER BY id LIMIT 1), true, '"()"', 'true'),
((SELECT id FROM code_questions WHERE title = 'Valid Parentheses' ORDER BY id LIMIT 1), true, '"()[]{}"', 'true'),
((SELECT id FROM code_questions WHERE title = 'Valid Parentheses' ORDER BY id LIMIT 1), false, '"(]"', 'false'),
((SELECT id FROM code_questions WHERE title = 'Valid Parentheses' ORDER BY id LIMIT 1), false, '"([)]"', 'false'),
((SELECT id FROM code_questions WHERE title = 'Merge Sorted Arrays' ORDER BY id LIMIT 1), true, '[1,3]\n[2]', '2.0'),
((SELECT id FROM code_questions WHERE title = 'Merge Sorted Arrays' ORDER BY id LIMIT 1), false, '[1,2]\n[3,4]', '2.5'),
((SELECT id FROM code_questions WHERE title = 'Binary Tree Maximum Path Sum' ORDER BY id LIMIT 1), true, '[1,2,3]', '6'),
((SELECT id FROM code_questions WHERE title = 'Binary Tree Maximum Path Sum' ORDER BY id LIMIT 1), false, '[-10,9,20,null,null,15,7]', '42')
ON CONFLICT DO NOTHING;

-- Link code questions to assignments
INSERT INTO assignment_questions (assignment_id, question_id, points, position) VALUES
((SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1), (SELECT id FROM code_questions WHERE title = 'Two Sum Problem' ORDER BY id LIMIT 1), 50, 1),
((SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1), (SELECT id FROM code_questions WHERE title = 'Valid Parentheses' ORDER BY id LIMIT 1), 50, 2),
((SELECT id FROM assignments WHERE title = 'Algorithm Design Assignment' ORDER BY id LIMIT 1), (SELECT id FROM code_questions WHERE title = 'Merge Sorted Arrays' ORDER BY id LIMIT 1), 40, 1),
((SELECT id FROM assignments WHERE title = 'Algorithm Design Assignment' ORDER BY id LIMIT 1), (SELECT id FROM code_questions WHERE title = 'Binary Tree Maximum Path Sum' ORDER BY id LIMIT 1), 60, 2)
ON CONFLICT (assignment_id, question_id) DO NOTHING;

-- Create code submissions
INSERT INTO code_submissions (submission_id, language, code, run_output, test_results, created_at, assignment_question_id, started_at, completed_at, time_spent_seconds, gamified_score, attempts_count, efficiency_score) VALUES
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND student_id = 38), 'python', 'class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []', 'All test cases passed', '{"passed": 3, "total": 3, "time": 0.05}', NOW(), (SELECT id FROM assignment_questions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND position = 1), NOW() - INTERVAL '45 minutes', NOW(), 2700, 95, 1, 92.3),
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND student_id = 38), 'python', 'class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        mapping = {"(": ")", "[": "]", "{": "}"}
        for char in s:
            if char in mapping:
                stack.append(char)
            elif not stack or mapping[stack.pop()] != char:
                return False
        return not stack', 'All test cases passed', '{"passed": 4, "total": 4, "time": 0.03}', NOW(), (SELECT id FROM assignment_questions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND position = 2), NOW() - INTERVAL '30 minutes', NOW(), 1800, 90, 1, 88.7)
ON CONFLICT DO NOTHING;

-- Create code submission results
INSERT INTO code_submission_results (code_submission_id, testcase_id, passed, student_output, execution_time_ms, code_testcase_id) VALUES
((SELECT id FROM code_submissions WHERE assignment_question_id = (SELECT id FROM assignment_questions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND position = 1) LIMIT 1), NULL, true, '[0,1]', 45, (SELECT id FROM code_question_testcases WHERE question_id = (SELECT id FROM code_questions WHERE title = 'Two Sum Problem' ORDER BY id LIMIT 1) AND is_sample = true LIMIT 1)),
((SELECT id FROM code_submissions WHERE assignment_question_id = (SELECT id FROM assignment_questions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND position = 1) LIMIT 1), NULL, true, '[1,2]', 42, (SELECT id FROM code_question_testcases WHERE question_id = (SELECT id FROM code_questions WHERE title = 'Two Sum Problem' ORDER BY id LIMIT 1) AND is_sample = false LIMIT 1 OFFSET 0)),
((SELECT id FROM code_submissions WHERE assignment_question_id = (SELECT id FROM assignment_questions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND position = 1) LIMIT 1), NULL, true, '[0,1]', 38, (SELECT id FROM code_question_testcases WHERE question_id = (SELECT id FROM code_questions WHERE title = 'Two Sum Problem' ORDER BY id LIMIT 1) AND is_sample = false LIMIT 1 OFFSET 1))
ON CONFLICT (code_submission_id, code_testcase_id) DO NOTHING;

-- Create rubrics for assignments
INSERT INTO rubrics (title, description, course_offering_id, created_by, created_at, updated_at) VALUES
('Programming Assignment Rubric', 'Comprehensive evaluation rubric for programming assignments', (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 33, NOW(), NOW()),
('Algorithm Assignment Rubric', 'Evaluation criteria for algorithm design and implementation', (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 33, NOW(), NOW()),
('Database Project Rubric', 'Assessment rubric for database design projects', (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 33, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Create rubric criteria
INSERT INTO rubric_criteria (rubric_id, title, description, max_points, weight, position, created_at) VALUES
-- Programming Assignment Rubric
((SELECT id FROM rubrics WHERE title = 'Programming Assignment Rubric' ORDER BY id LIMIT 1), 'Code Correctness', 'Program produces correct output and handles all test cases', 30, 1.0, 1, NOW()),
((SELECT id FROM rubrics WHERE title = 'Programming Assignment Rubric' ORDER BY id LIMIT 1), 'Code Quality', 'Clean, readable, and well-structured code with proper naming', 20, 0.8, 2, NOW()),
((SELECT id FROM rubrics WHERE title = 'Programming Assignment Rubric' ORDER BY id LIMIT 1), 'Documentation', 'Proper comments, docstrings, and code documentation', 15, 0.6, 3, NOW()),
((SELECT id FROM rubrics WHERE title = 'Programming Assignment Rubric' ORDER BY id LIMIT 1), 'Efficiency', 'Optimal algorithm choice and implementation efficiency', 20, 0.8, 4, NOW()),
((SELECT id FROM rubrics WHERE title = 'Programming Assignment Rubric' ORDER BY id LIMIT 1), 'Testing', 'Comprehensive test cases and edge case handling', 15, 0.6, 5, NOW()),

-- Algorithm Assignment Rubric
((SELECT id FROM rubrics WHERE title = 'Algorithm Assignment Rubric' ORDER BY id LIMIT 1), 'Algorithm Correctness', 'Algorithm produces correct results for all cases', 35, 1.0, 1, NOW()),
((SELECT id FROM rubrics WHERE title = 'Algorithm Assignment Rubric' ORDER BY id LIMIT 1), 'Time Complexity', 'Optimal time complexity analysis and achievement', 25, 0.8, 2, NOW()),
((SELECT id FROM rubrics WHERE title = 'Algorithm Assignment Rubric' ORDER BY id LIMIT 1), 'Space Complexity', 'Efficient memory usage and space optimization', 20, 0.7, 3, NOW()),
((SELECT id FROM rubrics WHERE title = 'Algorithm Assignment Rubric' ORDER BY id LIMIT 1), 'Code Clarity', 'Clear, understandable, and maintainable code', 15, 0.6, 4, NOW()),
((SELECT id FROM rubrics WHERE title = 'Algorithm Assignment Rubric' ORDER BY id LIMIT 1), 'Edge Cases', 'Proper handling of edge cases and error conditions', 5, 0.3, 5, NOW()),

-- Database Project Rubric
((SELECT id FROM rubrics WHERE title = 'Database Project Rubric' ORDER BY id LIMIT 1), 'Schema Design', 'Proper normalization, relationships, and constraints', 30, 1.0, 1, NOW()),
((SELECT id FROM rubrics WHERE title = 'Database Project Rubric' ORDER BY id LIMIT 1), 'Query Optimization', 'Efficient SQL queries and indexing strategy', 25, 0.8, 2, NOW()),
((SELECT id FROM rubrics WHERE title = 'Database Project Rubric' ORDER BY id LIMIT 1), 'Data Integrity', 'Proper constraints, validation, and referential integrity', 20, 0.7, 3, NOW()),
((SELECT id FROM rubrics WHERE title = 'Database Project Rubric' ORDER BY id LIMIT 1), 'Documentation', 'Clear schema documentation and ER diagrams', 15, 0.6, 4, NOW()),
((SELECT id FROM rubrics WHERE title = 'Database Project Rubric' ORDER BY id LIMIT 1), 'Functionality', 'All required features implemented correctly', 10, 0.5, 5, NOW())
ON CONFLICT DO NOTHING;

-- Create rubric grades for submissions
INSERT INTO rubric_grades (submission_id, criterion_id, score, feedback, graded_by, graded_at) VALUES
-- Basic Programming Assignment
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND student_id = 38), (SELECT id FROM rubric_criteria WHERE rubric_id = (SELECT id FROM rubrics WHERE title = 'Programming Assignment Rubric' ORDER BY id LIMIT 1) AND title = 'Code Correctness'), 28, 'Excellent implementation with all test cases passing', 33, NOW()),
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND student_id = 38), (SELECT id FROM rubric_criteria WHERE rubric_id = (SELECT id FROM rubrics WHERE title = 'Programming Assignment Rubric' ORDER BY id LIMIT 1) AND title = 'Code Quality'), 18, 'Good variable naming and code structure', 33, NOW()),
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND student_id = 38), (SELECT id FROM rubric_criteria WHERE rubric_id = (SELECT id FROM rubrics WHERE title = 'Programming Assignment Rubric' ORDER BY id LIMIT 1) AND title = 'Documentation'), 13, 'Good comments but could use more docstrings', 33, NOW()),
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND student_id = 38), (SELECT id FROM rubric_criteria WHERE rubric_id = (SELECT id FROM rubrics WHERE title = 'Programming Assignment Rubric' ORDER BY id LIMIT 1) AND title = 'Efficiency'), 19, 'Optimal hash map approach used', 33, NOW()),
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND student_id = 38), (SELECT id FROM rubric_criteria WHERE rubric_id = (SELECT id FROM rubrics WHERE title = 'Programming Assignment Rubric' ORDER BY id LIMIT 1) AND title = 'Testing'), 14, 'Good test case coverage', 33, NOW()),

-- Algorithm Design Assignment
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Algorithm Design Assignment' ORDER BY id LIMIT 1) AND student_id = 38), (SELECT id FROM rubric_criteria WHERE rubric_id = (SELECT id FROM rubrics WHERE title = 'Algorithm Assignment Rubric' ORDER BY id LIMIT 1) AND title = 'Algorithm Correctness'), 32, 'Correct implementation of both algorithms', 53, NOW()),
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Algorithm Design Assignment' ORDER BY id LIMIT 1) AND student_id = 38), (SELECT id FROM rubric_criteria WHERE rubric_id = (SELECT id FROM rubrics WHERE title = 'Algorithm Assignment Rubric' ORDER BY id LIMIT 1) AND title = 'Time Complexity'), 22, 'Good complexity analysis provided', 53, NOW()),
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Algorithm Design Assignment' ORDER BY id LIMIT 1) AND student_id = 38), (SELECT id FROM rubric_criteria WHERE rubric_id = (SELECT id FROM rubrics WHERE title = 'Algorithm Assignment Rubric' ORDER BY id LIMIT 1) AND title = 'Space Complexity'), 18, 'Reasonable space usage', 53, NOW()),
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Algorithm Assignment Rubric' ORDER BY id LIMIT 1) AND title = 'Code Clarity'), 14, 'Code is readable and well-structured', 53, NOW()),
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Algorithm Design Assignment' ORDER BY id LIMIT 1) AND student_id = 38), (SELECT id FROM rubric_criteria WHERE rubric_id = (SELECT id FROM rubrics WHERE title = 'Algorithm Assignment Rubric' ORDER BY id LIMIT 1) AND title = 'Edge Cases'), 4, 'Most edge cases handled', 53, NOW())
ON CONFLICT (submission_id, criterion_id) DO NOTHING;

-- Create support tickets from DummyStudent
INSERT INTO support_tickets (user_id, title, description, category, status, priority, assigned_to, course_offering_id, created_at, updated_at) VALUES
(38, 'Cannot access programming assignment', 'Getting 403 Forbidden error when trying to access the Basic Programming Assignment. The page shows "Access Denied".', 'bug_report', 'open', 'high', NULL, (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
(38, 'Quiz timer issue', 'The quiz timer is counting backwards and shows negative time remaining. This happened during the Advanced Algorithms Quiz.', 'bug_report', 'in_progress', 'high', 53, (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
(38, 'Feature request: Code editor themes', 'Please add dark mode and more color themes to the code editor. The current theme causes eye strain during long coding sessions.', 'feature_request', 'open', 'medium', NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(38, 'Assignment submission confirmation', 'After submitting the Database Design Project, I did not receive any confirmation email or success message.', 'technical_issue', 'resolved', 'medium', 33, (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), NOW() - INTERVAL '12 hours', NOW() - INTERVAL '30 minutes'),
(38, 'Proctoring session disconnected', 'My proctoring session disconnected during the Advanced Algorithms Quiz and I was unable to resume. I lost 15 minutes of work.', 'technical_issue', 'in_progress', 'high', 33, (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;

-- Create ticket comments
INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal, created_at) VALUES
((SELECT id FROM support_tickets WHERE title = 'Quiz timer issue' ORDER BY id LIMIT 1), 53, 'We are investigating the timer issue. It appears to be related to timezone settings in the proctoring system.', true, NOW() - INTERVAL '1 hour'),
((SELECT id FROM support_tickets WHERE title = 'Quiz timer issue' ORDER BY id LIMIT 1), 38, 'Thanks for looking into this. The timer showed "-5:23" when I submitted. I was worried about being disqualified.', false, NOW() - INTERVAL '45 minutes'),
((SELECT id FROM support_tickets WHERE title = 'Assignment submission confirmation' ORDER BY id LIMIT 1), 33, 'We have fixed the email notification system. You should now receive confirmations for all submissions.', false, NOW() - INTERVAL '30 minutes'),
((SELECT id FROM support_tickets WHERE title = 'Proctoring session disconnected' ORDER BY id LIMIT 1), 33, 'We are reviewing the proctoring session logs. This appears to be a network connectivity issue on our end.', true, NOW() - INTERVAL '25 minutes'),
((SELECT id FROM support_tickets WHERE title = 'Proctoring session disconnected' ORDER BY id LIMIT 1), 38, 'I was using a stable WiFi connection. The disconnection happened exactly at 2:47 PM.', false, NOW() - INTERVAL '20 minutes')
ON CONFLICT DO NOTHING;

-- Create messages between users
INSERT INTO messages (sender_id, receiver_id, subject, content, is_read, sent_at, created_at) VALUES
(33, 38, 'Assignment Feedback', 'Great work on your Basic Programming Assignment! Your hash map implementation is very efficient. Keep up the good work.', true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(38, 33, 'Question about Algorithm Assignment', 'Professor, I have a question about the time complexity requirements for the Merge Sorted Arrays problem. Should I aim for O(m+n) time?', false, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),
(53, 38, 'TA Office Hours', 'Hi DummyStudent, I will be available in the TA office hours today from 3-5 PM. Feel free to come with questions about the assignments.', false, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
(38, 53, 'Clarification on Rubric', 'Hi DummyTA, could you clarify what "comprehensive test cases" means in the rubric? Should I include boundary conditions?', true, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
(33, 53, 'Grade Review Request', 'DummyTA, please review the rubric grades for DummyStudent''s Algorithm Assignment. The total seems a bit low.', false, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- Create notifications for DummyStudent
INSERT INTO notifications (user_id, title, body, is_read, created_at) VALUES
(38, 'Assignment Graded', 'Your Basic Programming Assignment has been graded. Score: 92/100', true, NOW() - INTERVAL '1 day'),
(38, 'New Assignment Available', 'Algorithm Design Assignment is now available in CSE304', false, NOW() - INTERVAL '3 days'),
(38, 'Quiz Starting Soon', 'Your Advanced Algorithms Quiz starts in 30 minutes', false, NOW() - INTERVAL '30 minutes'),
(38, 'Achievement Unlocked', 'Congratulations! You unlocked the "Code Master" achievement', true, NOW() - INTERVAL '2 days'),
(38, 'Proctoring Alert', 'Suspicious activity detected during your quiz session. Please check your environment.', false, NOW() - INTERVAL '10 hours'),
(38, 'Grade Updated', 'Your grade for Database Design Project has been updated', false, NOW() - INTERVAL '6 hours'),
(38, 'New Message', 'You have a new message from DummyTeacher', false, NOW() - INTERVAL '12 hours')
ON CONFLICT DO NOTHING;

-- Create discussion forum posts
INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content, created_at) VALUES
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 38, NULL, 'Can someone explain the difference between O(n log n) and O(n²) time complexity with practical examples?', NOW() - INTERVAL '3 days'),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 33, 1, 'O(n²) means the algorithm takes time proportional to the square of input size. For example, bubble sort takes O(n²) time. O(n log n) is faster - merge sort and quick sort achieve this.', NOW() - INTERVAL '3 days' + INTERVAL '1 hour'),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 38, 2, 'Thanks Professor! So for n=1000, O(n²) would be 1,000,000 operations while O(n log n) would be about 10,000 operations?', NOW() - INTERVAL '3 days' + INTERVAL '2 hours'),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 53, 1, 'Exactly! The logarithmic factor makes a huge difference for large inputs. That''s why we prefer O(n log n) sorting algorithms.', NOW() - INTERVAL '3 days' + INTERVAL '3 hours'),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 38, NULL, 'What are some good resources for learning dynamic programming? I''m struggling with the concept.', NOW() - INTERVAL '1 day'),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 33, 5, 'I recommend starting with the classic problems: Fibonacci, Knapsack, and Longest Common Subsequence. GeeksforGeeks has excellent explanations.', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes'),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 38, 6, 'Thank you! I''ll check out those resources. The Fibonacci example with memoization really helped clarify things.', NOW() - INTERVAL '1 day' + INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- Create videos for the course
INSERT INTO videos (title, description, uploaded_by, video_url, duration, cloudinary_public_id, upload_timestamp, created_at, updated_at, course_offering_id) VALUES
('Introduction to CSE304', 'Welcome to the Comprehensive LMS Testing Course! Overview of course objectives and expectations.', 33, 'https://example.com/CSE304-intro.mp4', 900.5, 'CSE304-intro-001', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1))),
('Programming Fundamentals', 'Basic programming concepts, variables, data types, and control structures.', 33, 'https://example.com/CSE304-programming.mp4', 1800.0, 'CSE304-programming-002', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1))),
('Algorithm Analysis', 'Understanding time and space complexity, Big O notation, and algorithm efficiency.', 33, 'https://example.com/CSE304-algorithms.mp4', 2100.25, 'CSE304-algorithms-003', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1))),
('Database Design Principles', 'Relational databases, normalization, ER diagrams, and SQL fundamentals.', 33, 'https://example.com/CSE304-database.mp4', 2400.75, 'CSE304-database-004', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)))
ON CONFLICT DO NOTHING;

-- Create video quiz questions
INSERT INTO video_quiz_questions (video_id, question_text, question_type, options, correct_answer, points, explanation, created_at, updated_at, timestamp) VALUES
((SELECT id FROM videos WHERE title = 'Introduction to CSE304' ORDER BY id LIMIT 1), 'What is the primary goal of this testing course?', 'mcq', '["To teach programming", "To test LMS features", "To learn databases", "To study algorithms"]', 'To test LMS features', 10.0, 'This course is designed specifically for comprehensive testing of all LMS functionality.', NOW(), NOW(), 450.0),
((SELECT id FROM videos WHERE title = 'Programming Fundamentals' ORDER BY id LIMIT 1), 'Which of the following is NOT a primitive data type in most programming languages?', 'mcq', '["Integer", "String", "Array", "Boolean"]', 'Array', 10.0, 'Arrays are composite data types, not primitive. Primitive types are the basic building blocks.', NOW(), NOW(), 900.0),
((SELECT id FROM videos WHERE title = 'Algorithm Analysis' ORDER BY id LIMIT 1), 'What does Big O notation represent?', 'mcq', '["Exact execution time", "Worst-case time complexity", "Average execution time", "Best-case scenario"]', 'Worst-case time complexity', 15.0, 'Big O notation describes the upper bound or worst-case time complexity of an algorithm.', NOW(), NOW(), 1200.0),
((SELECT id FROM videos WHERE title = 'Database Design Principles' ORDER BY id LIMIT 1), 'What is the purpose of database normalization?', 'essay', 'Normalize your answer to explain the concept clearly.', 'To eliminate data redundancy and ensure data integrity by organizing data into tables with minimal duplication.', 20.0, 'Normalization reduces data redundancy and prevents anomalies in database operations.', NOW(), NOW(), 1500.0)
ON CONFLICT DO NOTHING;

-- Create video quiz attempts
INSERT INTO video_quiz_attempts (video_id, student_id, started_at, completed_at, score, max_score, answers, created_at, updated_at) VALUES
((SELECT id FROM videos WHERE title = 'Introduction to CSE304' ORDER BY id LIMIT 1), 38, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '5 minutes', 10.0, 10.0, '{"1": "To test LMS features"}', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
((SELECT id FROM videos WHERE title = 'Programming Fundamentals' ORDER BY id LIMIT 1), 38, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '8 minutes', 8.0, 10.0, '{"2": "Array"}', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
((SELECT id FROM videos WHERE title = 'Algorithm Analysis' ORDER BY id LIMIT 1), 38, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '12 minutes', 13.0, 15.0, '{"3": "Worst-case time complexity"}', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
((SELECT id FROM videos WHERE title = 'Database Design Principles' ORDER BY id LIMIT 1), 38, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '15 minutes', 18.0, 20.0, '{"4": "Database normalization eliminates data redundancy and ensures data integrity by organizing data into related tables with minimal duplication, preventing update, insert, and delete anomalies."}', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
ON CONFLICT (video_id, student_id) DO NOTHING;

-- Create study materials
INSERT INTO study_materials (department_id, course_id, title, description, category, material, storage_path, filename, uploaded_by, created_at, updated_at) VALUES
(11, (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1), 'Python Cheat Sheet', 'Quick reference guide for Python syntax, data structures, and common operations', 'Reference', 'notes', '/materials/CSE304-python-cheat-sheet.pdf', 'python-cheat-sheet.pdf', 33, NOW(), NOW()),
(11, (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1), 'Algorithm Complexity Guide', 'Visual guide to understanding time and space complexity with examples', 'Study Aid', 'presentation', '/materials/CSE304-complexity-guide.pptx', 'complexity-guide.pptx', 33, NOW(), NOW()),
(11, (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1), 'SQL Query Examples', 'Comprehensive collection of SQL queries for common database operations', 'Practice', 'question_bank', '/materials/CSE304-sql-examples.pdf', 'sql-examples.pdf', 33, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Add gamification data for DummyStudent
INSERT INTO user_gamification_stats (user_id, total_points, current_streak, longest_streak, problems_solved, easy_solved, medium_solved, hard_solved, total_submissions, successful_submissions, average_time_seconds, last_submission_date, level, experience_points, quizzes_completed, perfect_quiz_scores, high_quiz_scores, fast_quiz_completions, total_quiz_score, average_quiz_score, quiz_streak, last_quiz_date, unique_course_quizzes) VALUES
(38, 450, 5, 7, 15, 10, 4, 1, 18, 16, 1500, CURRENT_DATE, 4, 1200, 3, 1, 2, 1, 225, 75.0, 3, CURRENT_DATE, 2)
ON CONFLICT (user_id) DO NOTHING;

-- Add achievements for DummyStudent
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES
(38, 1, NOW() - INTERVAL '10 days'), -- First Submission
(38, 2, NOW() - INTERVAL '8 days'), -- Problem Solver
(38, 4, NOW() - INTERVAL '5 days'), -- Perfect Score
(38, 6, NOW() - INTERVAL '3 days') -- Quiz Champion
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Add daily challenges
INSERT INTO daily_challenges (date, question_id, bonus_points, is_active, created_at) VALUES
(CURRENT_DATE, 1, 50, true, NOW()),
(CURRENT_DATE - INTERVAL '1 day', 2, 50, true, NOW())
ON CONFLICT (date) DO NOTHING;

-- Add user daily challenge completions
INSERT INTO user_daily_challenges (user_id, challenge_id, completed_at, points_earned, time_spent_seconds) VALUES
(38, 1, NOW() - INTERVAL '2 hours', 50, 1200),
(38, 2, NOW() - INTERVAL '1 day' - INTERVAL '3 hours', 50, 900)
ON CONFLICT (user_id, challenge_id) DO NOTHING;

-- Add leaderboards
INSERT INTO leaderboards (leaderboard_type, reference_id, user_id, score, rank, time_spent_seconds, submission_date, period_start, period_end) VALUES
('course', (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 38, 92, 1, 2700, CURRENT_DATE, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE),
('assignment', (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1), 38, 92, 1, 2700, CURRENT_DATE, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE),
('global', NULL, 38, 450, 2, NULL, CURRENT_DATE, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE)
ON CONFLICT (leaderboard_type, reference_id, user_id, period_start) DO NOTHING;

-- Add more assignments to cover all cases
INSERT INTO assignments (course_offering_id, title, description, assignment_type, release_at, due_at, max_score, allow_multiple_submissions, created_by, created_at) VALUES
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 'Past Due Unsubmitted Assignment', 'This assignment is past due and was not submitted', 'code', NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days', 100, false, 33, NOW()),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 'Current Unsubmitted Assignment', 'This assignment is currently available but not submitted', 'file', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 100, false, 33, NOW()),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 'Future Assignment', 'This assignment will be available in the future', 'code', NOW() + INTERVAL '2 days', NOW() + INTERVAL '9 days', 100, true, 33, NOW())
ON CONFLICT DO NOTHING;

-- Add more quiz attempts with different scores
INSERT INTO quiz_attempts (quiz_id, student_id, started_at, finished_at, score, answers, violated) VALUES
((SELECT id FROM quizzes WHERE title = 'Basic Programming Quiz' ORDER BY id LIMIT 1), 38, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '20 minutes', 35, '{"1": "6", "2": "string", "3": "[1,2,3,4,5]", "4": "Functions are defined using def keyword, methods belong to objects.", "5": "def is_even(n): return n % 2 == 0"}', false), -- Lower score attempt
((SELECT id FROM quizzes WHERE title = 'Database Concepts Quiz' ORDER BY id LIMIT 1), 38, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '5 hours', 50, '{"8": "Atomicity, Consistency, Isolation, Durability", "9": "3NF", "10": "INNER JOIN returns only matching rows, LEFT JOIN returns all rows from left table.", "11": "SELECT e.name FROM employees e WHERE e.salary > (SELECT m.salary FROM employees m WHERE m.id = e.manager_id)"}', false) -- Completed database quiz
ON CONFLICT DO NOTHING;

-- Add failed code submission
INSERT INTO code_submissions (submission_id, language, code, run_output, test_results, created_at, assignment_question_id, started_at, completed_at, time_spent_seconds, gamified_score, attempts_count, efficiency_score) VALUES
((SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND student_id = 38), 'python', 'def twoSum(nums, target):
    for i in range(len(nums)):
        for j in range(i+1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []', 'Test failed: Time limit exceeded', '{"passed": 1, "total": 3, "time": 5.2}', NOW(), (SELECT id FROM assignment_questions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Basic Programming Assignment' ORDER BY id LIMIT 1) AND position = 1), NOW() - INTERVAL '50 minutes', NOW(), 3000, 70, 2, 65.3)
ON CONFLICT DO NOTHING;

-- Add more support tickets with different statuses
INSERT INTO support_tickets (user_id, title, description, category, status, priority, assigned_to, course_offering_id, created_at, updated_at) VALUES
(38, 'Code editor bug', 'The code editor is not saving my changes automatically. I have to manually save every few minutes.', 'bug_report', 'closed', 'low', 53, (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
(53, 'TA workload request', 'Requesting additional TA hours for grading the increased assignment load this semester.', 'feature_request', 'pending', 'medium', 33, (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(33, 'Course material update', 'Need to update the course syllabus to reflect the new programming language requirements.', 'technical_issue', 'open', 'low', NULL, (SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Add more notifications
INSERT INTO notifications (user_id, title, body, is_read, created_at) VALUES
(38, 'Assignment Deadline Reminder', 'Your Database Design Project is due in 2 days. Don''t forget to submit!', false, NOW() - INTERVAL '2 days'),
(38, 'Weekly Progress Report', 'You have completed 75% of this week''s assignments. Keep up the good work!', false, NOW() - INTERVAL '1 day'),
(53, 'New Support Ticket Assigned', 'A new support ticket has been assigned to you: "Code editor bug"', false, NOW() - INTERVAL '5 days'),
(33, 'TA Request Submitted', 'Your request for additional TA hours has been submitted and is pending review.', false, NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Add more discussion posts
INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content, created_at) VALUES
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 38, NULL, 'Does anyone have tips for debugging recursive functions? I keep getting stack overflow errors.', NOW() - INTERVAL '2 days'),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 53, 8, 'Try adding print statements to track the recursion depth, and make sure your base case is correct. Also, consider iterative solutions for deep recursion.', NOW() - INTERVAL '2 days' + INTERVAL '2 hours'),
((SELECT id FROM course_offerings WHERE course_id = (SELECT id FROM courses WHERE code = 'CSE304' ORDER BY id LIMIT 1)), 33, NULL, 'Reminder: Office hours have been moved to Tuesday and Thursday 4-6 PM due to scheduling conflicts.', NOW() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;
