-- ============================================================
-- COMPREHENSIVE DATABASE SEED SCRIPT FOR LMS DEMO
-- ============================================================
-- This script cleans up inconsistent data and populates the 
-- database with realistic, complete demo data for all features.
-- 
-- Focus: Complete data for key users:
--   - student@gmail.com (student)
--   - teacher@gmail.com (teacher/faculty)
--   - ta@gmail.com (TA)
--   - superadmin@gmail.com (super admin)
-- ============================================================

-- Start transaction
BEGIN;

-- ============================================================
-- STEP 1: CLEANUP - Remove orphaned and inconsistent data
-- ============================================================

-- Remove submissions that don't have proper assignment links
DELETE FROM assignment_submissions 
WHERE assignment_id NOT IN (SELECT id FROM assignments);

-- Remove empty discussion messages (from deleted courses)
DELETE FROM discussion_messages 
WHERE course_offering_id NOT IN (SELECT id FROM course_offerings);

-- Remove orphaned submission files
DELETE FROM submission_files 
WHERE submission_id NOT IN (SELECT id FROM assignment_submissions);

-- Remove orphaned code submissions
DELETE FROM code_submissions 
WHERE submission_id NOT IN (SELECT id FROM assignment_submissions);

-- Remove orphaned quiz attempts
DELETE FROM quiz_attempts 
WHERE quiz_id NOT IN (SELECT id FROM quizzes)
   OR student_id NOT IN (SELECT id FROM users WHERE role = 'student');

-- Remove orphaned enrollments
DELETE FROM enrollments 
WHERE student_id NOT IN (SELECT id FROM users)
   OR course_offering_id NOT IN (SELECT id FROM course_offerings);

-- Remove TA assignments for non-existent users or offerings
DELETE FROM ta_assignments 
WHERE ta_id NOT IN (SELECT id FROM users WHERE role = 'ta')
   OR course_offering_id NOT IN (SELECT id FROM course_offerings);

-- Remove faculty course links for non-existent users
DELETE FROM faculty_courses 
WHERE faculty_id NOT IN (SELECT id FROM users WHERE role = 'faculty');

-- Remove rubric grades for non-existent submissions
DELETE FROM rubric_grades 
WHERE submission_id NOT IN (SELECT id FROM assignment_submissions);

-- ============================================================
-- STEP 2: ENSURE KEY USERS EXIST WITH PROPER ROLES
-- ============================================================

-- Update existing key users to ensure correct data
UPDATE users 
SET 
  name = 'Student',
  role = 'student',
  is_active = true,
  department_id = 101
WHERE email = 'student@gmail.com';

UPDATE users 
SET 
  name = 'Teacher',
  role = 'faculty',
  is_active = true,
  department_id = 101
WHERE email = 'teacher@gmail.com';

UPDATE users 
SET 
  name = 'TA',
  role = 'ta',
  is_active = true,
  department_id = 101
WHERE email = 'ta@gmail.com';

UPDATE users 
SET 
  name = 'Super Admin',
  role = 'admin',
  is_active = true,
  department_id = NULL
WHERE email = 'superadmin@gmail.com';

-- Ensure admin record exists for superadmin
INSERT INTO admins (user_id, is_super, created_by)
SELECT id, true, id FROM users WHERE email = 'superadmin@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET is_super = true;

-- ============================================================
-- STEP 3: CREATE COMPLETE COURSE OFFERINGS FOR DEMO
-- ============================================================

-- Ensure key course offering exists for Fall 2026
INSERT INTO course_offerings (
  course_id, term, section, faculty_id, max_capacity, 
  start_date, end_date
)
SELECT 
  201, 'Fall 2026', 'A', 
  (SELECT id FROM users WHERE email = 'teacher@gmail.com'),
  35,
  '2026-08-14'::timestamptz, 
  '2026-12-14'::timestamptz
ON CONFLICT DO NOTHING;

