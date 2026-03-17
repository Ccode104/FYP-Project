-- =====================================================
-- SAMPLE DATA FOR FLEXIBLE ASSIGNMENTS SYSTEM
-- Compatible with the provided database schema
-- =====================================================

-- =====================================================
-- PART 1: ENSURE CSE304 COURSE EXISTS
-- =====================================================

-- Insert CSE304 course if it doesn't exist
INSERT INTO courses (code, title, description, department_id, credits)
VALUES ('CSE304', 'Computer Programming Course', 'Advanced programming concepts with mixed assessment types', 1, 4)
ON CONFLICT (code) DO NOTHING;

-- Insert course offering for CSE304
INSERT INTO course_offerings (course_id, term, section, faculty_id, max_capacity, start_date, end_date)
SELECT
    c.id,
    'Fall 2024',
    'A',
    33, -- Assuming faculty user ID 33 exists
    50,
    '2024-08-15'::date,
    '2024-12-15'::date
FROM courses c
WHERE c.code = 'CSE304'
ON CONFLICT (course_id, term, section) DO NOTHING;

-- =====================================================
-- PART 2: FLEXIBLE ASSIGNMENTS DATA
-- =====================================================

-- 1. COMPLEX MIXED ASSIGNMENT: Code + Report + Presentation
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
    is_graded,
    created_by,
    created_at,
    assignment_config,
    submission_requirements,
    grading_config
) VALUES (
    (SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = 'CSE304' LIMIT 1),
    'Algorithm Analysis & Implementation Project',
    'Complete project combining coding, analysis, and presentation skills',
    'mixed',
    NOW() - INTERVAL '14 days',
    NOW() + INTERVAL '7 days',
    100.00,
    100.00,
    false,
    true,
    33,
    NOW() - INTERVAL '14 days',
    '{
        "assignment_type": "mixed",
        "components": [
            {
                "id": "code_implementation",
                "type": "code",
                "subtype": "large_code",
                "title": "Algorithm Implementation",
                "description": "Implement sorting and searching algorithms in Python",
                "language": "python",
                "max_files": 5,
                "test_cases_required": true,
                "points": 40,
                "estimated_time_hours": 8
            },
            {
                "id": "analysis_report",
                "type": "document",
                "subtype": "report",
                "title": "Algorithm Analysis Report",
                "description": "Analyze time/space complexity and performance characteristics",
                "format": "pdf",
                "max_pages": 5,
                "points": 30,
                "estimated_time_hours": 6
            },
            {
                "id": "presentation_demo",
                "type": "presentation",
                "subtype": "group_presentation",
                "title": "Algorithm Demonstration",
                "description": "Present your implementation and findings (10 minutes)",
                "duration_minutes": 10,
                "points": 30,
                "estimated_time_hours": 4
            }
        ],
        "workflow": {
            "phases": ["implementation", "testing", "analysis", "presentation"],
            "dependencies": {
                "testing": ["implementation"],
                "analysis": ["testing"],
                "presentation": ["analysis"]
            }
        },
        "settings": {
            "allow_group_work": false,
            "peer_review_required": true,
            "auto_grading_enabled": true,
            "plagiarism_check": true,
            "code_execution_required": true
        }
    }',
    '[
        {
            "component_id": "code_implementation",
            "submission_type": "file_upload",
            "accepted_formats": ["py", "zip", "ipynb"],
            "max_file_size_mb": 10,
            "required": true,
            "allow_multiple_files": true
        },
        {
            "component_id": "analysis_report",
            "submission_type": "file_upload",
            "accepted_formats": ["pdf", "docx"],
            "max_file_size_mb": 5,
            "required": true
        },
        {
            "component_id": "presentation_demo",
            "submission_type": "link",
            "url_pattern": "https://.*",
            "required": true,
            "description": "Link to presentation slides or video"
        }
    ]',
    '{
        "grading_type": "component_based",
        "use_rubric": true,
        "rubric_id": "project_rubric",
        "allow_partial_credit": true,
        "grade_visibility": "after_due_date",
        "peer_review_weight": 0.2,
        "auto_grading_weight": 0.3
    }'
);

