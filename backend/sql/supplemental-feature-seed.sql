-- Supplemental feature seed for broad LMS feature coverage
-- Intended to run after schema + migrations + comprehensive-seed-data.sql

BEGIN;

-- Extra users for approval and OAuth/GitHub-related flows
INSERT INTO users (email, name, role, department_id, roll_number, password_hash, is_active, created_at, updated_at, github_username, github_connected_at)
VALUES
('pending.student@lms.edu', 'Pending Approval Student', 'student', 1, 'CS2024999', NULL, false, NOW(), NOW(), NULL, NULL),
('github.student@lms.edu', 'GitHub Connected Student', 'student', 1, 'CS2024998', '$2b$10$dummy.hash.for.demo', true, NOW(), NOW(), 'github-student', NOW() - INTERVAL '5 days')
ON CONFLICT (email) DO NOTHING;

-- Resources table is used by course resource APIs and chatbot indexing
INSERT INTO resources (course_offering_id, uploaded_by, title, description, resource_type, storage_path, filename, uploaded_at)
VALUES
(1, 3, 'CS101 Lecture Notes 1', 'Introduction and Python basics', 'lecture_note', '/resources/cs101-lecture-1.pdf', 'cs101-lecture-1.pdf', NOW() - INTERVAL '8 days'),
(1, 3, 'CS101 Previous Year Questions', 'Practice PYQs for quizzes and exams', 'pyq', '/resources/cs101-pyq.pdf', 'cs101-pyq.pdf', NOW() - INTERVAL '6 days'),
(3, 3, 'Sorting Reference Sheet', 'Complexity and implementation notes', 'lecture_note', '/resources/cs201-sorting-notes.pdf', 'cs201-sorting-notes.pdf', NOW() - INTERVAL '4 days'),
(4, 4, 'Database Normalization Handout', '1NF to BCNF examples', 'lecture_note', '/resources/cs301-normalization.pdf', 'cs301-normalization.pdf', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Assignment comments for threaded discussion testing
WITH target_assignment AS (
  SELECT id FROM assignments WHERE title = 'Basic Calculator' ORDER BY id LIMIT 1
), top_comment AS (
  INSERT INTO assignment_comments (assignment_id, user_id, parent_id, content, is_instructor_reply, created_at, updated_at)
  SELECT id, 9, NULL, 'Should we handle division by zero with an exception or a custom message?', false, NOW() - INTERVAL '20 hours', NOW() - INTERVAL '20 hours'
  FROM target_assignment
  RETURNING id
)
INSERT INTO assignment_comments (assignment_id, user_id, parent_id, content, is_instructor_reply, created_at, updated_at)
SELECT ta.id, 7, tc.id, 'Return a clear validation message and include a test case for zero division.', true, NOW() - INTERVAL '18 hours', NOW() - INTERVAL '18 hours'
FROM target_assignment ta
JOIN top_comment tc ON true;

-- Submission variants for file/github/mixed flows
INSERT INTO file_submissions (submission_id, zip_file_url, submission_type, created_at)
VALUES
(8, 'https://example.com/submissions/database-design-project.zip', 'file', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

INSERT INTO github_submissions (
  submission_id, repo_url, repo_name, repo_description, repo_language, repo_private,
  repo_stars, repo_forks, repo_created_at, repo_updated_at, repo_default_branch, repo_size_kb, created_at
)
VALUES
(10, 'https://github.com/github-student/sql-query-assignment', 'sql-query-assignment', 'Repository submission for SQL assignment', 'SQL', false,
 7, 2, NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 hours', 'main', 512, NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

INSERT INTO mixed_submissions (
  submission_id, zip_file_url, repo_url, repo_name, repo_description, repo_language, repo_private,
  repo_stars, repo_forks, repo_created_at, repo_updated_at, repo_default_branch, repo_size_kb, submission_type, created_at
)
VALUES
(5, 'https://example.com/submissions/basic-calculator-mixed.zip', 'https://github.com/student1/basic-calculator', 'basic-calculator',
 'Mixed repository and file submission for calculator assignment', 'Python', false, 3, 1,
 NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day', 'main', 256, 'mixed', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Flexible assignment component submissions and grades
INSERT INTO assignment_component_submissions (assignment_submission_id, component_id, submission_type, content, file_path, metadata, submitted_at)
VALUES
(5, 'main_component', 'code', 'def calculate(a, b, op): return eval(f"{a}{op}{b}")', NULL, '{"language":"python"}', NOW() - INTERVAL '22 hours'),
(8, 'main_component', 'file', NULL, '/submissions/library-design.pdf', '{"filename":"library-design.pdf"}', NOW() - INTERVAL '20 hours'),
(10, 'main_component', 'link', 'https://github.com/github-student/sql-query-assignment', NULL, '{"provider":"github"}', NOW() - INTERVAL '90 minutes')
ON CONFLICT DO NOTHING;

INSERT INTO component_grades (assignment_submission_id, component_id, score, feedback, graded_by, graded_at)
VALUES
(1, 'main_component', 95, 'Strong correctness and clear implementation.', 3, NOW() - INTERVAL '2 days'),
(3, 'main_component', 92, 'Efficient solution with minor style issues.', 3, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Contest data
INSERT INTO contests (course_offering_id, title, description, start_at, end_at, max_score, allow_multiple_submissions, is_active, created_by, created_at, updated_at)
VALUES
(3, 'CS201 Midterm Coding Contest', 'Timed coding contest on data structures and algorithms', NOW() - INTERVAL '12 hours', NOW() + INTERVAL '12 hours', 200, true, true, 3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

INSERT INTO contest_questions (contest_id, question_id, points, position)
SELECT c.id, q.id, pts.points, pts.position
FROM contests c
JOIN (
  VALUES
    ('Two Sum Problem', 100::numeric, 1),
    ('Maximum Subarray', 100::numeric, 2)
) AS pts(title, points, position) ON true
JOIN code_questions q ON q.title = pts.title
WHERE c.title = 'CS201 Midterm Coding Contest'
ON CONFLICT (contest_id, question_id) DO NOTHING;

INSERT INTO contest_submissions (contest_id, student_id, submitted_at, final_score, comments, graded_at, grader_id)
SELECT c.id, 9, NOW() - INTERVAL '3 hours', 170, 'Good contest performance overall.', NOW() - INTERVAL '2 hours', 3
FROM contests c
WHERE c.title = 'CS201 Midterm Coding Contest'
ON CONFLICT (contest_id, student_id) DO NOTHING;

INSERT INTO contest_submission_details (contest_submission_id, question_id, code, language, score, feedback, submitted_at)
SELECT cs.id, q.id,
  CASE
    WHEN q.title = 'Two Sum Problem' THEN 'def two_sum(nums, target): seen = {}; for i, n in enumerate(nums):\n    if target - n in seen: return [seen[target - n], i]\n    seen[n] = i'
    ELSE 'def max_subarray(nums):\n    best = cur = nums[0]\n    for n in nums[1:]:\n        cur = max(n, cur + n)\n        best = max(best, cur)\n    return best'
  END,
  'python',
  CASE WHEN q.title = 'Two Sum Problem' THEN 90 ELSE 80 END,
  CASE WHEN q.title = 'Two Sum Problem' THEN 'Optimal solution.' ELSE 'Correct, but edge-case comments are thin.' END,
  NOW() - INTERVAL '3 hours'
FROM contest_submissions cs
JOIN contests c ON c.id = cs.contest_id
JOIN contest_questions cq ON cq.contest_id = c.id
JOIN code_questions q ON q.id = cq.question_id
WHERE c.title = 'CS201 Midterm Coding Contest' AND cs.student_id = 9
ON CONFLICT (contest_submission_id, question_id) DO NOTHING;

INSERT INTO contest_editor_settings (user_id, contest_id, ai_enabled, distraction_mode, max_ai_queries, theme, created_at, updated_at)
SELECT 9, c.id, true, true, 8, 'light', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'
FROM contests c
WHERE c.title = 'CS201 Midterm Coding Contest'
ON CONFLICT (user_id, contest_id) DO NOTHING;

-- AI editor logs
INSERT INTO code_analysis_logs (user_id, question_id, code_hash, time_complexity, space_complexity, analysis, analyzed_at)
SELECT 9, q.id, 'hash-two-sum-v1', 'O(n)', 'O(n)', 'Hash map solution with linear pass.', NOW() - INTERVAL '6 hours'
FROM code_questions q
WHERE q.title = 'Two Sum Problem'
ON CONFLICT (user_id, question_id) DO NOTHING;

INSERT INTO logical_bug_injections (user_id, question_id, original_code, modified_code, bug_type, bug_description, created_at)
SELECT 9, q.id, 'if nums[i] + nums[j] == target', 'if nums[i] - nums[j] == target', 'operator_swap', 'Changed addition to subtraction to simulate a logic regression.', NOW() - INTERVAL '5 hours'
FROM code_questions q
WHERE q.title = 'Two Sum Problem';

INSERT INTO ai_query_logs (user_id, question_id, query_type, code_hash, response_preview, contest_mode, created_at)
SELECT 9, q.id, 'complexity_analysis', 'hash-two-sum-v1', 'Linear-time solution detected with hash map.', false, NOW() - INTERVAL '4 hours'
FROM code_questions q
WHERE q.title = 'Two Sum Problem';

-- Grading system data
INSERT INTO grading_tasks (assignment_id, student_id, ta_id, assigned_at, status)
VALUES
(1, 12, 7, NOW() - INTERVAL '4 days', 'completed'),
(2, 9, 7, NOW() - INTERVAL '1 day', 'in_progress'),
(3, 10, 7, NOW() - INTERVAL '2 days', 'assigned')
ON CONFLICT (assignment_id, student_id, ta_id) DO NOTHING;

INSERT INTO regrade_requests (submission_id, criterion_id, reason, status, requested_by, requested_at, responded_by, responded_at, response_message)
VALUES
(1, 1, 'I believe my edge-case handling deserves more points.', 'approved', 9, NOW() - INTERVAL '8 hours', 3, NOW() - INTERVAL '6 hours', 'Regrade approved. Score adjustment will be reflected shortly.'),
(3, 6, 'Please review my time complexity assessment again.', 'pending', 10, NOW() - INTERVAL '3 hours', NULL, NULL, NULL)
ON CONFLICT (submission_id, criterion_id, requested_by) DO NOTHING;

-- Plagiarism data
INSERT INTO plagiarism_checks (assignment_id, checked_at, report_url, status, created_at)
VALUES
(1, NOW() - INTERVAL '12 hours', 'https://example.com/reports/plagiarism-assignment-1.html', 'completed', NOW() - INTERVAL '12 hours')
ON CONFLICT DO NOTHING;

INSERT INTO plagiarism_matches (check_id, submission1_id, submission2_id, similarity_percentage, match_details, created_at)
SELECT pc.id, 1, 2, 82.50, '{"matched_functions":["two_sum"],"matched_lines":[[2,10],[14,21]]}', NOW() - INTERVAL '11 hours'
FROM plagiarism_checks pc
WHERE pc.assignment_id = 1
ORDER BY pc.id DESC
LIMIT 1
ON CONFLICT (check_id, submission1_id, submission2_id) DO NOTHING;

-- Viva data
INSERT INTO viva_sessions (course_offering_id, title, description, scheduled_at, duration_minutes, max_students, status, created_by, created_at, updated_at)
VALUES
(3, 'Algorithms Viva Slot A', 'Oral evaluation for sorting and complexity analysis', NOW() + INTERVAL '2 days', 30, 3, 'scheduled', 3, NOW(), NOW()),
(4, 'Database Design Viva', 'Schema design and SQL optimization review', NOW() + INTERVAL '3 days', 25, 2, 'scheduled', 4, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO viva_participants (viva_session_id, student_id, scheduled_order, status, notes)
SELECT vs.id, v.student_id, v.scheduled_order, v.status, v.notes
FROM viva_sessions vs
JOIN (
  VALUES
    ('Algorithms Viva Slot A', 9::bigint, 1, 'scheduled', 'Strong implementation background'),
    ('Algorithms Viva Slot A', 10::bigint, 2, 'scheduled', 'Needs follow-up on recurrence relations'),
    ('Database Design Viva', 9::bigint, 1, 'scheduled', 'Project already submitted')
) AS v(title, student_id, scheduled_order, status, notes)
  ON vs.title = v.title
ON CONFLICT (viva_session_id, student_id) DO NOTHING;

INSERT INTO viva_grades (viva_participant_id, grader_id, score, max_score, feedback, graded_at)
SELECT vp.id, 3, 88, 100, 'Answered complexity questions clearly and confidently.', NOW() - INTERVAL '30 minutes'
FROM viva_participants vp
JOIN viva_sessions vs ON vs.id = vp.viva_session_id
WHERE vs.title = 'Algorithms Viva Slot A' AND vp.student_id = 9
ON CONFLICT (viva_participant_id, grader_id) DO NOTHING;

-- Live lecture and whiteboard data
INSERT INTO live_lectures (title, description, course_offering_id, created_by, scheduled_at, started_at, ended_at, status, stream_key, recording_url, max_participants, is_recording, created_at, updated_at)
VALUES
('CS101 Live Doubt Session', 'Open doubt-clearing session for assignment and quiz prep', 1, 3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', 'ended', 'stream-cs101-doubt', 'https://example.com/recordings/cs101-doubt.mp4', 100, true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours'),
('CS201 Sorting Masterclass', 'Live session on sorting strategies and contest prep', 3, 3, NOW() + INTERVAL '1 day', NULL, NULL, 'scheduled', 'stream-cs201-sort', NULL, 150, false, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO live_lecture_participants (
  live_lecture_id, user_id, joined_at, left_at, role, is_muted, is_video_off, is_hand_raised, is_screen_sharing, last_activity
)
SELECT ll.id, p.user_id, p.joined_at, p.left_at, p.role, p.is_muted, p.is_video_off, p.is_hand_raised, p.is_screen_sharing, p.last_activity
FROM live_lectures ll
JOIN (
  VALUES
    ('CS101 Live Doubt Session', 3::bigint, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', 'teacher', false, false, false, true, NOW() - INTERVAL '23 hours'),
    ('CS101 Live Doubt Session', 7::bigint, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours' + INTERVAL '10 minutes', 'ta', false, true, false, false, NOW() - INTERVAL '23 hours' + INTERVAL '10 minutes'),
    ('CS101 Live Doubt Session', 9::bigint, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours' + INTERVAL '20 minutes', 'student', true, false, true, false, NOW() - INTERVAL '23 hours' + INTERVAL '20 minutes')
) AS p(title, user_id, joined_at, left_at, role, is_muted, is_video_off, is_hand_raised, is_screen_sharing, last_activity)
  ON ll.title = p.title
ON CONFLICT (live_lecture_id, user_id) DO NOTHING;

INSERT INTO whiteboard_states (live_lecture_id, drawing_data, created_by, created_at, updated_at)
SELECT ll.id, '{"strokes":[{"type":"line","from":[10,10],"to":[120,40],"color":"#1f2937"},{"type":"text","text":"O(n log n)","x":140,"y":60}]}'::jsonb, 3, NOW() - INTERVAL '23 hours', NOW() - INTERVAL '23 hours'
FROM live_lectures ll
WHERE ll.title = 'CS101 Live Doubt Session'
ON CONFLICT DO NOTHING;

-- Resume request workflow
INSERT INTO resume_requests (student_id, quiz_attempt_id, proctoring_session_id, reason, status, requested_at, reviewed_by, reviewed_at, response_message, created_at, updated_at)
VALUES
(9, 6, 2, 'Network dropped during the live proctored quiz. Requesting resume access.', 'pending', NOW() - INTERVAL '40 minutes', NULL, NULL, NULL, NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '40 minutes')
ON CONFLICT (quiz_attempt_id) DO NOTHING;

-- Admin activity and optional PDF metadata
INSERT INTO admin_activities (admin_id, action, entity_type, entity_id, details, created_at)
VALUES
(1, 'approve_user', 'user', (SELECT id FROM users WHERE email = 'github.student@lms.edu'), '{"source":"bootstrap","notes":"Seeded GitHub-connected test user"}', NOW() - INTERVAL '5 days'),
(1, 'review_ticket', 'support', 2, '{"status":"in_progress"}', NOW() - INTERVAL '4 hours')
ON CONFLICT DO NOTHING;

INSERT INTO pdf_documents (title, file_path, uploaded_by, created_at)
VALUES
('Database Systems Syllabus', '/pdfs/database-systems-syllabus.pdf', 4, NOW() - INTERVAL '14 days')
ON CONFLICT DO NOTHING;

COMMIT;
