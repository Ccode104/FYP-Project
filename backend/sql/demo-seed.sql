INSERT INTO departments (code, name)
VALUES ('CSE', 'Computer Science and Engineering')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO users (email, name, role, department_id, roll_number, password_hash, is_active, created_at, updated_at)
SELECT
  seed.email,
  seed.name,
  seed.role::user_role,
  CASE WHEN seed.role = 'admin' THEN NULL ELSE d.id END,
  seed.roll_number,
  '$2b$10$RhaBTnnSldAN8GC2HnuOYeLRndSa1pd2NC4VkpfDnKnaU2EentkPi',
  true,
  now(),
  now()
FROM (
  VALUES
    ('student@gmail.com', 'Demo Student', 'student', 'CSE-2026-001'),
    ('teacher@gmail.com', 'Demo Teacher', 'faculty', NULL),
    ('ta@gmail.com', 'Demo TA', 'ta', NULL),
    ('superadmin@gmail.com', 'Demo Super Admin', 'admin', NULL),
    ('admin@gmail.com', 'Legacy Admin Alias', 'admin', NULL),
    ('student2@gmail.com', 'Peer Student One', 'student', 'CSE-2026-002'),
    ('student3@gmail.com', 'Peer Student Two', 'student', 'CSE-2026-003')
) AS seed(email, name, role, roll_number)
LEFT JOIN departments d ON d.code = 'CSE'
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department_id = EXCLUDED.department_id,
  roll_number = EXCLUDED.roll_number,
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO admins (user_id, is_super, created_at, created_by)
SELECT sa.id, true, now(), sa.id
FROM users sa
WHERE sa.email = 'superadmin@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET is_super = true;

INSERT INTO admins (user_id, is_super, created_at, created_by)
SELECT a.id, false, now(), sa.id
FROM users a
JOIN users sa ON sa.email = 'superadmin@gmail.com'
WHERE a.email = 'admin@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET is_super = false;

INSERT INTO courses (code, title, description, department_id, credits, created_at, updated_at)
SELECT seed.code, seed.title, seed.description, d.id, seed.credits, now(), now()
FROM (
  VALUES
    ('CSE101-DEMO', 'Python Programming Studio', 'Hands-on Python programming with assignments, quizzes, and code reviews.', 4),
    ('CSE201-DEMO', 'Data Structures and Algorithms', 'Core DSA course with coding exercises, grading workflows, and progress tracking.', 4),
    ('CSE301-DEMO', 'Database Systems Design', 'Schema design, SQL optimization, and project-based database work.', 3)
) AS seed(code, title, description, credits)
JOIN departments d ON d.code = 'CSE'
ON CONFLICT (code) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  department_id = EXCLUDED.department_id,
  credits = EXCLUDED.credits,
  updated_at = now();

WITH teacher AS (
  SELECT id FROM users WHERE email = 'teacher@gmail.com'
),
course_seed AS (
  SELECT c.id AS course_id, v.term, v.section, v.max_capacity, v.start_date, v.end_date
  FROM courses c
  JOIN (
    VALUES
      ('CSE101-DEMO', 'Fall 2026', 'A', 40, DATE '2026-08-17', DATE '2026-12-11'),
      ('CSE201-DEMO', 'Fall 2026', 'A', 40, DATE '2026-08-17', DATE '2026-12-11'),
      ('CSE301-DEMO', 'Fall 2026', 'A', 35, DATE '2026-08-17', DATE '2026-12-11')
  ) AS v(code, term, section, max_capacity, start_date, end_date)
    ON v.code = c.code
)
INSERT INTO course_offerings (course_id, term, section, faculty_id, max_capacity, start_date, end_date)
SELECT cs.course_id, cs.term, cs.section, t.id, cs.max_capacity, cs.start_date, cs.end_date
FROM course_seed cs
CROSS JOIN teacher t
ON CONFLICT (course_id, term, section) DO UPDATE
SET
  faculty_id = EXCLUDED.faculty_id,
  max_capacity = EXCLUDED.max_capacity,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date;

INSERT INTO faculty_courses (course_id, faculty_id, assigned_at)
SELECT c.id, u.id, now()
FROM courses c
JOIN users u ON u.email = 'teacher@gmail.com'
WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
ON CONFLICT (course_id, faculty_id) DO NOTHING;

INSERT INTO enrollments (course_offering_id, student_id, enrolled_at, status)
SELECT co.id, u.id, now(), 'active'
FROM course_offerings co
JOIN courses c ON c.id = co.course_id
JOIN users u ON u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
ON CONFLICT (course_offering_id, student_id) DO UPDATE
SET status = 'active', enrolled_at = EXCLUDED.enrolled_at;

INSERT INTO ta_assignments (course_offering_id, ta_id, role, assigned_at)
SELECT co.id, u.id, 'ta', now()
FROM course_offerings co
JOIN courses c ON c.id = co.course_id
JOIN users u ON u.email = 'ta@gmail.com'
WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
ON CONFLICT (course_offering_id, ta_id) DO UPDATE
SET role = EXCLUDED.role, assigned_at = EXCLUDED.assigned_at;

INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points_reward, rarity, is_active, created_at)
VALUES
  ('First Submission', 'Submit your first assignment', 'target', 'progress', 'submissions', 1, 10, 'common', true, now()),
  ('Quiz Ace', 'Score 90 or above in a quiz', 'brain', 'quiz', 'high_quiz_scores', 1, 25, 'rare', true, now()),
  ('Consistency Streak', 'Maintain a study streak for 5 days', 'flame', 'streak', 'current_streak', 5, 20, 'common', true, now()),
  ('Helpful TA', 'Support grading and student questions', 'shield', 'community', 'grading_tasks', 1, 15, 'common', true, now())
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  points_reward = EXCLUDED.points_reward,
  rarity = EXCLUDED.rarity,
  is_active = EXCLUDED.is_active;

WITH offering_map AS (
  SELECT c.code, co.id AS offering_id
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
),
teacher AS (
  SELECT id FROM users WHERE email = 'teacher@gmail.com'
)
INSERT INTO rubrics (title, description, course_offering_id, created_by, created_at, updated_at)
SELECT
  CASE om.code
    WHEN 'CSE101-DEMO' THEN 'Python Lab Rubric'
    WHEN 'CSE201-DEMO' THEN 'DSA Implementation Rubric'
    ELSE 'Database Project Rubric'
  END,
  'Demo rubric used for grading and submission review.',
  om.offering_id,
  t.id,
  now(),
  now()
FROM offering_map om
CROSS JOIN teacher t;