-- 2. SIMPLE CODE ASSIGNMENT: Data Structures Implementation
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
    is_graded,
    created_by,
    created_at,
    assignment_config,
    submission_requirements,
    grading_config
) VALUES (
    (SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = 'CSE304' LIMIT 1),
    'Data Structures Implementation',
    'Implement basic data structures with unit tests',
    'code',
    NOW() - INTERVAL '7 days',
    NOW() + INTERVAL '14 days',
    100.00,
    100.00,
    true,
    true,
    33,
    NOW() - INTERVAL '7 days',
    '{
        "assignment_type": "simple",
        "components": [
            {
                "id": "code_solution",
                "type": "code",
                "subtype": "small_code",
                "title": "Data Structures Code",
                "description": "Implement Stack, Queue, and LinkedList classes",
                "language": "python",
                "max_lines": 200,
                "test_cases_required": true,
                "points": 100,
                "estimated_time_hours": 4
            }
        ],
        "settings": {
            "allow_group_work": false,
            "peer_review_required": false,
            "auto_grading_enabled": true,
            "plagiarism_check": true,
            "code_execution_required": true
        }
    }',
    '[
        {
            "component_id": "code_solution",
            "submission_type": "file_upload",
            "accepted_formats": ["py"],
            "max_file_size_mb": 1,
            "required": true
        }
    ]',
    '{
        "grading_type": "auto_graded",
        "use_rubric": false,
        "allow_partial_credit": true,
        "grade_visibility": "immediate",
        "auto_grading_weight": 1.0
    }'
);

-- 3. DOCUMENT ASSIGNMENT: Handwritten + Report
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
    is_graded,
    created_by,
    created_at,
    assignment_config,
    submission_requirements,
    grading_config
) VALUES (
    (SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = 'CSE304' LIMIT 1),
    'Algorithm Design Manual',
    'Design algorithms manually and document the process',
    'mixed',
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '10 days',
    100.00,
    100.00,
    false,
    true,
    33,
    NOW() - INTERVAL '10 days',
    '{
        "assignment_type": "mixed",
        "components": [
            {
                "id": "handwritten_design",
                "type": "document",
                "subtype": "handwritten",
                "title": "Handwritten Algorithm Design",
                "description": "Design algorithms manually on paper, showing step-by-step logic",
                "format": "scan/photo",
                "max_pages": 3,
                "points": 40,
                "estimated_time_hours": 3
            },
            {
                "id": "design_report",
                "type": "document",
                "subtype": "report",
                "title": "Algorithm Design Report",
                "description": "Typed report explaining your design decisions and analysis",
                "format": "pdf",
                "max_pages": 4,
                "points": 60,
                "estimated_time_hours": 5
            }
        ],
        "settings": {
            "allow_group_work": false,
            "peer_review_required": true,
            "auto_grading_enabled": false,
            "plagiarism_check": true
        }
    }',
    '[
        {
            "component_id": "handwritten_design",
            "submission_type": "file_upload",
            "accepted_formats": ["jpg", "png", "pdf"],
            "max_file_size_mb": 5,
            "required": true,
            "description": "Scan or photo of handwritten work"
        },
        {
            "component_id": "design_report",
            "submission_type": "file_upload",
            "accepted_formats": ["pdf", "docx"],
            "max_file_size_mb": 3,
            "required": true
        }
    ]',
    '{
        "grading_type": "manual",
        "use_rubric": true,
        "rubric_id": "design_rubric",
        "allow_partial_credit": true,
        "grade_visibility": "after_due_date"
    }'
);

