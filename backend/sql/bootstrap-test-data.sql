-- Deterministic test data for broad LMS feature coverage
-- Uses explicit IDs to avoid sequence drift issues on partially-initialized databases

BEGIN;

-- Core reference data
INSERT INTO departments (id, code, name) VALUES
(101, 'CSE', 'Computer Science and Engineering'),
(102, 'ECE', 'Electronics and Communication Engineering'),
(103, 'ME', 'Mechanical Engineering')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (
  id, email, name, role, department_id, password_hash, roll_number, is_active, created_at, updated_at,
  github_username, github_connected_at
) VALUES
(110, 'admin.test@lms.edu', 'Test Admin', 'admin', 101, '$2b$10$dummy.hash.for.demo', NULL, true, NOW(), NOW(), NULL, NULL),
(111, 'faculty.alice@lms.edu', 'Dr. Alice Johnson', 'faculty', 101, '$2b$10$dummy.hash.for.demo', NULL, true, NOW(), NOW(), NULL, NULL),
(112, 'faculty.bob@lms.edu', 'Prof. Bob Smith', 'faculty', 101, '$2b$10$dummy.hash.for.demo', NULL, true, NOW(), NOW(), NULL, NULL),
(113, 'ta.tina@lms.edu', 'Tina TA', 'ta', 101, '$2b$10$dummy.hash.for.demo', NULL, true, NOW(), NOW(), NULL, NULL),
(114, 'ta.omar@lms.edu', 'Omar TA', 'ta', 101, '$2b$10$dummy.hash.for.demo', NULL, true, NOW(), NOW(), NULL, NULL),
(120, 'student.alice@lms.edu', 'Alice Student', 'student', 101, '$2b$10$dummy.hash.for.demo', 'CS2026001', true, NOW(), NOW(), NULL, NULL),
(121, 'student.bob@lms.edu', 'Bob Student', 'student', 101, '$2b$10$dummy.hash.for.demo', 'CS2026002', true, NOW(), NOW(), NULL, NULL),
(122, 'student.carol@lms.edu', 'Carol Student', 'student', 101, '$2b$10$dummy.hash.for.demo', 'CS2026003', true, NOW(), NOW(), NULL, NULL),
(123, 'student.github@lms.edu', 'GitHub Student', 'student', 101, '$2b$10$dummy.hash.for.demo', 'CS2026004', true, NOW(), NOW(), 'github-student', NOW() - INTERVAL '7 days'),
(124, 'student.pending@lms.edu', 'Pending Approval Student', 'student', 101, NULL, 'CS2026999', false, NOW(), NOW(), NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO admins (user_id, is_super, created_at, created_by) VALUES
(110, false, NOW(), 44)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO courses (id, code, title, description, department_id, credits, created_at) VALUES
(201, 'CS101', 'Introduction to Programming', 'Programming fundamentals with Python', 101, 4, NOW()),
(202, 'CS201', 'Data Structures and Algorithms', 'Core data structures and algorithmic thinking', 101, 4, NOW()),
(203, 'CS301', 'Database Systems', 'Relational modeling, SQL, and indexing', 101, 3, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_offerings (id, course_id, term, section, faculty_id, max_capacity, start_date, end_date, created_at) VALUES
(301, 201, 'Fall 2026', 'A', 111, 60, '2026-08-15', '2026-12-15', NOW()),
(302, 202, 'Fall 2026', 'A', 111, 50, '2026-08-15', '2026-12-15', NOW()),
(303, 203, 'Fall 2026', 'A', 112, 45, '2026-08-15', '2026-12-15', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO faculty_courses (course_id, faculty_id, assigned_at) VALUES
(201, 111, NOW()),
(202, 111, NOW()),
(203, 112, NOW())
ON CONFLICT (course_id, faculty_id) DO NOTHING;

INSERT INTO faculty_course_offerings (course_offering_id, faculty_id, assigned_at) VALUES
(301, 111, NOW()),
(302, 111, NOW()),
(303, 112, NOW())
ON CONFLICT (course_offering_id, faculty_id) DO NOTHING;

INSERT INTO ta_assignments (course_offering_id, ta_id, role, assigned_at) VALUES
(301, 113, 'ta', NOW()),
(302, 113, 'ta', NOW()),
(303, 114, 'ta', NOW())
ON CONFLICT (course_offering_id, ta_id) DO NOTHING;

INSERT INTO enrollments (course_offering_id, student_id, enrolled_at, status) VALUES
(301, 120, NOW(), 'active'),
(301, 121, NOW(), 'active'),
(301, 122, NOW(), 'active'),
(302, 120, NOW(), 'active'),
(302, 121, NOW(), 'active'),
(303, 120, NOW(), 'active'),
(303, 123, NOW(), 'active')
ON CONFLICT (course_offering_id, student_id) DO NOTHING;

INSERT INTO resources (id, course_offering_id, uploaded_by, title, description, resource_type, storage_path, filename, uploaded_at) VALUES
(401, 301, 111, 'CS101 Lecture Notes', 'Introductory lecture notes and examples', 'lecture_note', '/resources/cs101-notes.pdf', 'cs101-notes.pdf', NOW() - INTERVAL '10 days'),
(402, 301, 111, 'CS101 PYQs', 'Previous year practice questions', 'pyq', '/resources/cs101-pyq.pdf', 'cs101-pyq.pdf', NOW() - INTERVAL '8 days'),
(403, 302, 111, 'Sorting Handout', 'Sorting algorithms comparison sheet', 'lecture_note', '/resources/cs201-sorting.pdf', 'cs201-sorting.pdf', NOW() - INTERVAL '6 days'),
(404, 303, 112, 'Normalization Guide', 'Database normalization examples', 'lecture_note', '/resources/cs301-normalization.pdf', 'cs301-normalization.pdf', NOW() - INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO assignments (
  id, course_offering_id, title, description, assignment_type, release_at, due_at, max_score,
  allow_multiple_submissions, created_by, created_at, allow_github_repo, file_size_limit_mb
) VALUES
(501, 301, 'Hello World Program', 'Write a simple program that prints Hello World.', 'code', NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days', 100, false, 111, NOW(), false, 10),
(502, 301, 'Basic Calculator', 'Build a calculator with arithmetic operations and validation.', 'code', NOW() - INTERVAL '3 days', NOW() + INTERVAL '10 days', 100, true, 111, NOW(), true, 20),
(503, 302, 'Sorting Algorithms', 'Implement and compare bubble sort, merge sort, and quick sort.', 'code', NOW() - INTERVAL '5 days', NOW() + INTERVAL '5 days', 100, false, 111, NOW(), false, 15),
(504, 303, 'Database Design Project', 'Design a normalized schema and submit documentation.', 'file', NOW() - INTERVAL '10 days', NOW() + INTERVAL '4 days', 100, true, 112, NOW(), true, 25)
ON CONFLICT (id) DO NOTHING;

INSERT INTO code_questions (
  id, title, description, constraints, created_by, created_at, difficulty, time_limit_seconds, max_points, template_code, driver_code
) VALUES
(801, 'Two Sum Problem', 'Return the indices of the two numbers that add up to the target.', 'O(n) target solution expected', 111, NOW(), 'easy', 1800, 100, '{"python":"def solve(nums, target):\\n    pass"}', '{"python":"print(solve(nums, target))"}'),
(802, 'Valid Parentheses', 'Validate bracket pairing using a stack.', 'Use stack; handle (), {}, []', 111, NOW(), 'medium', 1800, 100, '{"python":"def is_valid(s):\\n    pass"}', '{"python":"print(is_valid(s))"}'),
(803, 'Maximum Subarray', 'Find the maximum subarray sum using Kadane''s algorithm.', 'Target O(n)', 111, NOW(), 'medium', 1800, 100, '{"python":"def max_subarray(nums):\\n    pass"}', '{"python":"print(max_subarray(nums))"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO code_question_testcases (id, question_id, is_sample, input_text, expected_text, created_at) VALUES
(811, 801, true, '[2,7,11,15]\n9', '[0,1]', NOW()),
(812, 801, false, '[3,2,4]\n6', '[1,2]', NOW()),
(813, 802, true, '"()[]{}"', 'true', NOW()),
(814, 802, false, '"([)]"', 'false', NOW()),
(815, 803, true, '[-2,1,-3,4,-1,2,1,-5,4]', '6', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO assignment_questions (id, assignment_id, question_id, points, position) VALUES
(821, 501, 801, 100, 1),
(822, 502, 802, 50, 1),
(823, 502, 801, 50, 2),
(824, 503, 803, 100, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO assignment_testcases (id, assignment_id, input, expected_output, is_hidden, created_at) VALUES
(831, 501, '[2,7,11,15]\n9', '[0,1]', false, NOW()),
(832, 502, '"()[]{}"', 'true', false, NOW()),
(833, 503, '[-2,1,-3,4,-1,2,1,-5,4]', '6', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO assignment_comments (id, assignment_id, user_id, parent_id, content, is_instructor_reply, created_at, updated_at) VALUES
(841, 502, 120, NULL, 'Should division by zero return an error message or raise an exception?', false, NOW() - INTERVAL '18 hours', NOW() - INTERVAL '18 hours'),
(842, 502, 113, 841, 'Return a validation message and include tests for that path.', true, NOW() - INTERVAL '17 hours', NOW() - INTERVAL '17 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO assignment_submissions (
  id, assignment_id, student_id, submitted_at, status, final_score, grader_id, graded_at, comments, attempt
) VALUES
(701, 501, 120, NOW() - INTERVAL '3 days', 'graded', 95, 111, NOW() - INTERVAL '2 days', 'Clean and correct solution.', 1),
(702, 501, 121, NOW() - INTERVAL '2 days', 'graded', 88, 113, NOW() - INTERVAL '1 day', 'Works correctly, but comments are limited.', 1),
(703, 502, 120, NOW() - INTERVAL '12 hours', 'submitted', NULL, NULL, NULL, NULL, 1),
(704, 503, 120, NOW() - INTERVAL '2 days', 'graded', 91, 111, NOW() - INTERVAL '1 day', 'Good complexity analysis.', 1),
(705, 504, 120, NOW() - INTERVAL '6 hours', 'submitted', NULL, NULL, NULL, NULL, 1),
(706, 504, 123, NOW() - INTERVAL '2 hours', 'submitted', NULL, NULL, NULL, NULL, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO submission_files (id, submission_id, storage_path, filename, file_size, mime_type, uploaded_at) VALUES
(711, 705, '/submissions/database-design-alice.pdf', 'database-design-alice.pdf', 1200000, 'application/pdf', NOW() - INTERVAL '6 hours'),
(712, 706, '/submissions/database-design-github.zip', 'database-design-github.zip', 2200000, 'application/zip', NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO file_submissions (id, submission_id, zip_file_url, submission_type, created_at) VALUES
(721, 705, 'https://example.com/submissions/database-design-alice.zip', 'file', NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO github_submissions (
  id, submission_id, repo_url, repo_name, repo_description, repo_language, repo_private,
  repo_stars, repo_forks, repo_created_at, repo_updated_at, repo_default_branch, repo_size_kb, created_at
) VALUES
(722, 706, 'https://github.com/github-student/database-design-project', 'database-design-project', 'Database design project repository', 'SQL', false, 8, 3, NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 hours', 'main', 512, NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO mixed_submissions (
  id, submission_id, zip_file_url, repo_url, repo_name, repo_description, repo_language, repo_private,
  repo_stars, repo_forks, repo_created_at, repo_updated_at, repo_default_branch, repo_size_kb, submission_type, created_at
) VALUES
(723, 703, 'https://example.com/submissions/basic-calculator.zip', 'https://github.com/alice/basic-calculator', 'basic-calculator', 'Mixed submission for calculator assignment', 'Python', false, 4, 1, NOW() - INTERVAL '5 days', NOW() - INTERVAL '12 hours', 'main', 220, 'mixed', NOW() - INTERVAL '12 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO assignment_component_submissions (id, assignment_submission_id, component_id, submission_type, content, file_path, metadata, submitted_at) VALUES
(731, 703, 'main_component', 'code', 'def calculate(a, b, op): return eval(f"{a}{op}{b}")', NULL, '{"language":"python"}', NOW() - INTERVAL '12 hours'),
(732, 705, 'main_component', 'file', NULL, '/submissions/database-design-alice.pdf', '{"filename":"database-design-alice.pdf"}', NOW() - INTERVAL '6 hours'),
(733, 706, 'main_component', 'link', 'https://github.com/github-student/database-design-project', NULL, '{"provider":"github"}', NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO component_grades (id, assignment_submission_id, component_id, score, feedback, graded_by, graded_at) VALUES
(741, 701, 'main_component', 95, 'Excellent correctness and style.', 111, NOW() - INTERVAL '2 days'),
(742, 704, 'main_component', 91, 'Strong solution with good explanation.', 111, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO code_submissions (
  id, submission_id, language, code, run_output, test_results, created_at, assignment_question_id,
  started_at, completed_at, time_spent_seconds, gamified_score, attempts_count, efficiency_score
) VALUES
(901, 701, 'python', 'def solve(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i', 'All tests passed', '{"passed":2,"total":2}', NOW() - INTERVAL '3 days', 821, NOW() - INTERVAL '3 days' - INTERVAL '20 minutes', NOW() - INTERVAL '3 days', 1200, 95, 1, 93.5),
(902, 703, 'python', 'def is_valid(s):\n    stack=[]\n    pairs={")":"(","}":"{","]":"["}\n    for ch in s:\n        if ch in "({[": stack.append(ch)\n        elif not stack or stack.pop()!=pairs[ch]: return False\n    return not stack', 'Submitted for review', '{"passed":1,"total":2}', NOW() - INTERVAL '12 hours', 822, NOW() - INTERVAL '12 hours' - INTERVAL '15 minutes', NOW() - INTERVAL '12 hours', 900, 70, 1, 80.0),
(903, 704, 'python', 'def max_subarray(nums):\n    best = cur = nums[0]\n    for n in nums[1:]:\n        cur = max(n, cur + n)\n        best = max(best, cur)\n    return best', 'All tests passed', '{"passed":1,"total":1}', NOW() - INTERVAL '2 days', 824, NOW() - INTERVAL '2 days' - INTERVAL '25 minutes', NOW() - INTERVAL '2 days', 1500, 91, 1, 90.2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO code_submission_results (id, code_submission_id, testcase_id, passed, student_output, error_output, execution_time_ms, created_at, code_testcase_id) VALUES
(911, 901, 831, true, '[0,1]', NULL, 5, NOW() - INTERVAL '3 days', 811),
(912, 901, NULL, true, '[1,2]', NULL, 4, NOW() - INTERVAL '3 days', 812),
(913, 902, 832, true, 'true', NULL, 3, NOW() - INTERVAL '12 hours', 813),
(914, 903, 833, true, '6', NULL, 4, NOW() - INTERVAL '2 days', 815)
ON CONFLICT (id) DO NOTHING;

-- Quizzes and proctoring
INSERT INTO quizzes (
  id, course_offering_id, title, start_at, end_at, max_score, is_proctored, time_limit,
  proctoring_config_id, allow_suspension_resume
) VALUES
(601, 301, 'Python Basics Quiz', NOW() - INTERVAL '4 days', NOW() + INTERVAL '4 days', 50, false, 30, NULL, true),
(602, 301, 'Programming Concepts Quiz', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 75, true, 45, NULL, true),
(603, 302, 'Algorithm Analysis Quiz', NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 days', 100, true, 60, NULL, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, metadata) VALUES
(611, 601, 'What is the output of print(2 + 3)?', 'mcq', '{"options":["5","23","Error"],"correct_answer":"5","points":5}'),
(612, 601, 'Which data type is mutable in Python?', 'mcq', '{"options":["tuple","list","str"],"correct_answer":"list","points":5}'),
(613, 602, 'Explain recursion with an example.', 'essay', '{"points":25,"max_length":400}'),
(614, 602, 'Write a function that checks prime numbers.', 'code', '{"points":25,"language":"python"}'),
(615, 603, 'What is the worst-case complexity of bubble sort?', 'mcq', '{"options":["O(n)","O(log n)","O(n^2)"],"correct_answer":"O(n^2)","points":10}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_attempts (
  id, quiz_id, student_id, started_at, finished_at, score, answers, proctoring_session_id,
  suspension_reason, suspended_at, resumed_at, resumed_by, violated
) VALUES
(1001, 601, 120, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '20 minutes', 45, '{"611":"5","612":"list"}', NULL, NULL, NULL, NULL, NULL, false),
(1002, 601, 121, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '22 minutes', 40, '{"611":"5","612":"str"}', NULL, NULL, NULL, NULL, NULL, false),
(1003, 602, 120, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '40 minutes', 68, '{"613":"Recursion is a function calling itself.","614":"def is_prime(n): ..."}', NULL, NULL, NULL, NULL, NULL, false),
(1004, 603, 120, NOW() - INTERVAL '2 hours', NULL, NULL, '{}', NULL, 'Connection interrupted', NOW() - INTERVAL '90 minutes', NULL, NULL, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO proctoring_configs (
  id, quiz_id, name, webcam_required, screen_monitoring, audio_monitoring, face_detection_required,
  max_warnings, auto_suspend_severity, allow_recovery, recovery_wait_seconds, violation_score_penalty,
  suspension_requires_teacher, live_monitoring_enabled, record_sessions, created_by, created_at, updated_at
) VALUES
(1111, 602, 'Standard Proctoring', true, true, false, true, 3, 3, true, 30, 1.0, true, false, true, 111, NOW(), NOW()),
(1112, 603, 'Strict Proctoring', true, true, true, true, 2, 2, false, 60, 1.5, false, true, true, 111, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE quizzes SET proctoring_config_id = 1111 WHERE id = 602;
UPDATE quizzes SET proctoring_config_id = 1112 WHERE id = 603;

INSERT INTO proctoring_sessions (
  id, quiz_attempt_id, student_id, started_at, ended_at, device_info, browser_info, session_token, status,
  webcam_enabled, screen_monitoring_enabled, audio_monitoring_enabled, created_at, updated_at
) VALUES
(1121, 1003, 120, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '40 minutes', '{"os":"Windows 11"}', '{"browser":"Chrome 123"}', 'proctor-1003', 'completed', true, true, false, NOW(), NOW()),
(1122, 1004, 120, NOW() - INTERVAL '2 hours', NULL, '{"os":"Windows 11"}', '{"browser":"Chrome 123"}', 'proctor-1004', 'suspended', true, true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE quiz_attempts SET proctoring_session_id = 1121 WHERE id = 1003;
UPDATE quiz_attempts SET proctoring_session_id = 1122 WHERE id = 1004;

INSERT INTO proctoring_violations (id, session_id, violation_type, severity, timestamp, evidence_data, evidence_url, description, resolved, resolved_by, resolved_at, created_at) VALUES
(1131, 1121, 'face_not_visible', 2, NOW() - INTERVAL '1 day' + INTERVAL '10 minutes', '{"confidence":0.84}', '/evidence/face-not-visible.jpg', 'Student briefly moved out of frame.', true, 111, NOW() - INTERVAL '1 day' + INTERVAL '20 minutes', NOW()),
(1132, 1122, 'multiple_tabs', 3, NOW() - INTERVAL '95 minutes', '{"tab_count":3}', '/evidence/multiple-tabs.png', 'Multiple tabs detected during active attempt.', false, NULL, NULL, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO proctoring_analytics (id, session_id, total_violations, violations_by_type, violations_by_severity, session_duration_seconds, compliance_score, risk_level, flagged_for_review, reviewed_by, reviewed_at, created_at) VALUES
(1141, 1121, 1, '{"face_not_visible":1}', '{"2":1}', 2400, 88.5, 'medium', true, 111, NOW() - INTERVAL '20 hours', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO resume_requests (id, student_id, quiz_attempt_id, proctoring_session_id, reason, status, requested_at, reviewed_by, reviewed_at, response_message, created_at, updated_at) VALUES
(1151, 120, 1004, 1122, 'Network disconnected during the quiz. Requesting resume access.', 'pending', NOW() - INTERVAL '80 minutes', NULL, NULL, NULL, NOW() - INTERVAL '80 minutes', NOW() - INTERVAL '80 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ta_quiz_permissions (id, quiz_id, ta_id, can_view, can_edit, can_create, granted_by, granted_at) VALUES
(1161, 601, 113, true, false, false, 111, NOW() - INTERVAL '2 days'),
(1162, 602, 113, true, true, false, 111, NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_access_requests (id, quiz_id, ta_id, teacher_id, request_type, status, requested_at) VALUES
(1171, 603, 113, 111, 'edit', 'pending', NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;

-- Gamification
INSERT INTO achievements (id, name, description, icon, category, requirement_type, requirement_value, points_reward, rarity, is_active, created_at) VALUES
(1201, 'First Submission', 'Submit your first assignment', 'target', 'progress', 'submissions', 1, 10, 'common', true, NOW()),
(1202, 'Problem Solver', 'Solve 10 coding problems', 'brain', 'coding', 'problems_solved', 10, 50, 'common', true, NOW()),
(1203, 'Quiz Champion', 'Score 90%+ on quizzes repeatedly', 'trophy', 'quiz', 'high_quiz_scores', 3, 80, 'rare', true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES
(120, 1201, NOW() - INTERVAL '3 days'),
(120, 1202, NOW() - INTERVAL '1 day'),
(121, 1201, NOW() - INTERVAL '2 days')
ON CONFLICT (user_id, achievement_id) DO NOTHING;

INSERT INTO user_gamification_stats (
  user_id, total_points, current_streak, longest_streak, problems_solved, easy_solved, medium_solved, hard_solved,
  total_submissions, successful_submissions, average_time_seconds, last_submission_date, level, experience_points,
  quizzes_completed, perfect_quiz_scores, high_quiz_scores, fast_quiz_completions, total_quiz_score, average_quiz_score,
  quiz_streak, last_quiz_date, unique_course_quizzes
) VALUES
(120, 240, 4, 6, 12, 7, 4, 1, 8, 7, 1300, CURRENT_DATE, 3, 720, 3, 0, 2, 1, 113, 56.5, 2, CURRENT_DATE, 2),
(121, 95, 1, 2, 4, 3, 1, 0, 3, 2, 1600, CURRENT_DATE - INTERVAL '1 day', 1, 260, 1, 0, 0, 0, 40, 40.0, 1, CURRENT_DATE - INTERVAL '2 days', 1)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO daily_challenges (id, date, question_id, bonus_points, is_active, created_at) VALUES
(1211, CURRENT_DATE, 801, 50, true, NOW()),
(1212, CURRENT_DATE - INTERVAL '1 day', 802, 50, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_daily_challenges (user_id, challenge_id, completed_at, points_earned, time_spent_seconds) VALUES
(120, 1211, NOW() - INTERVAL '2 hours', 50, 900),
(120, 1212, NOW() - INTERVAL '1 day' - INTERVAL '2 hours', 50, 1200)
ON CONFLICT (user_id, challenge_id) DO NOTHING;

INSERT INTO leaderboards (id, leaderboard_type, reference_id, user_id, score, rank, time_spent_seconds, submission_date, period_start, period_end) VALUES
(1221, 'course', 301, 120, 95, 1, 1200, CURRENT_DATE, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE),
(1222, 'course', 301, 121, 88, 2, 1400, CURRENT_DATE, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE),
(1223, 'global', NULL, 120, 240, 1, NULL, CURRENT_DATE, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- Contest data and AI editor logs
INSERT INTO contests (id, course_offering_id, title, description, start_at, end_at, max_score, allow_multiple_submissions, is_active, created_by, created_at, updated_at) VALUES
(1301, 302, 'CS201 Midterm Coding Contest', 'Timed contest for DSA practice.', NOW() - INTERVAL '12 hours', NOW() + INTERVAL '12 hours', 200, true, true, 111, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contest_questions (id, contest_id, question_id, points, position) VALUES
(1302, 1301, 801, 100, 1),
(1303, 1301, 803, 100, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO contest_submissions (id, contest_id, student_id, submitted_at, final_score, comments, graded_at, grader_id) VALUES
(1311, 1301, 120, NOW() - INTERVAL '3 hours', 175, 'Strong performance across both problems.', NOW() - INTERVAL '2 hours', 111)
ON CONFLICT (id) DO NOTHING;

INSERT INTO contest_submission_details (id, contest_submission_id, question_id, code, language, score, feedback, submitted_at) VALUES
(1312, 1311, 801, 'def solve(nums, target): return [0,1]', 'python', 90, 'Optimal approach.', NOW() - INTERVAL '3 hours'),
(1313, 1311, 803, 'def max_subarray(nums): return 6', 'python', 85, 'Correct result but explanation omitted.', NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contest_editor_settings (id, user_id, contest_id, ai_enabled, distraction_mode, max_ai_queries, theme, created_at, updated_at) VALUES
(1314, 120, 1301, true, true, 10, 'light', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO code_analysis_logs (id, user_id, question_id, code_hash, time_complexity, space_complexity, analysis, analyzed_at) VALUES
(1321, 120, 801, 'hash-two-sum-v1', 'O(n)', 'O(n)', 'Uses a hash map to find complement indices in one pass.', NOW() - INTERVAL '5 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO logical_bug_injections (id, user_id, question_id, original_code, modified_code, bug_type, bug_description, created_at) VALUES
(1322, 120, 801, 'nums[i] + nums[j] == target', 'nums[i] - nums[j] == target', 'operator_swap', 'Introduced subtraction bug for debugging practice.', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ai_query_logs (id, user_id, question_id, query_type, code_hash, response_preview, contest_mode, created_at) VALUES
(1323, 120, 801, 'complexity_analysis', 'hash-two-sum-v1', 'Detected linear-time hash map solution.', false, NOW() - INTERVAL '4 hours'),
(1324, 120, 801, 'bug_injection', 'hash-two-sum-v1', 'Injected operator-swap regression for practice.', true, NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;

-- Rubrics, grading, regrades
INSERT INTO rubrics (id, title, description, course_offering_id, created_by, created_at, updated_at) VALUES
(1401, 'Programming Assignment Rubric', 'Rubric for introductory coding assignments', 301, 111, NOW(), NOW()),
(1402, 'Algorithm Rubric', 'Rubric for DSA implementation quality', 302, 111, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO rubric_criteria (id, rubric_id, title, description, max_points, weight, position, created_at) VALUES
(1411, 1401, 'Correctness', 'Produces correct outputs', 40, 1.0, 1, NOW()),
(1412, 1401, 'Code Quality', 'Readable and maintainable code', 30, 0.8, 2, NOW()),
(1413, 1401, 'Testing', 'Includes edge cases and validation', 30, 0.8, 3, NOW()),
(1414, 1402, 'Complexity', 'Uses efficient complexity', 50, 1.0, 1, NOW()),
(1415, 1402, 'Explanation', 'Explains tradeoffs and approach', 50, 0.8, 2, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO rubric_grades (id, submission_id, criterion_id, score, feedback, graded_by, graded_at) VALUES
(1421, 701, 1411, 38, 'Correct on all visible tests.', 111, NOW() - INTERVAL '2 days'),
(1422, 701, 1412, 28, 'Readable code with good naming.', 111, NOW() - INTERVAL '2 days'),
(1423, 704, 1414, 45, 'Efficient implementation.', 111, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO grading_tasks (id, assignment_id, student_id, ta_id, assigned_at, status) VALUES
(1431, 501, 121, 113, NOW() - INTERVAL '2 days', 'completed'),
(1432, 502, 120, 113, NOW() - INTERVAL '12 hours', 'in_progress')
ON CONFLICT (id) DO NOTHING;

INSERT INTO regrade_requests (id, submission_id, criterion_id, reason, status, requested_by, requested_at, responded_by, responded_at, response_message) VALUES
(1433, 701, 1411, 'Please review edge-case handling score.', 'approved', 120, NOW() - INTERVAL '6 hours', 111, NOW() - INTERVAL '4 hours', 'Approved and adjusted after review.')
ON CONFLICT (id) DO NOTHING;

-- Plagiarism
INSERT INTO plagiarism_checks (id, assignment_id, checked_at, report_url, status, created_at) VALUES
(1441, 501, NOW() - INTERVAL '10 hours', 'https://example.com/reports/plagiarism-501.html', 'completed', NOW() - INTERVAL '10 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO plagiarism_matches (id, check_id, submission1_id, submission2_id, similarity_percentage, match_details, created_at) VALUES
(1442, 1441, 701, 702, 82.50, '{"matched_functions":["solve"],"matched_ranges":[[2,9],[12,19]]}', NOW() - INTERVAL '9 hours')
ON CONFLICT (id) DO NOTHING;

-- Support and messaging
INSERT INTO support_tickets (id, user_id, title, description, category, status, priority, assigned_to, course_offering_id, created_at, updated_at) VALUES
(1501, 120, 'Cannot submit calculator assignment', 'Submission button is disabled on the calculator assignment page.', 'bug_report', 'open', 'high', 113, 301, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'),
(1502, 121, 'Quiz timer looks wrong', 'Timer decreased by more than one minute between refreshes.', 'technical_issue', 'in_progress', 'medium', 111, 301, NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ticket_comments (id, ticket_id, user_id, comment, is_internal, created_at) VALUES
(1511, 1501, 113, 'Investigating whether this is tied to browser caching.', true, NOW() - INTERVAL '4 hours'),
(1512, 1502, 121, 'It happened twice during the last quiz attempt.', false, NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, sender_id, receiver_id, subject, content, is_read, sent_at, created_at) VALUES
(1521, 111, 120, 'Assignment Feedback', 'Your first programming assignment was strong. Keep the same structure going forward.', true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(1522, 120, 113, 'Rubric Clarification', 'Can you clarify what counts as comprehensive edge-case testing?', false, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, user_id, title, body, is_read, created_at) VALUES
(1531, 120, 'Assignment Graded', 'Your Hello World Program has been graded: 95/100.', true, NOW() - INTERVAL '2 days'),
(1532, 120, 'Resume Request Pending', 'Your request to resume the proctored quiz is pending review.', false, NOW() - INTERVAL '70 minutes'),
(1533, 121, 'Quiz Reminder', 'Programming Concepts Quiz is active now.', false, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Materials, discussions, PDFs
INSERT INTO study_materials (id, department_id, course_id, title, description, category, material, storage_path, filename, uploaded_by, created_at, updated_at) VALUES
(1601, 101, 201, 'Python Cheat Sheet', 'Quick syntax reference for Python.', 'Reference', 'notes', '/materials/python-cheat-sheet.pdf', 'python-cheat-sheet.pdf', 111, NOW(), NOW()),
(1602, 101, 203, 'SQL Examples', 'Common joins and aggregate query examples.', 'Practice', 'question_bank', '/materials/sql-examples.pdf', 'sql-examples.pdf', 112, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO discussion_messages (id, course_offering_id, user_id, parent_id, content, created_at) VALUES
(1611, 301, 120, NULL, 'Can someone explain why tuples are immutable in Python?', NOW() - INTERVAL '2 days'),
(1612, 301, 121, 1611, 'They are designed for fixed collections and can be hashed when contents are immutable.', NOW() - INTERVAL '2 days' + INTERVAL '20 minutes'),
(1613, 302, 111, NULL, 'Remember to compare time complexity, not just final output.', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pdf_documents (id, filename, content, uploaded_by, uploaded_at) VALUES
(1621, 'database-systems-syllabus.pdf', 'Database systems syllabus and grading policy.', 112, NOW() - INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

-- Video learning
INSERT INTO videos (id, title, description, uploaded_by, video_url, duration, cloudinary_public_id, upload_timestamp, created_at, updated_at, course_offering_id) VALUES
(1701, 'Intro to Python', 'Course introduction and setup walkthrough.', 111, 'https://example.com/videos/python-intro.mp4', 1800.5, 'python_intro_1701', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', 301),
(1702, 'Normalization Deep Dive', 'Explains 1NF, 2NF, 3NF, and BCNF.', 112, 'https://example.com/videos/normalization.mp4', 2100.0, 'normalization_1702', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', 303)
ON CONFLICT (id) DO NOTHING;

INSERT INTO video_quiz_questions (id, video_id, question_text, question_type, options, correct_answer, points, explanation, created_at, updated_at, timestamp) VALUES
(1711, 1701, 'Which function prints text to the console in Python?', 'mcq', '["echo","print","console.log"]', 'print', 5, 'The built-in print function writes output to stdout.', NOW(), NOW(), 300.0),
(1712, 1702, 'Which normal form removes transitive dependencies?', 'mcq', '["1NF","2NF","3NF"]', '3NF', 5, 'Third normal form removes transitive dependencies.', NOW(), NOW(), 420.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO video_quiz_attempts (id, video_id, student_id, started_at, completed_at, score, max_score, answers, created_at, updated_at) VALUES
(1721, 1701, 120, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '10 minutes', 5, 5, '{"1711":"print"}', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
(1722, 1702, 120, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '12 minutes', 5, 5, '{"1712":"3NF"}', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO settings (key, value, updated_at) VALUES
('system.maintenance_mode', '{"enabled": false}', NOW()),
('gamification.enabled', '{"value": true}', NOW()),
('proctoring.enabled', '{"value": true}', NOW()),
('system.max_file_size', '{"value": 10485760}', NOW())
ON CONFLICT (key) DO NOTHING;

-- Viva
INSERT INTO viva_sessions (id, course_offering_id, title, description, scheduled_at, duration_minutes, max_students, status, created_by, created_at, updated_at) VALUES
(1801, 302, 'Algorithms Viva Slot A', 'Short oral exam on sorting and complexity.', NOW() + INTERVAL '2 days', 30, 2, 'scheduled', 111, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO viva_participants (id, viva_session_id, student_id, scheduled_order, status, notes) VALUES
(1811, 1801, 120, 1, 'scheduled', 'Strong coding performance'),
(1812, 1801, 121, 2, 'scheduled', 'Needs more clarity on complexity analysis')
ON CONFLICT (id) DO NOTHING;

INSERT INTO viva_grades (id, viva_participant_id, grader_id, score, max_score, feedback, graded_at) VALUES
(1821, 1811, 111, 89, 100, 'Clear reasoning and confident answers.', NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- Live lectures and whiteboard
INSERT INTO live_lectures (
  id, title, description, course_offering_id, created_by, scheduled_at, started_at, ended_at, status,
  stream_key, recording_url, max_participants, is_recording, created_at, updated_at, whiteboard_cleared_at
) VALUES
(1901, 'CS101 Live Doubt Session', 'Live doubt-clearing session before assignment deadline.', 301, 111, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', 'ended', 'stream-cs101-doubt', 'https://example.com/recordings/cs101-doubt.mp4', 100, true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', NOW() - INTERVAL '23 hours'),
(1902, 'CS201 Contest Prep', 'Preparation session for the coding contest.', 302, 111, NOW() + INTERVAL '1 day', NULL, NULL, 'scheduled', 'stream-cs201-prep', NULL, 120, false, NOW(), NOW(), NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO live_lecture_participants (
  id, live_lecture_id, user_id, joined_at, left_at, role, is_muted, is_video_off, is_hand_raised, is_screen_sharing, last_activity
) VALUES
(1911, 1901, 111, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', 'teacher', false, false, false, true, NOW() - INTERVAL '23 hours'),
(1912, 1901, 113, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours' + INTERVAL '15 minutes', 'ta', false, true, false, false, NOW() - INTERVAL '23 hours' + INTERVAL '15 minutes'),
(1913, 1901, 120, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours' + INTERVAL '20 minutes', 'student', true, false, true, false, NOW() - INTERVAL '23 hours' + INTERVAL '20 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO whiteboard_states (id, live_lecture_id, drawing_data, created_by, created_at, updated_at) VALUES
(1921, 1901, '{"strokes":[{"type":"line","from":[10,10],"to":[140,60],"color":"#111827"},{"type":"text","text":"O(n log n)","x":160,"y":80}]}'::jsonb, 111, NOW() - INTERVAL '23 hours', NOW() - INTERVAL '23 hours')
ON CONFLICT (id) DO NOTHING;

-- Admin activity
INSERT INTO admin_activities (id, admin_id, action, entity_type, entity_id, entity_name, details, undo_data, undoable, created_at) VALUES
(2001, 110, 'approve_user', 'user', 123, 'GitHub Student', '{"source":"bootstrap","note":"GitHub user seeded for testing"}', NULL, false, NOW() - INTERVAL '7 days'),
(2002, 110, 'review_ticket', 'support', 1502, 'Quiz timer looks wrong', '{"status":"in_progress"}', NULL, false, NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- Bring sequences up to the max seeded IDs so new inserts during testing do not collide.
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'departments','users','courses','course_offerings','resources','assignments','code_questions',
    'code_question_testcases','assignment_questions','assignment_testcases','assignment_comments',
    'assignment_submissions','submission_files','file_submissions','github_submissions','mixed_submissions',
    'assignment_component_submissions','component_grades','code_submissions','code_submission_results',
    'quizzes','quiz_questions','quiz_attempts','proctoring_configs','proctoring_sessions',
    'proctoring_violations','proctoring_analytics','resume_requests','ta_quiz_permissions',
    'quiz_access_requests','achievements','daily_challenges','leaderboards','contests',
    'contest_questions','contest_submissions','contest_submission_details','contest_editor_settings',
    'code_analysis_logs','logical_bug_injections','ai_query_logs','rubrics','rubric_criteria',
    'rubric_grades','grading_tasks','regrade_requests','plagiarism_checks','plagiarism_matches',
    'support_tickets','ticket_comments','messages','notifications','study_materials',
    'discussion_messages','pdf_documents','videos','video_quiz_questions','video_quiz_attempts',
    'viva_sessions','viva_participants','viva_grades','live_lectures','live_lecture_participants',
    'whiteboard_states','admin_activities'
  ] LOOP
    EXECUTE format(
      'SELECT setval(pg_get_serial_sequence(''%I'', ''id''), COALESCE((SELECT MAX(id) FROM %I), 1), true)',
      tbl,
      tbl
    );
  END LOOP;
END $$;

COMMIT;