INSERT INTO course_offerings (
  course_id, term, section, faculty_id, max_capacity, 
  start_date, end_date
)
SELECT 
  202, 'Fall 2026', 'A', 
  (SELECT id FROM users WHERE email = 'teacher@gmail.com'),
  35,
  '2026-08-14'::timestamptz, 
  '2026-12-14'::timestamptz
ON CONFLICT DO NOTHING;

INSERT INTO course_offerings (
  course_id, term, section, faculty_id, max_capacity, 
  start_date, end_date
)
SELECT 
  203, 'Fall 2026', 'A', 
  (SELECT id FROM users WHERE email = 'teacher@gmail.com'),
  35,
  '2026-08-14'::timestamptz, 
  '2026-12-14'::timestamptz
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 4: ENROLL KEY USERS IN COURSES
-- ============================================================

-- Get the course offering IDs
DO $$
DECLARE
  v_co101_id BIGINT;
  v_co201_id BIGINT;
  v_co202_id BIGINT;
  v_stu_id BIGINT;
  v_teach_id BIGINT;
  v_ta_user_id BIGINT;
BEGIN
  SELECT id INTO v_co101_id FROM course_offerings 
  WHERE course_id = 201 AND term = 'Fall 2026' AND section = 'A';
  
  SELECT id INTO v_co201_id FROM course_offerings 
  WHERE course_id = 202 AND term = 'Fall 2026' AND section = 'A';
  
  SELECT id INTO v_co202_id FROM course_offerings 
  WHERE course_id = 203 AND term = 'Fall 2026' AND section = 'A';
  
  SELECT id INTO v_stu_id FROM users WHERE email = 'student@gmail.com';
  SELECT id INTO v_teach_id FROM users WHERE email = 'teacher@gmail.com';
  SELECT id INTO v_ta_user_id FROM users WHERE email = 'ta@gmail.com';
  
  -- Enroll student in all three courses
  INSERT INTO enrollments (course_offering_id, student_id, status, enrolled_at)
  VALUES 
    (v_co101_id, v_stu_id, 'active', NOW()),
    (v_co201_id, v_stu_id, 'active', NOW()),
    (v_co202_id, v_stu_id, 'active', NOW())
  ON CONFLICT (course_offering_id, student_id) DO NOTHING;
  
  -- Enroll teacher as well (for testing)
  INSERT INTO enrollments (course_offering_id, student_id, status, enrolled_at)
  VALUES 
    (v_co101_id, v_teach_id, 'active', NOW()),
    (v_co201_id, v_teach_id, 'active', NOW()),
    (v_co202_id, v_teach_id, 'active', NOW())
  ON CONFLICT (course_offering_id, student_id) DO NOTHING;
  
  -- Assign TA to all courses
  INSERT INTO ta_assignments (course_offering_id, ta_id, role, assigned_at)
  VALUES 
    (v_co101_id, v_ta_user_id, 'ta', NOW()),
    (v_co201_id, v_ta_user_id, 'ta', NOW()),
    (v_co202_id, v_ta_user_id, 'ta', NOW())
  ON CONFLICT (course_offering_id, ta_id) DO NOTHING;
  
  -- Assign faculty
  INSERT INTO faculty_courses (course_id, faculty_id, assigned_at)
  VALUES 
    (201, v_teach_id, NOW()),
    (202, v_teach_id, NOW()),
    (203, v_teach_id, NOW())
  ON CONFLICT (course_id, faculty_id) DO NOTHING;
END $$;

-- ============================================================
-- STEP 5: CREATE NEW ASSIGNMENTS FOR DEMO
-- ============================================================

DO $$
DECLARE
  v_co101_id BIGINT;
  v_co201_id BIGINT;
  v_co202_id BIGINT;
  v_teach_id BIGINT;