-- 4. PRACTICE ASSIGNMENT: Ungraded exercises
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
    is_graded,
    created_by,
    created_at,
    assignment_config,
    submission_requirements,
    grading_config
) VALUES (
    (SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = 'CSE304' LIMIT 1),
    'Practice: Basic Programming Exercises',
    'Optional practice exercises to reinforce basic concepts',
    'practice',
    NOW() - INTERVAL '3 days',
    NOW() + INTERVAL '30 days',
    0.00,
    0.00,
    true,
    false,
    33,
    NOW() - INTERVAL '3 days',
    '{
        "assignment_type": "practice",
        "components": [
            {
                "id": "practice_exercises",
                "type": "code",
                "subtype": "small_code",
                "title": "Practice Exercises",
                "description": "Solve basic programming problems for practice",
                "language": "any",
                "points": 0,
                "estimated_time_hours": 2
            }
        ],
        "settings": {
            "allow_group_work": true,
            "peer_review_required": false,
            "auto_grading_enabled": false,
            "plagiarism_check": false,
            "is_practice": true
        }
    }',
    '[
        {
            "component_id": "practice_exercises",
            "submission_type": "file_upload",
            "accepted_formats": ["py", "java", "cpp", "zip"],
            "max_file_size_mb": 5,
            "required": false,
            "description": "Optional submission for practice"
        }
    ]',
    '{
        "grading_type": "none",
        "use_rubric": false,
        "allow_partial_credit": false,
        "grade_visibility": "never"
    }'
);

-- =====================================================
-- PART 3: SAMPLE SUBMISSIONS AND GRADES
-- =====================================================

-- Create sample submissions for DummyStudent (assuming ID exists)
-- First, create main assignment submissions
INSERT INTO assignment_submissions (
    assignment_id,
    student_id,
    submitted_at,
    status,
    final_score,
    grader_id,
    graded_at,
    comments,
    attempt
) VALUES
(
    (SELECT id FROM assignments WHERE title = 'Algorithm Analysis & Implementation Project' LIMIT 1),
    (SELECT id FROM users WHERE email LIKE '%student%' LIMIT 1), -- Adjust based on your student user
    NOW() - INTERVAL '2 days',
    'graded',
    92.00,
    33,
    NOW() - INTERVAL '1 day',
    'Excellent comprehensive project with strong analysis and presentation.',
    1
),
(
    (SELECT id FROM assignments WHERE title = 'Data Structures Implementation' LIMIT 1),
    (SELECT id FROM users WHERE email LIKE '%student%' LIMIT 1),
    NOW() - INTERVAL '1 day',
    'graded',
    88.00,
    33,
    NOW() - INTERVAL '12 hours',
    'Good implementation with minor issues in edge case handling.',
    1
);