INSERT INTO rubric_criteria (rubric_id, title, description, max_points, weight, position)
SELECT r.id, v.title, v.description, v.max_points, v.weight, v.position
FROM rubrics r
JOIN (
  VALUES
    ('Python Lab Rubric', 'Correctness', 'Meets the required behavior.', 40, 1.0, 1),
    ('Python Lab Rubric', 'Code Quality', 'Readable and maintainable code.', 30, 1.0, 2),
    ('Python Lab Rubric', 'Testing', 'Good edge-case coverage.', 30, 1.0, 3),
    ('DSA Implementation Rubric', 'Algorithm Correctness', 'Correct data-structure behavior.', 45, 1.0, 1),
    ('DSA Implementation Rubric', 'Complexity', 'Appropriate time and space complexity.', 25, 1.0, 2),
    ('DSA Implementation Rubric', 'Documentation', 'Clear explanation and naming.', 30, 1.0, 3),
    ('Database Project Rubric', 'Schema Design', 'Normalized schema with valid relationships.', 40, 1.0, 1),
    ('Database Project Rubric', 'SQL Quality', 'Queries are readable and optimized.', 30, 1.0, 2),
    ('Database Project Rubric', 'Analysis', 'Good explanation of tradeoffs.', 30, 1.0, 3)
) AS v(rubric_title, title, description, max_points, weight, position)
  ON v.rubric_title = r.title;

WITH teacher AS (
  SELECT id FROM users WHERE email = 'teacher@gmail.com'
),
offering_map AS (
  SELECT c.code, co.id AS offering_id
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
)
INSERT INTO assignments (
  course_offering_id,
  title,
  description,
  assignment_type,
  release_at,
  due_at,
  max_score,
  total_points,
  allow_multiple_submissions,
  created_by,
  created_at,
  assignment_config,
  submission_requirements,
  grading_config,
  is_graded,
  file_size_limit_mb,
  allow_github_repo
)
SELECT
  om.offering_id,
  seed.title,
  seed.description,
  seed.assignment_type,
  seed.release_at,
  seed.due_at,
  seed.max_score,
  seed.total_points,
  seed.allow_multiple_submissions,
  t.id,
  now(),
  seed.assignment_config::jsonb,
  seed.submission_requirements::jsonb,
  seed.grading_config::jsonb,
  true,
  seed.file_size_limit_mb,
  seed.allow_github_repo
FROM (
  VALUES
    (
      'CSE101-DEMO',
      'Lab 1: Python Foundations',
      'Implement a small CLI app with loops, functions, and input validation.',
      'code',
      now() - INTERVAL '21 days',
      now() - INTERVAL '14 days',
      100::numeric,
      100::numeric,
      false,
      10,
      true,
      '{"assignment_type":"simple","components":[{"id":"main","type":"code","title":"Python solution","points":100}]}' ,
      '[{"component_id":"main","submission_type":"code","accepted_formats":[".py"],"required":true}]',
      '{"grading_type":"rubric","allow_partial_credit":true}'
    ),
    (
      'CSE101-DEMO',
      'Lab 2: OOP Repository Project',
      'Design a small object-oriented project and include a short reflection note.',
      'file',
      now() - INTERVAL '12 days',
      now() - INTERVAL '5 days',
      100::numeric,
      100::numeric,
      false,
      25,
      true,
      '{"assignment_type":"component","components":[{"id":"repo","type":"repository","title":"GitHub repository","points":80},{"id":"reflection","type":"document","title":"Reflection note","points":20}]}' ,
      '[{"component_id":"repo","submission_type":"url","accepted_formats":["url"],"required":true},{"component_id":"reflection","submission_type":"file_upload","accepted_formats":[".pdf",".md"],"required":true}]',
      '{"grading_type":"component","allow_partial_credit":true}'
    ),
    (
      'CSE101-DEMO',
      'Report: Python Testing Strategy',
      'Upload a short report explaining how you would test a Python service.',
      'file',
      now() - INTERVAL '3 days',
      now() + INTERVAL '4 days',
      50::numeric,
      50::numeric,
      false,
      5,
      false,
      '{"assignment_type":"simple","components":[{"id":"report","type":"document","title":"Testing strategy report","points":50}]}' ,
      '[{"component_id":"report","submission_type":"file_upload","accepted_formats":[".pdf"],"required":true}]',
      '{"grading_type":"simple","allow_partial_credit":true}'
    ),
    (
      'CSE201-DEMO',
      'Assignment 1: Linked List Toolkit',
      'Implement singly and doubly linked list operations and explain complexity.',
      'code',
      now() - INTERVAL '18 days',
      now() - INTERVAL '10 days',
      100::numeric,
      100::numeric,
      false,
      10,
      true,
      '{"assignment_type":"simple","components":[{"id":"main","type":"code","title":"Linked list implementation","points":100}]}' ,
      '[{"component_id":"main","submission_type":"code","accepted_formats":[".py",".js",".cpp"],"required":true}]',
      '{"grading_type":"rubric","allow_partial_credit":true}'
    ),
    (
      'CSE201-DEMO',
      'Assignment 2: Tree Traversal Analysis',
      'Submit a PDF comparing DFS and BFS traversals with sample cases.',
      'file',
      now() - INTERVAL '7 days',
      now() - INTERVAL '1 day',
      75::numeric,
      75::numeric,
      false,
      8,
      false,
      '{"assignment_type":"simple","components":[{"id":"analysis","type":"document","title":"Traversal analysis","points":75}]}' ,
      '[{"component_id":"analysis","submission_type":"file_upload","accepted_formats":[".pdf"],"required":true}]',
      '{"grading_type":"simple","allow_partial_credit":true}'
    ),
    (
      'CSE201-DEMO',
      'Assignment 3: Graph Practice Set',
      'Solve graph questions before the next tutorial.',
      'file',
      now() - INTERVAL '1 day',
      now() + INTERVAL '6 days',
      60::numeric,
      60::numeric,
      false,
      5,
      false,
      '{"assignment_type":"simple","components":[{"id":"worksheet","type":"document","title":"Graph worksheet","points":60}]}' ,
      '[{"component_id":"worksheet","submission_type":"file_upload","accepted_formats":[".pdf"],"required":true}]',
      '{"grading_type":"simple","allow_partial_credit":true}'
    ),
    (
      'CSE301-DEMO',
      'Project 1: ERD and Schema Design',
      'Create an ER diagram and SQL schema for a campus marketplace.',
      'file',
      now() - INTERVAL '15 days',
      now() - INTERVAL '7 days',
      100::numeric,
      100::numeric,
      false,
      10,
      false,
      '{"assignment_type":"simple","components":[{"id":"schema","type":"document","title":"ERD and schema","points":100}]}' ,
      '[{"component_id":"schema","submission_type":"file_upload","accepted_formats":[".pdf",".sql"],"required":true}]',
      '{"grading_type":"rubric","allow_partial_credit":true}'
    ),
    (
      'CSE301-DEMO',
      'Project 2: Query Optimization Memo',
      'Upload a memo explaining query-plan changes and performance results.',
      'file',
      now() - INTERVAL '5 days',
      now() - INTERVAL '2 days',
      80::numeric,
      80::numeric,
      false,
      5,
      false,
      '{"assignment_type":"simple","components":[{"id":"memo","type":"document","title":"Optimization memo","points":80}]}' ,
      '[{"component_id":"memo","submission_type":"file_upload","accepted_formats":[".pdf"],"required":true}]',
      '{"grading_type":"simple","allow_partial_credit":true}'
    )
) AS seed(course_code, title, description, assignment_type, release_at, due_at, max_score, total_points, allow_multiple_submissions, file_size_limit_mb, allow_github_repo, assignment_config, submission_requirements, grading_config)
JOIN offering_map om ON om.code = seed.course_code
CROSS JOIN teacher t;