BEGIN
  SELECT id INTO v_co101_id FROM course_offerings 
  WHERE course_id = 201 AND term = 'Fall 2026' AND section = 'A';
  
  SELECT id INTO v_co201_id FROM course_offerings 
  WHERE course_id = 202 AND term = 'Fall 2026' AND section = 'A';
  
  SELECT id INTO v_co202_id FROM course_offerings 
  WHERE course_id = 203 AND term = 'Fall 2026' AND section = 'A';
  
  SELECT id INTO v_teach_id FROM users WHERE email = 'teacher@gmail.com';
  
  -- New assignments for Fall 2026 courses
  INSERT INTO assignments (
    course_offering_id, title, description, assignment_type,
    release_at, due_at, max_score, allow_multiple_submissions,
    created_by, created_at, file_size_limit_mb, allow_github_repo,
    is_graded, assignment_config
  ) VALUES 
    (
      v_co101_id, 
      'Week 1: Python Fundamentals',
      'Complete Python exercises covering variables, loops, and functions.',
      'code',
      NOW() - INTERVAL '1 week',
      NOW() + INTERVAL '2 weeks',
      100, false,
      v_teach_id, NOW(),
      15, true,
      true,
      '{}'::jsonb
    ),
    (
      v_co101_id,
      'Week 2: Object-Oriented Programming',
      'Design classes for a library management system.',
      'mixed',
      NOW(),
      NOW() + INTERVAL '2 weeks',
      100, false,
      v_teach_id, NOW(),
      20, true,
      true,
      '{}'::jsonb
    ),
    (
      v_co101_id,
      'Week 3: Final Project Proposal',
      'Submit a PDF document describing your final project.',
      'file',
      NOW(),
      NOW() + INTERVAL '3 weeks',
      50, false,
      v_teach_id, NOW(),
      5, false,
      true,
      '{}'::jsonb
    ),
    (
      v_co201_id,
      'Week 1: Linked List Implementation',
      'Implement a doubly linked list with full test coverage.',
      'code',
      NOW() - INTERVAL '1 week',
      NOW() + INTERVAL '2 weeks',
      100, true,
      v_teach_id, NOW(),
      10, true,
      true,
      '{}'::jsonb
    ),
    (
      v_co201_id,
      'Week 2: Binary Search Trees',
      'Implement BST with insert, delete, search, and traversal.',
      'code',
      NOW(),
      NOW() + INTERVAL '2 weeks',
      100, false,
      v_teach_id, NOW(),
      10, true,
      true,
      '{}'::jsonb
    ),
    (
      v_co201_id,
      'Week 3: Algorithm Analysis',
      'Submit analysis of sorting algorithms with empirical results.',
      'file',
      NOW(),
      NOW() + INTERVAL '3 weeks',
      100, false,
      v_teach_id, NOW(),
      10, false,
      true,
      '{}'::jsonb
    ),
    (
      v_co202_id,
      'Week 1: ER Diagram and Schema',
      'Create ER diagram and SQL schema for an e-commerce system.',
      'mixed',
      NOW(),
      NOW() + INTERVAL '2 weeks',
      100, false,
      v_teach_id, NOW(),
      10, false,
      true,
      '{}'::jsonb
    ),
    (
      v_co202_id,
      'Week 2: Query Optimization',
      'Optimize given queries and explain query plans.',
      'file',
      NOW(),
      NOW() + INTERVAL '2 weeks',
      100, false,
      v_teach_id, NOW(),
      5, false,
      true,
      '{}'::jsonb
    );
END $$;

-- ============================================================
-- STEP 6: SUBMISSIONS FOR KEY USER (student@gmail.com)
-- ============================================================

DO $$
DECLARE
  v_stu_id BIGINT;
  v_teach_id BIGINT;
  v_ta_user_id BIGINT;
  v_a1_id BIGINT;
  v_a2_id BIGINT;
  v_a3_id BIGINT;
  v_a4_id BIGINT;
  v_a5_id BIGINT;
  v_a6_id BIGINT;
  v_a7_id BIGINT;
  v_a8_id BIGINT;
  v_sub_id BIGINT;
  v_co101_id BIGINT;
  v_co201_id BIGINT;
  v_co202_id BIGINT;