-- Create component submissions for the complex project
INSERT INTO assignment_component_submissions (
    assignment_submission_id,
    component_id,
    submission_type,
    content,
    file_path,
    metadata,
    submitted_at
) VALUES
(
    (SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Algorithm Analysis & Implementation Project' LIMIT 1) LIMIT 1),
    'code_implementation',
    'file',
    NULL,
    '/submissions/CSE304/project1/algorithms.zip',
    '{"language": "python", "files": ["sorting.py", "searching.py", "test_cases.py"], "lines_of_code": 245}',
    NOW() - INTERVAL '2 days'
),
(
    (SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Algorithm Analysis & Implementation Project' LIMIT 1) LIMIT 1),
    'analysis_report',
    'file',
    NULL,
    '/submissions/CSE304/project1/analysis.pdf',
    '{"format": "pdf", "pages": 4, "word_count": 1250}',
    NOW() - INTERVAL '2 days'
),
(
    (SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Algorithm Analysis & Implementation Project' LIMIT 1) LIMIT 1),
    'presentation_demo',
    'link',
    'https://docs.google.com/presentation/d/project-presentation-link',
    NULL,
    '{"platform": "Google Slides", "slides": 12}',
    NOW() - INTERVAL '2 days'
);

-- Create component grades
INSERT INTO component_grades (
    assignment_submission_id,
    component_id,
    score,
    feedback,
    graded_by,
    graded_at
) VALUES
(
    (SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Algorithm Analysis & Implementation Project' LIMIT 1) LIMIT 1),
    'code_implementation',
    38.00,
    'Excellent algorithm implementations with good test coverage.',
    33,
    NOW() - INTERVAL '1 day'
),
(
    (SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Algorithm Analysis & Implementation Project' LIMIT 1) LIMIT 1),
    'analysis_report',
    28.00,
    'Strong analysis of time complexity with good examples.',
    33,
    NOW() - INTERVAL '1 day'
),
(
    (SELECT id FROM assignment_submissions WHERE assignment_id = (SELECT id FROM assignments WHERE title = 'Algorithm Analysis & Implementation Project' LIMIT 1) LIMIT 1),
    'presentation_demo',
    26.00,
    'Clear presentation with good visual aids.',
    33,
    NOW() - INTERVAL '1 day'
);

-- =====================================================
-- PART 4: QUIZZES (Separate from assignments)
-- =====================================================

INSERT INTO quizzes (
    course_offering_id,
    title,
    start_at,
    end_at,
    max_score,
    is_proctored,
    time_limit,
    proctoring_config_id,
    allow_suspension_resume
) VALUES
(
    (SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = 'CSE304' LIMIT 1),
    'Database Design and SQL Quiz',
    NOW() - INTERVAL '3 days',
    NOW() + INTERVAL '3 days',
    75.00,
    false,
    45,
    NULL,
    true
),
(
    (SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = 'CSE304' LIMIT 1),
    'Programming Fundamentals Quiz',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '1 hour',
    50.00,
    true,
    30,
    NULL,
    false
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- PART 5: ACHIEVEMENTS AND NOTIFICATIONS
-- =====================================================

-- Insert achievement if it doesn't exist
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points_reward, rarity, is_active)
VALUES ('First Project Completed', 'Completed your first complex project assignment', '🏆', 'assignments', 'project_submissions', 1, 50, 'common', true)
ON CONFLICT (name) DO NOTHING;

-- User achievement
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT
    (SELECT id FROM users WHERE email LIKE '%student%' LIMIT 1),
    (SELECT id FROM achievements WHERE name = 'First Project Completed' LIMIT 1),
    NOW() - INTERVAL '1 day'
WHERE EXISTS (SELECT 1 FROM users WHERE email LIKE '%student%')
ON CONFLICT DO NOTHING;

-- Update gamification stats
UPDATE user_gamification_stats
SET
    total_points = total_points + 180,
    problems_solved = problems_solved + 3,
    level = GREATEST(level, 3),
    last_submission_date = CURRENT_DATE
WHERE user_id = (SELECT id FROM users WHERE email LIKE '%student%' LIMIT 1);

-- Notifications
INSERT INTO notifications (user_id, title, body, is_read, created_at)
SELECT
    (SELECT id FROM users WHERE email LIKE '%student%' LIMIT 1),
    'Assignment Graded',
    'Your Algorithm Analysis & Implementation Project has been graded: 92/100',
    false,
    NOW() - INTERVAL '1 day'
WHERE EXISTS (SELECT 1 FROM users WHERE email LIKE '%student%');

INSERT INTO notifications (user_id, title, body, is_read, created_at)
SELECT
    (SELECT id FROM users WHERE email LIKE '%student%' LIMIT 1),
    'Assignment Graded',
    'Your Data Structures Implementation has been graded: 88/100',
    false,
    NOW() - INTERVAL '12 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email LIKE '%student%');

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check assignments created
-- SELECT title, max_score, total_points, is_graded, assignment_type FROM assignments
-- WHERE course_offering_id = (SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = 'CSE304' LIMIT 1);

-- Check component submissions
-- SELECT COUNT(*) FROM assignment_component_submissions;

-- Check component grades
-- SELECT COUNT(*) FROM component_grades;

-- Check assignment submissions
-- SELECT a.title, COUNT(asub.id) as submissions, AVG(asub.final_score) as avg_score
-- FROM assignments a
-- LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
-- WHERE a.course_offering_id = (SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = 'CSE304' LIMIT 1)
-- GROUP BY a.id, a.title;