WITH teacher AS (
  SELECT id FROM users WHERE email = 'teacher@gmail.com'
),
ta AS (
  SELECT id FROM users WHERE email = 'ta@gmail.com'
),
student_main AS (
  SELECT id FROM users WHERE email = 'student@gmail.com'
),
student_peer_one AS (
  SELECT id FROM users WHERE email = 'student2@gmail.com'
),
student_peer_two AS (
  SELECT id FROM users WHERE email = 'student3@gmail.com'
),
assignment_map AS (
  SELECT c.code AS course_code, a.id AS assignment_id, a.title
  FROM assignments a
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
),
seeded_submissions AS (
  INSERT INTO assignment_submissions (
    assignment_id,
    student_id,
    submitted_at,
    status,
    final_score,
    grader_id,
    graded_at,
    comments,
    attempt,
    content,
    drive_url,
    drive_file_id
  )
  SELECT
    am.assignment_id,
    seed.student_id,
    seed.submitted_at,
    seed.status,
    seed.final_score,
    seed.grader_id,
    seed.graded_at,
    seed.comments,
    1,
    seed.content,
    seed.drive_url,
    seed.drive_file_id
  FROM assignment_map am
  JOIN (
    SELECT 'Lab 1: Python Foundations'::text AS title, (SELECT id FROM student_main) AS student_id, now() - INTERVAL '15 days' AS submitted_at, 'graded'::text AS status, 96::numeric AS final_score, (SELECT id FROM teacher) AS grader_id, now() - INTERVAL '13 days' AS graded_at, 'Great structure and thorough edge-case handling.'::text AS comments, NULL::text AS content, NULL::text AS drive_url, NULL::text AS drive_file_id
    UNION ALL
    SELECT 'Lab 2: OOP Repository Project', (SELECT id FROM student_main), now() - INTERVAL '4 days', 'graded', 88, (SELECT id FROM ta), now() - INTERVAL '2 days', 'Solid repository layout and clear README; reflection could go deeper.', 'Implemented using classes for library items and borrow flows.', 'https://drive.google.com/file/d/demo-reflection', 'demo-reflection-file'
    UNION ALL
    SELECT 'Assignment 1: Linked List Toolkit', (SELECT id FROM student_main), now() - INTERVAL '11 days', 'graded', 91, (SELECT id FROM teacher), now() - INTERVAL '9 days', 'Correct implementation and good explanation of tradeoffs.', NULL, NULL, NULL
    UNION ALL
    SELECT 'Assignment 2: Tree Traversal Analysis', (SELECT id FROM student_main), now() - INTERVAL '12 hours', 'submitted', NULL, NULL, NULL, 'Submitted slightly after the due time with additional examples.', NULL, NULL, NULL
    UNION ALL
    SELECT 'Project 1: ERD and Schema Design', (SELECT id FROM student_main), now() - INTERVAL '8 days', 'graded', 93, (SELECT id FROM teacher), now() - INTERVAL '6 days', 'Well-normalized schema and clear entity mapping.', NULL, NULL, NULL
    UNION ALL
    SELECT 'Project 2: Query Optimization Memo', (SELECT id FROM student_main), now() - INTERVAL '1 day', 'submitted', NULL, NULL, NULL, 'Included execution plan screenshots and indexing notes.', NULL, NULL, NULL
    UNION ALL
    SELECT 'Lab 1: Python Foundations', (SELECT id FROM student_peer_one), now() - INTERVAL '16 days', 'graded', 84, (SELECT id FROM teacher), now() - INTERVAL '13 days', 'Good work with a couple style issues.', NULL, NULL, NULL
    UNION ALL
    SELECT 'Assignment 1: Linked List Toolkit', (SELECT id FROM student_peer_one), now() - INTERVAL '10 days', 'graded', 77, (SELECT id FROM ta), now() - INTERVAL '8 days', 'Logic works but complexity notes were thin.', NULL, NULL, NULL
    UNION ALL
    SELECT 'Project 1: ERD and Schema Design', (SELECT id FROM student_peer_two), now() - INTERVAL '7 days', 'graded', 89, (SELECT id FROM teacher), now() - INTERVAL '5 days', 'Good schema and sensible keys.', NULL, NULL, NULL
  ) AS seed
    ON seed.title = am.title
  RETURNING id, assignment_id, student_id
)
INSERT INTO submission_files (submission_id, storage_path, filename, file_size, mime_type, uploaded_at)
SELECT s.id, seed.storage_path, seed.filename, seed.file_size, seed.mime_type, now()
FROM seeded_submissions s
JOIN assignment_map am ON am.assignment_id = s.assignment_id
JOIN (
  VALUES
    ('Lab 2: OOP Repository Project', 'student@gmail.com', 'local://submissions/oop-reflection.pdf', 'oop-reflection.pdf', 184320::bigint, 'application/pdf'),
    ('Assignment 2: Tree Traversal Analysis', 'student@gmail.com', 'local://submissions/tree-traversal-analysis.pdf', 'tree-traversal-analysis.pdf', 94208::bigint, 'application/pdf'),
    ('Project 1: ERD and Schema Design', 'student@gmail.com', 'local://submissions/erd-schema-design.sql', 'erd-schema-design.sql', 28672::bigint, 'text/plain'),
    ('Project 2: Query Optimization Memo', 'student@gmail.com', 'local://submissions/query-optimization-memo.pdf', 'query-optimization-memo.pdf', 65536::bigint, 'application/pdf')
) AS seed(title, email, storage_path, filename, file_size, mime_type)
  ON seed.title = am.title
JOIN users u ON u.id = s.student_id AND u.email = seed.email;

INSERT INTO file_submissions (submission_id, zip_file_url, submission_type, created_at)
SELECT s.id, seed.zip_file_url, seed.submission_type, now()
FROM assignment_submissions s
JOIN assignments a ON a.id = s.assignment_id
JOIN users u ON u.id = s.student_id
JOIN (
  VALUES
    ('Lab 2: OOP Repository Project', 'student@gmail.com', 'https://storage.example.com/demo/oop-project.zip', 'mixed'),
    ('Project 1: ERD and Schema Design', 'student@gmail.com', 'https://storage.example.com/demo/erd-schema.zip', 'file'),
    ('Project 2: Query Optimization Memo', 'student@gmail.com', 'https://storage.example.com/demo/query-memo.zip', 'file')
  ) AS seed(title, email, zip_file_url, submission_type)
  ON seed.title = a.title AND seed.email = u.email;