BEGIN
  SELECT id INTO v_stu_id FROM users WHERE email = 'student@gmail.com';
  SELECT id INTO v_teach_id FROM users WHERE email = 'teacher@gmail.com';
  SELECT id INTO v_ta_user_id FROM users WHERE email = 'ta@gmail.com';
  
  SELECT id INTO v_co101_id FROM course_offerings 
  WHERE course_id = 201 AND term = 'Fall 2026' AND section = 'A';
  
  SELECT id INTO v_co201_id FROM course_offerings 
  WHERE course_id = 202 AND term = 'Fall 2026' AND section = 'A';
  
  SELECT id INTO v_co202_id FROM course_offerings 
  WHERE course_id = 203 AND term = 'Fall 2026' AND section = 'A';
  
  -- Get new assignment IDs
  SELECT id INTO v_a1_id FROM assignments 
  WHERE course_offering_id = v_co101_id AND title = 'Week 1: Python Fundamentals';
  
  SELECT id INTO v_a2_id FROM assignments 
  WHERE course_offering_id = v_co101_id AND title = 'Week 2: Object-Oriented Programming';
  
  SELECT id INTO v_a3_id FROM assignments 
  WHERE course_offering_id = v_co101_id AND title = 'Week 3: Final Project Proposal';
  
  SELECT id INTO v_a4_id FROM assignments 
  WHERE course_offering_id = v_co201_id AND title = 'Week 1: Linked List Implementation';
  
  SELECT id INTO v_a5_id FROM assignments 
  WHERE course_offering_id = v_co201_id AND title = 'Week 2: Binary Search Trees';
  
  SELECT id INTO v_a6_id FROM assignments 
  WHERE course_offering_id = v_co201_id AND title = 'Week 3: Algorithm Analysis';
  
  SELECT id INTO v_a7_id FROM assignments 
  WHERE course_offering_id = v_co202_id AND title = 'Week 1: ER Diagram and Schema';
  
  SELECT id INTO v_a8_id FROM assignments 
  WHERE course_offering_id = v_co202_id AND title = 'Week 2: Query Optimization';
  
  -- Create GRADED submissions (completed work)
  -- Week 1 Python - graded 95
  INSERT INTO assignment_submissions (
    assignment_id, student_id, submitted_at, status,
    final_score, grader_id, graded_at, comments, attempt
  ) VALUES (
    v_a1_id, v_stu_id, NOW() - INTERVAL '6 days', 'graded',
    95, v_teach_id, NOW() - INTERVAL '5 days', 
    'Excellent use of Python features and clean code structure.', 1
  ) RETURNING id INTO v_sub_id;
  
  INSERT INTO submission_files (submission_id, storage_path, filename, file_size, mime_type)
  VALUES (v_sub_id, '/submissions/week1-python-fundamentals.py', 
          'week1-python-fundamentals.py', 4500, 'text/x-python');
  
  INSERT INTO rubric_grades (submission_id, criterion_id, score, feedback, graded_by)
  SELECT v_sub_id, rc.id, 
    CASE rc.title 
      WHEN 'Correctness' THEN 38
      WHEN 'Code Quality' THEN 28
      WHEN 'Testing' THEN 29
    END,
    CASE rc.title
      WHEN 'Correctness' THEN 'All test cases pass correctly.'
      WHEN 'Code Quality' THEN 'Clean, readable code with good documentation.'
      WHEN 'Testing' THEN 'Good test coverage including edge cases.'
    END,
    v_teach_id
  FROM rubric_criteria rc WHERE rc.rubric_id = 1401;
  
  -- Week 1 LL Implementation - graded 92
  INSERT INTO assignment_submissions (
    assignment_id, student_id, submitted_at, status,
    final_score, grader_id, graded_at, comments, attempt
  ) VALUES (
    v_a4_id, v_stu_id, NOW() - INTERVAL '6 days', 'graded',
    92, v_teach_id, NOW() - INTERVAL '5 days',
    'Solid implementation with good test coverage.', 1
  ) RETURNING id INTO v_sub_id;
  
  INSERT INTO code_submissions (submission_id, language, code, test_results, started_at, completed_at, time_spent_seconds, attempts_count)
  VALUES (v_sub_id, 'Python', '# Doubly Linked List implementation...', 
          '{"tests_passed": 15, "tests_failed": 0, "coverage": 95}'::jsonb,
          NOW() - INTERVAL '6 days 2 hours', NOW() - INTERVAL '6 days',
          7200, 1);
  
  -- Week 1 OOP - pending submission
  INSERT INTO assignment_submissions (
    assignment_id, student_id, submitted_at, status,
    final_score, grader_id, graded_at, comments, attempt
  ) VALUES (
    v_a2_id, v_stu_id, NOW() - INTERVAL '1 day', 'submitted',
    NULL, NULL, NULL, NULL, 1
  ) RETURNING id INTO v_sub_id;
  
  INSERT INTO submission_files (submission_id, storage_path, filename, file_size, mime_type)
  VALUES (v_sub_id, '/submissions/week2-oop-library.zip',
          'week2-oop-library.zip', 25000, 'application/zip');
  
  -- Week 1 Proposal - pending
  INSERT INTO assignment_submissions (
    assignment_id, student_id, submitted_at, status,
    final_score, grader_id, graded_at, comments, attempt
  ) VALUES (
    v_a3_id, v_stu_id, NOW(), 'submitted',
    NULL, NULL, NULL, NULL, 1
  ) RETURNING id INTO v_sub_id;
  
  INSERT INTO submission_files (submission_id, storage_path, filename, file_size, mime_type)
  VALUES (v_sub_id, '/submissions/final-project-proposal.pdf',
          'final-project-proposal.pdf', 125000, 'application/pdf');
  
  -- Achievements
  INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
  SELECT v_stu_id, id, NOW() - INTERVAL '10 days'
  FROM achievements WHERE name = 'First Submission'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
  SELECT v_stu_id, id, NOW() - INTERVAL '5 days'
  FROM achievements WHERE name = 'Problem Solver'
  ON CONFLICT DO NOTHING;
  
  -- Notifications
  INSERT INTO notifications (user_id, title, body, is_read, created_at)
  VALUES 
    (v_stu_id, 'New Assignment Available', 'Week 2: Object-Oriented Programming is now available.', false, NOW()),
    (v_stu_id, 'Grade Posted', 'Your Week 1 Python Fundamentals assignment has been graded (95/100).', false, NOW() - INTERVAL '5 days'),
    (v_stu_id, 'Upcoming Deadline', 'Week 3 Final Project Proposal due in 3 weeks.', false, NOW()),
    (v_teach_id, 'New Submission', 'Student has submitted Week 2 OOP assignment.', false, NOW()),
    (v_teach_id, 'Assignment Due Soon', 'Week 2 OOP assignment deadline approaching.', false, NOW());
  
END $$;

-- ============================================================
-- STEP 7: CREATE QUIZZES AND ATTEMPTS
-- ============================================================

DO $$
DECLARE
  v_co101_id BIGINT;
  v_co201_id BIGINT;
  v_stu_id BIGINT;
  v_q1_id BIGINT;
  v_q2_id BIGINT;
BEGIN
  SELECT id INTO v_co101_id FROM course_offerings 
  WHERE course_id = 201 AND term = 'Fall 2026' AND section = 'A';
  
  SELECT id INTO v_co201_id FROM course_offerings 
  WHERE course_id = 202 AND term = 'Fall 2026' AND section = 'A';
  
  SELECT id INTO v_stu_id FROM users WHERE email = 'student@gmail.com';
  
  -- Create quizzes
  INSERT INTO quizzes (
    course_offering_id, title, start_at, end_at, max_score,
    is_proctored, time_limit, proctoring_config_id
  ) VALUES 
    (
      v_co101_id, 'Week 2: Python Quiz',
      NOW() + INTERVAL '2 days', NOW() + INTERVAL '1 week',
      50, false, 45, NULL
    ) RETURNING id INTO v_q1_id,
    (
      v_co201_id, 'Week 3: Data Structures Quiz',
      NOW() + INTERVAL '3 days', NOW() + INTERVAL '10 days',
      75, false, 60, NULL
    ) RETURNING id INTO v_q2_id;
  
  -- Add quiz questions
  INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata)
  VALUES 
    (v_q1_id, 'What is the output of print(2 ** 3)?', 'mcq', '{"options": ["6", "8", "9", "10"], "correct": "8"}'::jsonb),
    (v_q1_id, 'Which keyword defines a function in Python?', 'mcq', '{"options": ["func", "function", "def", "lambda"], "correct": "def"}'::jsonb),
    (v_q1_id, 'What is the time complexity of binary search?', 'mcq', '{"options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"], "correct": "O(log n)"}'::jsonb),
    (v_q2_id, 'In a BST, all nodes in the left subtree are _____ the root.', 'mcq', '{"options": ["greater than", "less than", "equal to", "unrelated to"], "correct": "less than"}'::jsonb),
    (v_q2_id, 'What is the height of a balanced BST with n nodes?', 'mcq', '{"options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"], "correct": "O(log n)"}'::jsonb);
  
  -- Create quiz attempts for student
  INSERT INTO quiz_attempts (quiz_id, student_id, started_at, finished_at, score, answers)
  VALUES (
    v_q1_id, v_stu_id, 
    NOW() + INTERVAL '2 days 1 hour', 
    NOW() + INTERVAL '2 days 1 hour 30 min',
    45,
    '{"1": "8", "2": "def", "3": "O(log n)"}'::jsonb
  );
  