INSERT INTO github_submissions (
  submission_id,
  repo_url,
  repo_name,
  repo_description,
  repo_language,
  repo_private,
  repo_stars,
  repo_forks,
  repo_created_at,
  repo_updated_at,
  repo_default_branch,
  repo_size_kb,
  created_at
)
SELECT
  s.id,
  'https://github.com/demo-student/library-oop-project',
  'library-oop-project',
  'Object-oriented borrowing system demo project.',
  'TypeScript',
  false,
  4,
  1,
  now() - INTERVAL '20 days',
  now() - INTERVAL '4 days',
  'main',
  512,
  now()
FROM assignment_submissions s
JOIN assignments a ON a.id = s.assignment_id
JOIN users u ON u.id = s.student_id
WHERE a.title = 'Lab 2: OOP Repository Project'
  AND u.email = 'student@gmail.com';

INSERT INTO assignment_component_submissions (assignment_submission_id, component_id, submission_type, content, file_path, metadata, submitted_at)
SELECT s.id, 'repo', 'link', 'https://github.com/demo-student/library-oop-project', NULL, '{"label":"Repository"}'::jsonb, now() - INTERVAL '4 days'
FROM assignment_submissions s
JOIN assignments a ON a.id = s.assignment_id
JOIN users u ON u.id = s.student_id
WHERE a.title = 'Lab 2: OOP Repository Project' AND u.email = 'student@gmail.com';

INSERT INTO assignment_component_submissions (assignment_submission_id, component_id, submission_type, content, file_path, metadata, submitted_at)
SELECT s.id, 'reflection', 'file', NULL, 'local://submissions/oop-reflection.pdf', '{"label":"Reflection PDF"}'::jsonb, now() - INTERVAL '4 days'
FROM assignment_submissions s
JOIN assignments a ON a.id = s.assignment_id
JOIN users u ON u.id = s.student_id
WHERE a.title = 'Lab 2: OOP Repository Project' AND u.email = 'student@gmail.com';

INSERT INTO code_submissions (
  submission_id,
  language,
  code,
  run_output,
  test_results,
  created_at,
  started_at,
  completed_at,
  time_spent_seconds,
  gamified_score,
  attempts_count,
  efficiency_score
)
SELECT
  s.id,
  seed.language,
  seed.code,
  seed.run_output,
  seed.test_results::jsonb,
  now(),
  seed.started_at,
  seed.completed_at,
  seed.time_spent_seconds,
  seed.gamified_score,
  1,
  seed.efficiency_score
FROM assignment_submissions s
JOIN assignments a ON a.id = s.assignment_id
JOIN users u ON u.id = s.student_id
JOIN (
  VALUES
    (
      'Lab 1: Python Foundations',
      'student@gmail.com',
      'python',
      'def validate_score(value):\n    return max(0, min(100, int(value)))\n\nprint(validate_score(104))\n',
      '100',
      '{"passed":true,"tests_passed":12,"tests_failed":0,"coverage":98}',
      now() - INTERVAL '16 days',
      now() - INTERVAL '15 days',
      5400,
      120,
      0.93::numeric
    ),
    (
      'Assignment 1: Linked List Toolkit',
      'student@gmail.com',
      'python',
      'class Node:\n    def __init__(self, value):\n        self.value = value\n        self.next = None\n',
      'All hidden tests passed',
      '{"passed":true,"tests_passed":18,"tests_failed":0,"coverage":94}',
      now() - INTERVAL '12 days',
      now() - INTERVAL '11 days',
      7200,
      110,
      0.89::numeric
    ),
    (
      'Lab 1: Python Foundations',
      'student2@gmail.com',
      'python',
      'def greet():\n    return "hello"\n',
      '84',
      '{"passed":true,"tests_passed":10,"tests_failed":2,"coverage":80}',
      now() - INTERVAL '17 days',
      now() - INTERVAL '16 days',
      4600,
      90,
      0.78::numeric
    )
) AS seed(title, email, language, code, run_output, test_results, started_at, completed_at, time_spent_seconds, gamified_score, efficiency_score)
  ON seed.title = a.title AND seed.email = u.email;

INSERT INTO submission_grades (submission_id, grader_id, score, feedback, created_at)
SELECT s.id, seed.grader_id, seed.score, seed.feedback, now()
FROM assignment_submissions s
JOIN assignments a ON a.id = s.assignment_id
JOIN users u ON u.id = s.student_id
JOIN (
  SELECT 'Lab 1: Python Foundations'::text AS title, 'student@gmail.com'::text AS email, (SELECT id FROM users WHERE email = 'teacher@gmail.com') AS grader_id, 96::numeric AS score, 'Excellent structure, naming, and test discipline.'::text AS feedback
  UNION ALL
  SELECT 'Lab 2: OOP Repository Project', 'student@gmail.com', (SELECT id FROM users WHERE email = 'ta@gmail.com'), 88, 'Repository is clear and submission is fully viewable from staff pages.'
  UNION ALL
  SELECT 'Assignment 1: Linked List Toolkit', 'student@gmail.com', (SELECT id FROM users WHERE email = 'teacher@gmail.com'), 91, 'Correct implementation with good explanation of complexity.'
  UNION ALL
  SELECT 'Project 1: ERD and Schema Design', 'student@gmail.com', (SELECT id FROM users WHERE email = 'teacher@gmail.com'), 93, 'Strong schema design and clean ERD.'
  UNION ALL
  SELECT 'Lab 1: Python Foundations', 'student2@gmail.com', (SELECT id FROM users WHERE email = 'teacher@gmail.com'), 84, 'Working submission with a few formatting gaps.'
  UNION ALL
  SELECT 'Assignment 1: Linked List Toolkit', 'student2@gmail.com', (SELECT id FROM users WHERE email = 'ta@gmail.com'), 77, 'Meets core requirements but needs more explanation.'
  UNION ALL
  SELECT 'Project 1: ERD and Schema Design', 'student3@gmail.com', (SELECT id FROM users WHERE email = 'teacher@gmail.com'), 89, 'Nice normalization and indexing choices.'
) AS seed
  ON seed.title = a.title AND seed.email = u.email;

INSERT INTO grading_tasks (assignment_id, student_id, ta_id, assigned_at, status)
SELECT a.id, u.id, ta.id, now() - INTERVAL '1 day', 'in_progress'
FROM assignments a
JOIN users u ON u.email = 'student@gmail.com'
JOIN users ta ON ta.email = 'ta@gmail.com'
WHERE a.title = 'Assignment 2: Tree Traversal Analysis';

INSERT INTO grading_tasks (assignment_id, student_id, ta_id, assigned_at, status)
SELECT a.id, u.id, ta.id, now() - INTERVAL '1 day', 'assigned'
FROM assignments a
JOIN users u ON u.email = 'student@gmail.com'
JOIN users ta ON ta.email = 'ta@gmail.com'
WHERE a.title = 'Project 2: Query Optimization Memo';

INSERT INTO component_grades (assignment_submission_id, component_id, score, feedback, graded_by, graded_at)
SELECT s.id, 'repo', 70, 'Repository structure is strong and commit history is readable.', ta.id, now() - INTERVAL '2 days'
FROM assignment_submissions s
JOIN assignments a ON a.id = s.assignment_id
JOIN users u ON u.id = s.student_id
JOIN users ta ON ta.email = 'ta@gmail.com'
WHERE a.title = 'Lab 2: OOP Repository Project' AND u.email = 'student@gmail.com';

INSERT INTO component_grades (assignment_submission_id, component_id, score, feedback, graded_by, graded_at)
SELECT s.id, 'reflection', 18, 'Reflection connects implementation choices back to requirements.', ta.id, now() - INTERVAL '2 days'
FROM assignment_submissions s
JOIN assignments a ON a.id = s.assignment_id
JOIN users u ON u.id = s.student_id
JOIN users ta ON ta.email = 'ta@gmail.com'
WHERE a.title = 'Lab 2: OOP Repository Project' AND u.email = 'student@gmail.com';

INSERT INTO rubric_grades (submission_id, criterion_id, score, feedback, graded_by, graded_at)
SELECT s.id, rc.id, seed.score, seed.feedback, seed.graded_by, now()
FROM assignment_submissions s
JOIN assignments a ON a.id = s.assignment_id
JOIN users u ON u.id = s.student_id
JOIN rubrics r ON r.course_offering_id = a.course_offering_id
JOIN rubric_criteria rc ON rc.rubric_id = r.id
JOIN (
  SELECT 'Lab 1: Python Foundations'::text AS assignment_title, 'student@gmail.com'::text AS email, 'Correctness'::text AS criterion_title, 38::numeric AS score, 'All required behaviors are covered.'::text AS feedback, (SELECT id FROM users WHERE email = 'teacher@gmail.com') AS graded_by
  UNION ALL
  SELECT 'Lab 1: Python Foundations', 'student@gmail.com', 'Code Quality', 29, 'Readable functions and sensible naming.', (SELECT id FROM users WHERE email = 'teacher@gmail.com')
  UNION ALL
  SELECT 'Lab 1: Python Foundations', 'student@gmail.com', 'Testing', 29, 'Edge cases are well represented.', (SELECT id FROM users WHERE email = 'teacher@gmail.com')
  UNION ALL
  SELECT 'Assignment 1: Linked List Toolkit', 'student@gmail.com', 'Algorithm Correctness', 42, 'List operations behave correctly.', (SELECT id FROM users WHERE email = 'teacher@gmail.com')
  UNION ALL
  SELECT 'Assignment 1: Linked List Toolkit', 'student@gmail.com', 'Complexity', 22, 'Complexity analysis is accurate.', (SELECT id FROM users WHERE email = 'teacher@gmail.com')
  UNION ALL
  SELECT 'Assignment 1: Linked List Toolkit', 'student@gmail.com', 'Documentation', 27, 'Explanations are concise and helpful.', (SELECT id FROM users WHERE email = 'teacher@gmail.com')
  UNION ALL
  SELECT 'Project 1: ERD and Schema Design', 'student@gmail.com', 'Schema Design', 38, 'Well-normalized schema with clean foreign keys.', (SELECT id FROM users WHERE email = 'teacher@gmail.com')
  UNION ALL
  SELECT 'Project 1: ERD and Schema Design', 'student@gmail.com', 'SQL Quality', 27, 'Readable DDL and query examples.', (SELECT id FROM users WHERE email = 'teacher@gmail.com')
  UNION ALL
  SELECT 'Project 1: ERD and Schema Design', 'student@gmail.com', 'Analysis', 28, 'Good explanation of choices and tradeoffs.', (SELECT id FROM users WHERE email = 'teacher@gmail.com')
) AS seed
  ON seed.assignment_title = a.title AND seed.email = u.email AND seed.criterion_title = rc.title;

WITH teacher AS (
  SELECT id FROM users WHERE email = 'teacher@gmail.com'
),
offering_map AS (
  SELECT c.code, co.id AS offering_id
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
)
INSERT INTO quizzes (
  course_offering_id,
  title,
  description,
  start_at,
  end_at,
  max_score,
  is_proctored,
  time_limit,
  proctoring_config_id,
  allow_suspension_resume
)
SELECT
  om.offering_id,
  seed.title,
  seed.description,
  seed.start_at,
  seed.end_at,
  seed.max_score,
  seed.is_proctored,
  seed.time_limit,
  NULL,
  true
FROM (
  VALUES
    ('CSE101-DEMO', 'Quiz 1: Python Basics', 'Completed quiz used for student results and analytics.', now() - INTERVAL '11 days', now() - INTERVAL '10 days', 50::numeric, false, 30),
    ('CSE101-DEMO', 'Quiz 2: Python OOP Concepts', 'Upcoming quiz so the student dashboard shows pending work.', now() + INTERVAL '3 days', now() + INTERVAL '4 days', 40::numeric, false, 25),
    ('CSE201-DEMO', 'Quiz 1: Trees and Traversals', 'Proctored DSA quiz with completed attempts.', now() - INTERVAL '6 days', now() - INTERVAL '5 days', 60::numeric, true, 40),
    ('CSE301-DEMO', 'Quiz 1: SQL Optimization', 'Database quiz with mixed performance for analytics.', now() - INTERVAL '4 days', now() - INTERVAL '3 days', 50::numeric, false, 35)
) AS seed(course_code, title, description, start_at, end_at, max_score, is_proctored, time_limit)
JOIN offering_map om ON om.code = seed.course_code;

INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata)
SELECT q.id, seed.question_text, seed.question_type, seed.metadata::jsonb
FROM quizzes q
JOIN (
  VALUES
    ('Quiz 1: Python Basics', 'What is the output of print(2 ** 3)?', 'mcq', '{"options":["6","8","9","10"],"correct_answer":"8"}'),
    ('Quiz 1: Python Basics', 'Which keyword defines a function?', 'mcq', '{"options":["func","def","lambda","method"],"correct_answer":"def"}'),
    ('Quiz 2: Python OOP Concepts', 'A class defines ____.', 'mcq', '{"options":["an instance","a blueprint","a loop","a package"],"correct_answer":"a blueprint"}'),
    ('Quiz 1: Trees and Traversals', 'Which traversal visits root-left-right?', 'mcq', '{"options":["Inorder","Preorder","Postorder","Level order"],"correct_answer":"Preorder"}'),
    ('Quiz 1: Trees and Traversals', 'Balanced BST lookup is typically ____.', 'mcq', '{"options":["O(1)","O(log n)","O(n)","O(n log n)"],"correct_answer":"O(log n)"}'),
    ('Quiz 1: SQL Optimization', 'Which index helps equality lookup on a single column?', 'mcq', '{"options":["B-tree","GIN","BRIN","Hash join"],"correct_answer":"B-tree"}'),
    ('Quiz 1: SQL Optimization', 'EXPLAIN ANALYZE shows ____.', 'mcq', '{"options":["only syntax","execution plan with timings","permissions","DDL history"],"correct_answer":"execution plan with timings"}')
) AS seed(quiz_title, question_text, question_type, metadata)
  ON seed.quiz_title = q.title;

INSERT INTO proctoring_configs (quiz_id, name, webcam_required, screen_monitoring, face_detection_required, max_warnings, created_by, created_at, updated_at)
SELECT q.id, 'Demo DSA Proctoring', true, true, true, 3, u.id, now(), now()
FROM quizzes q
JOIN users u ON u.email = 'teacher@gmail.com'
WHERE q.title = 'Quiz 1: Trees and Traversals'
ON CONFLICT (quiz_id) DO UPDATE
SET
  name = EXCLUDED.name,
  webcam_required = EXCLUDED.webcam_required,
  screen_monitoring = EXCLUDED.screen_monitoring,
  face_detection_required = EXCLUDED.face_detection_required,
  max_warnings = EXCLUDED.max_warnings,
  updated_at = now();

WITH quiz_map AS (
  SELECT q.id AS quiz_id, q.title
  FROM quizzes q
  WHERE q.title IN ('Quiz 1: Python Basics', 'Quiz 1: Trees and Traversals', 'Quiz 1: SQL Optimization')
),
student_map AS (
  SELECT id, email FROM users WHERE email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
)
INSERT INTO quiz_attempts (
  quiz_id,
  student_id,
  started_at,
  finished_at,
  score,
  answers,
  violated,
  grade,
  feedback,
  graded_at,
  graded_by
)
SELECT
  qm.quiz_id,
  sm.id,
  seed.started_at,
  seed.finished_at,
  seed.score,
  seed.answers::jsonb,
  false,
  seed.score,
  seed.feedback,
  seed.finished_at + INTERVAL '2 hours',
  seed.graded_by
FROM quiz_map qm
JOIN (
  SELECT 'Quiz 1: Python Basics'::text AS quiz_title, 'student@gmail.com'::text AS email, now() - INTERVAL '10 days 1 hour' AS started_at, now() - INTERVAL '10 days 35 minutes' AS finished_at, 46::numeric AS score, '{"1":{"student_answer":"8","is_correct":true},"2":{"student_answer":"def","is_correct":true}}'::text AS answers, 'Strong fundamentals.'::text AS feedback, (SELECT id FROM users WHERE email = 'teacher@gmail.com') AS graded_by
  UNION ALL
  SELECT 'Quiz 1: Python Basics', 'student2@gmail.com', now() - INTERVAL '10 days 2 hours', now() - INTERVAL '10 days 90 minutes', 34, '{"1":{"student_answer":"8","is_correct":true},"2":{"student_answer":"lambda","is_correct":false}}', 'One concept slip, otherwise solid.', (SELECT id FROM users WHERE email = 'teacher@gmail.com')
  UNION ALL
  SELECT 'Quiz 1: Trees and Traversals', 'student@gmail.com', now() - INTERVAL '5 days 1 hour', now() - INTERVAL '5 days 15 minutes', 52, '{"4":{"student_answer":"Preorder","is_correct":true},"5":{"student_answer":"O(log n)","is_correct":true}}', 'Clean performance under proctoring.', (SELECT id FROM users WHERE email = 'teacher@gmail.com')
  UNION ALL
  SELECT 'Quiz 1: SQL Optimization', 'student@gmail.com', now() - INTERVAL '3 days 45 minutes', now() - INTERVAL '3 days 10 minutes', 40, '{"6":{"student_answer":"B-tree","is_correct":true},"7":{"student_answer":"execution plan with timings","is_correct":true}}', 'Good command of the basics.', (SELECT id FROM users WHERE email = 'teacher@gmail.com')
  UNION ALL
  SELECT 'Quiz 1: SQL Optimization', 'student3@gmail.com', now() - INTERVAL '3 days 35 minutes', now() - INTERVAL '3 days 5 minutes', 28, '{"6":{"student_answer":"GIN","is_correct":false},"7":{"student_answer":"execution plan with timings","is_correct":true}}', 'Needs improvement on index selection.', (SELECT id FROM users WHERE email = 'teacher@gmail.com')
) AS seed
  ON seed.quiz_title = qm.title
JOIN student_map sm ON sm.email = seed.email;

INSERT INTO proctoring_sessions (
  quiz_attempt_id,
  student_id,
  started_at,
  ended_at,
  device_info,
  browser_info,
  session_token,
  status,
  webcam_enabled,
  screen_monitoring_enabled,
  audio_monitoring_enabled,
  created_at,
  updated_at
)
SELECT
  qa.id,
  qa.student_id,
  qa.started_at,
  qa.finished_at,
  '{"device":"laptop","os":"Windows"}'::jsonb,
  '{"browser":"Chrome"}'::jsonb,
  'demo-proctoring-session',
  'completed',
  true,
  true,
  false,
  now(),
  now()
FROM quiz_attempts qa
JOIN quizzes q ON q.id = qa.quiz_id
JOIN users u ON u.id = qa.student_id
WHERE q.title = 'Quiz 1: Trees and Traversals'
  AND u.email = 'student@gmail.com';

INSERT INTO proctoring_analytics (
  session_id,
  total_violations,
  violations_by_type,
  violations_by_severity,
  session_duration_seconds,
  compliance_score,
  risk_level,
  flagged_for_review,
  created_at
)
SELECT
  ps.id,
  0,
  '{}'::jsonb,
  '{}'::jsonb,
  EXTRACT(EPOCH FROM (ps.ended_at - ps.started_at))::INTEGER,
  100,
  'low',
  false,
  now()
FROM proctoring_sessions ps
WHERE ps.session_token = 'demo-proctoring-session';