END $$;

-- ============================================================
-- STEP 8: UPDATE GAMIFICATION STATS FOR ALL KEY USERS
-- ============================================================

DO $$
DECLARE
  v_teach_id BIGINT;
  v_ta_user_id BIGINT;
BEGIN
  SELECT id INTO v_teach_id FROM users WHERE email = 'teacher@gmail.com';
  SELECT id INTO v_ta_user_id FROM users WHERE email = 'ta@gmail.com';
  
  -- Teacher stats
  INSERT INTO user_gamification_stats (
    user_id, total_points, current_streak, longest_streak,
    problems_solved, easy_solved, medium_solved, hard_solved,
    total_submissions, successful_submissions, average_time_seconds,
    last_submission_date, level, experience_points,
    quizzes_completed, total_quiz_score, average_quiz_score,
    quiz_streak, last_quiz_date, unique_course_quizzes
  ) VALUES (
    v_teach_id, 200, 10, 15, 5, 3, 2, 0, 5, 5, 1000,
    NOW(), 5, 800, 3, 225, 75.00, 3, NOW(), 2
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = 200, current_streak = 10, longest_streak = 15,
    problems_solved = 5, easy_solved = 3, medium_solved = 2, hard_solved = 0,
    total_submissions = 5, successful_submissions = 5,
    average_time_seconds = 1000, last_submission_date = NOW(),
    level = 5, experience_points = 800,
    quizzes_completed = 3, total_quiz_score = 225,
    average_quiz_score = 75.00, quiz_streak = 3,
    last_quiz_date = NOW(), unique_course_quizzes = 2;
  
  -- TA stats
  INSERT INTO user_gamification_stats (
    user_id, total_points, current_streak, longest_streak,
    problems_solved, easy_solved, medium_solved, hard_solved,
    total_submissions, successful_submissions, average_time_seconds,
    last_submission_date, level, experience_points,
    quizzes_completed, total_quiz_score, average_quiz_score,
    quiz_streak, last_quiz_date, unique_course_quizzes
  ) VALUES (
    v_ta_user_id, 150, 7, 12, 3, 2, 1, 0, 3, 3, 800,
    NOW(), 3, 500, 2, 150, 75.00, 2, NOW(), 1
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = 150, current_streak = 7, longest_streak = 12,
    problems_solved = 3, easy_solved = 2, medium_solved = 1, hard_solved = 0,
    total_submissions = 3, successful_submissions = 3,
    average_time_seconds = 800, last_submission_date = NOW(),
    level = 3, experience_points = 500,
    quizzes_completed = 2, total_quiz_score = 150,
    average_quiz_score = 75.00, quiz_streak = 2,
    last_quiz_date = NOW(), unique_course_quizzes = 1;
  
END $$;

-- ============================================================
-- STEP 9: INSERT ACHIEVEMENTS FOR TEACHER AND TA
-- ============================================================

INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT 
  (SELECT id FROM users WHERE email = 'teacher@gmail.com'),
  id, NOW() - INTERVAL '15 days'
FROM achievements WHERE name = 'First Submission'
ON CONFLICT DO NOTHING;

INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT 
  (SELECT id FROM users WHERE email = 'teacher@gmail.com'),
  id, NOW() - INTERVAL '10 days'
FROM achievements WHERE name = 'Problem Solver'
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 10: CREATE RUBRIC GRADES FOR SUBMISSIONS
-- ============================================================

-- Week 1 Python rubric grades
INSERT INTO rubric_grades (submission_id, criterion_id, score, feedback, graded_by)
SELECT 
  s.id, rc.id,
  CASE 
    WHEN rc.title = 'Correctness' THEN 38
    WHEN rc.title = 'Code Quality' THEN 28
    WHEN rc.title = 'Testing' THEN 29
  END,
  CASE
    WHEN rc.title = 'Correctness' THEN 'All test cases pass correctly.'
    WHEN rc.title = 'Code Quality' THEN 'Clean, readable code with good documentation.'
    WHEN rc.title = 'Testing' THEN 'Good test coverage including edge cases.'
  END,
  (SELECT id FROM users WHERE email = 'teacher@gmail.com')
FROM assignment_submissions s
JOIN assignments a ON s.assignment_id = a.id
JOIN rubric_criteria rc ON rc.rubric_id = 1401
WHERE s.student_id = (SELECT id FROM users WHERE email = 'student@gmail.com')
  AND a.title = 'Week 1: Python Fundamentals'
  AND NOT EXISTS (
    SELECT 1 FROM rubric_grades rg WHERE rg.submission_id = s.id AND rg.criterion_id = rc.id
  )
ON CONFLICT DO NOTHING;

-- Week 1 LL Implementation rubric grades
INSERT INTO rubric_grades (submission_id, criterion_id, score, feedback, graded_by)
SELECT 
  s.id, rc.id,
  CASE 
    WHEN rc.title = 'Algorithm Correctness' THEN 45
    WHEN rc.title = 'Code Quality' THEN 25  
    WHEN rc.title = 'Time Complexity' THEN 22
  END,
  CASE
    WHEN rc.title = 'Algorithm Correctness' THEN 'All operations work correctly.'
    WHEN rc.title = 'Code Quality' THEN 'Well-structured implementation.'
    WHEN rc.title = 'Time Complexity' THEN 'Efficient O(1) operations for insert/delete.'
  END,
  (SELECT id FROM users WHERE email = 'teacher@gmail.com')
FROM assignment_submissions s
JOIN assignments a ON s.assignment_id = a.id
JOIN rubric_criteria rc ON rc.rubric_id = 1403
WHERE s.student_id = (SELECT id FROM users WHERE email = 'student@gmail.com')
  AND a.title = 'Week 1: Linked List Implementation'
  AND NOT EXISTS (
    SELECT 1 FROM rubric_grades rg WHERE rg.submission_id = s.id AND rg.criterion_id = rc.id
  )
ON CONFLICT DO NOTHING;

COMMIT;