INSERT INTO user_gamification_stats (
  user_id,
  total_points,
  current_streak,
  longest_streak,
  problems_solved,
  easy_solved,
  medium_solved,
  hard_solved,
  total_submissions,
  successful_submissions,
  average_time_seconds,
  last_submission_date,
  level,
  experience_points,
  quizzes_completed,
  perfect_quiz_scores,
  high_quiz_scores,
  fast_quiz_completions,
  total_quiz_score,
  average_quiz_score,
  quiz_streak,
  last_quiz_date,
  unique_course_quizzes,
  updated_at
)
SELECT
  u.id,
  seed.total_points,
  seed.current_streak,
  seed.longest_streak,
  seed.problems_solved,
  seed.easy_solved,
  seed.medium_solved,
  seed.hard_solved,
  seed.total_submissions,
  seed.successful_submissions,
  seed.average_time_seconds,
  CURRENT_DATE,
  seed.level,
  seed.experience_points,
  seed.quizzes_completed,
  seed.perfect_quiz_scores,
  seed.high_quiz_scores,
  seed.fast_quiz_completions,
  seed.total_quiz_score,
  seed.average_quiz_score,
  seed.quiz_streak,
  CURRENT_DATE,
  seed.unique_course_quizzes,
  now()
FROM users u
JOIN (
  VALUES
    ('student@gmail.com', 420, 6, 9, 8, 4, 3, 1, 6, 5, 6100, 4, 860, 3, 0, 2, 1, 138, 46.00, 3, 3),
    ('student2@gmail.com', 260, 3, 5, 4, 2, 2, 0, 3, 3, 5200, 2, 420, 1, 0, 0, 1, 34, 34.00, 1, 2),
    ('student3@gmail.com', 190, 2, 4, 3, 1, 2, 0, 1, 1, 4800, 2, 300, 1, 0, 0, 0, 28, 28.00, 1, 1),
    ('teacher@gmail.com', 140, 4, 6, 2, 1, 1, 0, 0, 0, 0, 3, 320, 0, 0, 0, 0, 0, 0.00, 0, 0),
    ('ta@gmail.com', 175, 5, 7, 2, 1, 1, 0, 0, 0, 0, 3, 360, 0, 0, 0, 0, 0, 0.00, 0, 0)
) AS seed(email, total_points, current_streak, longest_streak, problems_solved, easy_solved, medium_solved, hard_solved, total_submissions, successful_submissions, average_time_seconds, level, experience_points, quizzes_completed, perfect_quiz_scores, high_quiz_scores, fast_quiz_completions, total_quiz_score, average_quiz_score, quiz_streak, unique_course_quizzes)
  ON seed.email = u.email;

INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT u.id, a.id, now() - INTERVAL '7 days'
FROM users u
JOIN achievements a ON a.name IN ('First Submission', 'Consistency Streak')
WHERE u.email = 'student@gmail.com'
ON CONFLICT (user_id, achievement_id) DO NOTHING;

INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT u.id, a.id, now() - INTERVAL '3 days'
FROM users u
JOIN achievements a ON a.name = 'Quiz Ace'
WHERE u.email = 'student@gmail.com'
ON CONFLICT (user_id, achievement_id) DO NOTHING;

INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT u.id, a.id, now() - INTERVAL '2 days'
FROM users u
JOIN achievements a ON a.name = 'Helpful TA'
WHERE u.email = 'ta@gmail.com'
ON CONFLICT (user_id, achievement_id) DO NOTHING;

INSERT INTO leaderboards (leaderboard_type, reference_id, user_id, score, rank, time_spent_seconds, submission_date, period_start, period_end)
SELECT 'course', co.id, u.id, seed.score, seed.rank, seed.time_spent_seconds, now(), CURRENT_DATE - 7, CURRENT_DATE + 7
FROM course_offerings co
JOIN courses c ON c.id = co.course_id AND c.code = 'CSE201-DEMO'
JOIN (
  VALUES
    ('student@gmail.com', 120, 1, 7200),
    ('student2@gmail.com', 95, 2, 8100),
    ('student3@gmail.com', 70, 3, 9000)
) AS seed(email, score, rank, time_spent_seconds)
  ON true
JOIN users u ON u.email = seed.email;

INSERT INTO notifications (user_id, title, body, is_read, created_at)
SELECT u.id, seed.title, seed.body, seed.is_read, seed.created_at
FROM users u
JOIN (
  VALUES
    ('student@gmail.com', 'Grade Posted', 'Your Lab 1: Python Foundations submission is graded and viewable.', false, now() - INTERVAL '13 days'),
    ('student@gmail.com', 'TA Review In Progress', 'Your Tree Traversal Analysis submission is assigned to the TA for review.', false, now() - INTERVAL '10 hours'),
    ('student@gmail.com', 'Upcoming Quiz', 'Quiz 2: Python OOP Concepts opens in 3 days.', false, now()),
    ('teacher@gmail.com', 'New Submission', 'Demo Student submitted Project 2: Query Optimization Memo.', false, now() - INTERVAL '1 day'),
    ('ta@gmail.com', 'Grading Queue', 'Two demo submissions are ready in the TA review queue.', false, now() - INTERVAL '8 hours'),
    ('superadmin@gmail.com', 'Demo Data Refreshed', 'The demo dataset was rebuilt successfully.', true, now())
) AS seed(email, title, body, is_read, created_at)
  ON seed.email = u.email;

INSERT INTO resources (course_offering_id, uploaded_by, title, description, resource_type, storage_path, filename, uploaded_at)
SELECT co.id, t.id, seed.title, seed.description, seed.resource_type, seed.storage_path, seed.filename, now()
FROM course_offerings co
JOIN courses c ON c.id = co.course_id
JOIN users t ON t.email = 'teacher@gmail.com'
JOIN (
  VALUES
    ('CSE101-DEMO', 'Python Recap Notes', 'Lecture notes for loops, functions, and testing.', 'notes', 'local://resources/python-recap-notes.pdf', 'python-recap-notes.pdf'),
    ('CSE201-DEMO', 'Traversal Cheat Sheet', 'Summary of BFS, DFS, and common tree patterns.', 'notes', 'local://resources/traversal-cheat-sheet.pdf', 'traversal-cheat-sheet.pdf'),
    ('CSE301-DEMO', 'Query Plan Walkthrough', 'Worked examples for EXPLAIN ANALYZE.', 'presentation', 'local://resources/query-plan-walkthrough.pdf', 'query-plan-walkthrough.pdf')
) AS seed(course_code, title, description, resource_type, storage_path, filename)
  ON seed.course_code = c.code;

WITH thread_seed AS (
  INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content, created_at)
  SELECT co.id, u.id, NULL, seed.content, now() - seed.offset_interval
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  JOIN (
    VALUES
      ('CSE101-DEMO', 'student@gmail.com', 'For Lab 2, should the reflection mention tradeoffs between inheritance and composition?', INTERVAL '2 days'),
      ('CSE201-DEMO', 'student2@gmail.com', 'Can we use recursion for all traversal questions or should we include iterative versions too?', INTERVAL '3 days'),
      ('CSE301-DEMO', 'teacher@gmail.com', 'Remember to annotate your indexes and explain why they help the queries you chose.', INTERVAL '1 day')
  ) AS seed(course_code, email, content, offset_interval)
    ON seed.course_code = c.code
  JOIN users u ON u.email = seed.email
  RETURNING id, course_offering_id, content
)
INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content, created_at)
SELECT ts.course_offering_id, u.id, ts.id, seed.content, now() - seed.offset_interval
FROM thread_seed ts
JOIN (
  VALUES
    ('For Lab 2, should the reflection mention tradeoffs between inheritance and composition?', 'teacher@gmail.com', 'Yes. A short section on why you chose one pattern over the other will help grading.', INTERVAL '36 hours'),
    ('Can we use recursion for all traversal questions or should we include iterative versions too?', 'ta@gmail.com', 'Include the iterative version for BFS and one DFS variant so we can compare complexity clearly.', INTERVAL '40 hours')
) AS seed(parent_content, email, content, offset_interval)
  ON seed.parent_content = ts.content
JOIN users u ON u.email = seed.email;

INSERT INTO live_lectures (
  title,
  description,
  course_offering_id,
  created_by,
  scheduled_at,
  started_at,
  ended_at,
  status,
  stream_key,
  recording_url,
  meeting_url,
  max_participants,
  is_recording,
  created_at,
  updated_at
)
SELECT
  seed.title,
  seed.description,
  co.id,
  teacher.id,
  seed.scheduled_at,
  seed.started_at,
  seed.ended_at,
  seed.status,
  seed.stream_key,
  seed.recording_url,
  seed.meeting_url,
  100,
  seed.is_recording,
  now(),
  now()
FROM course_offerings co
JOIN courses c ON c.id = co.course_id
JOIN users teacher ON teacher.email = 'teacher@gmail.com'
JOIN (
  VALUES
    ('CSE101-DEMO', 'Python OOP Review Session', 'Live walkthrough of the repository project expectations.', now() + INTERVAL '2 days', NULL::timestamptz, NULL::timestamptz, 'scheduled', 'demo-python-live', NULL::text, 'https://meet.google.com/demo-python', false),
    ('CSE201-DEMO', 'Trees Problem Solving Live', 'Recorded live session used for the lecture dashboard.', now() - INTERVAL '6 days', now() - INTERVAL '6 days', now() - INTERVAL '6 days' + INTERVAL '55 minutes', 'ended', 'demo-dsa-live', 'https://videos.example.com/demo-dsa-live', 'https://meet.google.com/demo-dsa', true)
) AS seed(course_code, title, description, scheduled_at, started_at, ended_at, status, stream_key, recording_url, meeting_url, is_recording)
  ON seed.course_code = c.code;

INSERT INTO live_lecture_participants (live_lecture_id, user_id, joined_at, left_at, role)
SELECT ll.id, u.id, ll.started_at, ll.ended_at, seed.role
FROM live_lectures ll
JOIN (
  VALUES
    ('Trees Problem Solving Live', 'student@gmail.com', 'student'),
    ('Trees Problem Solving Live', 'student2@gmail.com', 'student'),
    ('Trees Problem Solving Live', 'ta@gmail.com', 'ta')
) AS seed(lecture_title, email, role)
  ON seed.lecture_title = ll.title
JOIN users u ON u.email = seed.email;

INSERT INTO support_tickets (user_id, title, description, category, status, priority, assigned_to, course_offering_id, created_at, updated_at)
SELECT student.id, 'Unable to see late feedback badge', 'The submission appears in progress, but I want to confirm late feedback still shows after grading.', 'technical_issue', 'in_progress', 'medium', admin_user.id, co.id, now() - INTERVAL '18 hours', now() - INTERVAL '4 hours'
FROM users student
JOIN users admin_user ON admin_user.email = 'superadmin@gmail.com'
JOIN course_offerings co ON true
JOIN courses c ON c.id = co.course_id AND c.code = 'CSE201-DEMO'
WHERE student.email = 'student@gmail.com';

INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal, created_at)
SELECT st.id, u.id, seed.comment, seed.is_internal, now() - seed.offset_interval
FROM support_tickets st
JOIN (
  VALUES
    ('student@gmail.com', 'I can see the submission file, but the feedback label did not appear earlier.', false, INTERVAL '17 hours'),
    ('superadmin@gmail.com', 'Confirmed the dataset has a pending and a graded submission for verification.', true, INTERVAL '4 hours')
) AS seed(email, comment, is_internal, offset_interval)
  ON true
JOIN users u ON u.email = seed.email
WHERE st.title = 'Unable to see late feedback badge';

INSERT INTO messages (sender_id, receiver_id, subject, content, is_read, sent_at, created_at)
SELECT sender.id, receiver.id, seed.subject, seed.content, seed.is_read, now() - seed.offset_interval, now() - seed.offset_interval
FROM users sender
JOIN (
  VALUES
    ('teacher@gmail.com', 'student@gmail.com', 'Project follow-up', 'Your ERD submission is approved. Please carry the same consistency into Project 2.', true, INTERVAL '5 days'),
    ('ta@gmail.com', 'student@gmail.com', 'Traversal analysis', 'I am grading your tree traversal PDF now. The submission is fully visible in the review queue.', false, INTERVAL '8 hours'),
    ('superadmin@gmail.com', 'teacher@gmail.com', 'Demo dataset', 'The demo dataset has been refreshed for the presentation run-through.', true, INTERVAL '2 hours')
) AS seed(sender_email, receiver_email, subject, content, is_read, offset_interval)
  ON sender.email = seed.sender_email
JOIN users receiver ON receiver.email = seed.receiver_email;

INSERT INTO admin_activities (admin_id, action, entity_type, entity_id, entity_name, details, undoable, created_at)
SELECT admin_user.id, seed.action, seed.entity_type, seed.entity_id, seed.entity_name, seed.details::jsonb, false, now() - seed.offset_interval
FROM users admin_user
JOIN (
  VALUES
    ('create_course', 'course', (SELECT id FROM courses WHERE code = 'CSE101-DEMO'), 'Demo: Python Programming Studio', '{"source":"demo_seed"}', INTERVAL '3 hours'),
    ('create_course', 'course', (SELECT id FROM courses WHERE code = 'CSE201-DEMO'), 'Demo: Data Structures and Algorithms', '{"source":"demo_seed"}', INTERVAL '3 hours'),
    ('create_course', 'course', (SELECT id FROM courses WHERE code = 'CSE301-DEMO'), 'Demo: Database Systems Design', '{"source":"demo_seed"}', INTERVAL '3 hours'),
    ('seed_demo_data', 'support', NULL::bigint, 'Demo: Full dataset refresh', '{"users":["student@gmail.com","teacher@gmail.com","ta@gmail.com","superadmin@gmail.com"]}', INTERVAL '1 hour')
) AS seed(action, entity_type, entity_id, entity_name, details, offset_interval)
  ON true
WHERE admin_user.email = 'superadmin@gmail.com';
