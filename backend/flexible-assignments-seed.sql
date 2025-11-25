-- Flexible Assignments Seed Data for CSE304
-- Demonstrates complex, mixed-type assignments using the new JSONB configuration

-- First ensure CSE304 course and offering exist
INSERT INTO courses (code, title, description, department_id, credits) VALUES
('CSE304', 'Computer Programming Course', 'Advanced programming concepts with mixed assessment types', 1, 4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO course_offerings (course_id, term, section, faculty_id, max_capacity, start_date, end_date) VALUES
((SELECT id FROM courses WHERE code = 'CSE304' LIMIT 1), 'Fall 2024', 'A', 33, 50, '2024-08-15', '2024-12-15')
ON CONFLICT (course_id, term, section) DO NOTHING;

-- 1. COMPLEX MIXED ASSIGNMENT: Code + Report + Presentation
INSERT INTO assignments (
    course_offering_id, title, description,
    assignment_config, submission_requirements, grading_config,
    total_points, allow_multiple_submissions, is_graded, created_by, created_at
) VALUES (
    (SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = 'CSE304' LIMIT 1),
    'Algorithm Analysis & Implementation Project',
    'Complete project combining coding, analysis, and presentation skills',

    -- Assignment Configuration (Complex mixed assignment)
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

    -- Submission Requirements
    '[
        {
            "component_id": "code_implementation",
            "submission_type": "file_upload",
            "accepted_formats": [".py", ".zip", ".ipynb"],
            "max_file_size_mb": 10,
            "required": true,
            "allow_multiple_files": true
        },
        {
            "component_id": "analysis_report",
            "submission_type": "file_upload",
            "accepted_formats": [".pdf", ".docx"],
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

    -- Grading Configuration
    '{
        "grading_type": "component_based",
        "use_rubric": true,
        "rubric_id": "project_rubric",
        "allow_partial_credit": true,
        "grade_visibility": "after_due_date",
        "peer_review_weight": 0.2,
        "auto_grading_weight": 0.3
    }',

    100, false, true, 33, NOW() - INTERVAL '14 days'
);

-- 2. SMALL CODE ASSIGNMENT: Simple coding exercise
INSERT INTO assignments (
    course_offering_id, title, description,
    assignment_config, submission_requirements, grading_config,
    total_points, allow_multiple_submissions, is_graded, created_by, created_at
) VALUES (
    (SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = 'CSE304' LIMIT 1),
    'Data Structures Implementation',
    'Implement basic data structures with unit tests',

    -- Simple code assignment config
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
            "accepted_formats": [".py"],
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
    }',

    100, true, true, 33, NOW() - INTERVAL '7 days'
);

-- 3. HANDWRITTEN + REPORT ASSIGNMENT: Mixed document types
INSERT INTO assignments (
    course_offering_id, title, description,
    assignment_config, submission_requirements, grading_config,
    total_points, allow_multiple_submissions, is_graded, created_by, created_at
) VALUES (
    (SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = 'CSE304' LIMIT 1),
    'Algorithm Design Manual',
    'Design algorithms manually and document the process',

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
            "accepted_formats": [".jpg", ".png", ".pdf"],
            "max_file_size_mb": 5,
            "required": true,
            "description": "Scan or photo of handwritten work"
        },
        {
            "component_id": "design_report",
            "submission_type": "file_upload",
            "accepted_formats": [".pdf", ".docx"],
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
    }',

    100, false, true, 33, NOW() - INTERVAL '10 days'
);

-- 4. UNGRADED HOMEWORK: Practice assignment
INSERT INTO assignments (
    course_offering_id, title, description,
    assignment_config, submission_requirements, grading_config,
    total_points, allow_multiple_submissions, is_graded, created_by, created_at
) VALUES (
    (SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = 'CSE304' LIMIT 1),
    'Practice: Basic Programming Exercises',
    'Optional practice exercises to reinforce basic concepts',

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
            "accepted_formats": [".py", ".java", ".cpp", ".zip"],
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
    }',

    0, true, false, 33, NOW() - INTERVAL '3 days'
);

-- Create sample submissions for DummyStudent (ID: 38)
-- First, get assignment IDs
DO $$
DECLARE
    project_assignment_id BIGINT;
    code_assignment_id BIGINT;
    design_assignment_id BIGINT;
BEGIN
    -- Get assignment IDs
    SELECT id INTO project_assignment_id FROM assignments WHERE title = 'Algorithm Analysis & Implementation Project' LIMIT 1;
    SELECT id INTO code_assignment_id FROM assignments WHERE title = 'Data Structures Implementation' LIMIT 1;
    SELECT id INTO design_assignment_id FROM assignments WHERE title = 'Algorithm Design Manual' LIMIT 1;

    -- Create main submissions
    INSERT INTO assignment_submissions (assignment_id, student_id, submitted_at, status, final_score, grader_id, graded_at, comments, attempt)
    VALUES (project_assignment_id, 38, NOW() - INTERVAL '2 days', 'graded', 92, 33, NOW() - INTERVAL '1 day', 'Excellent comprehensive project with strong analysis and presentation.', 1);

    INSERT INTO assignment_submissions (assignment_id, student_id, submitted_at, status, final_score, grader_id, graded_at, comments, attempt)
    VALUES (code_assignment_id, 38, NOW() - INTERVAL '1 day', 'graded', 88, 53, NOW() - INTERVAL '12 hours', 'Good implementation with minor issues in edge case handling.', 1);

    -- Create component submissions for the complex project
    INSERT INTO assignment_component_submissions (assignment_submission_id, component_id, submission_type, file_path, metadata, submitted_at)
    VALUES
    (
        (SELECT id FROM assignment_submissions WHERE assignment_id = project_assignment_id AND student_id = 38 LIMIT 1),
        'code_implementation',
        'file',
        '/submissions/CSE304/project1/algorithms.zip',
        '{"language": "python", "files": ["sorting.py", "searching.py", "test_cases.py"], "lines_of_code": 245}',
        NOW() - INTERVAL '2 days'
    ),
    (
        (SELECT id FROM assignment_submissions WHERE assignment_id = project_assignment_id AND student_id = 38 LIMIT 1),
        'analysis_report',
        'file',
        '/submissions/CSE304/project1/analysis.pdf',
        '{"format": "pdf", "pages": 4, "word_count": 1250}',
        NOW() - INTERVAL '2 days'
    ),
    (
        (SELECT id FROM assignment_submissions WHERE assignment_id = project_assignment_id AND student_id = 38 LIMIT 1),
        'presentation_demo',
        'link',
        'https://docs.google.com/presentation/d/project-presentation-link',
        '{"platform": "Google Slides", "slides": 12}',
        NOW() - INTERVAL '2 days'
    );

    -- Create component grades
    INSERT INTO component_grades (assignment_submission_id, component_id, score, feedback, graded_by, graded_at)
    VALUES
    (
        (SELECT id FROM assignment_submissions WHERE assignment_id = project_assignment_id AND student_id = 38 LIMIT 1),
        'code_implementation',
        38,
        'Excellent algorithm implementations with good test coverage.',
        33,
        NOW() - INTERVAL '1 day'
    ),
    (
        (SELECT id FROM assignment_submissions WHERE assignment_id = project_assignment_id AND student_id = 38 LIMIT 1),
        'analysis_report',
        28,
        'Strong analysis of time complexity with good examples.',
        33,
        NOW() - INTERVAL '1 day'
    ),
    (
        (SELECT id FROM assignment_submissions WHERE assignment_id = project_assignment_id AND student_id = 38 LIMIT 1),
        'presentation_demo',
        26,
        'Clear presentation with good visual aids.',
        33,
        NOW() - INTERVAL '1 day'
    );

END $$;

-- Add some achievements/badges for the complex assignments
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES
(38, (SELECT id FROM achievements WHERE name = 'First Project Completed' LIMIT 1), NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Update gamification stats for DummyStudent
UPDATE user_gamification_stats SET
    total_points = total_points + 180,
    problems_solved = problems_solved + 3,
    level = GREATEST(level, 3),
    last_submission_date = CURRENT_DATE
WHERE user_id = 38;

-- Add notifications for graded assignments
INSERT INTO notifications (user_id, title, body, is_read, created_at) VALUES
(38, 'Assignment Graded', 'Your Algorithm Analysis & Implementation Project has been graded: 92/100', false, NOW() - INTERVAL '1 day'),
(38, 'Assignment Graded', 'Your Data Structures Implementation has been graded: 88/100', false, NOW() - INTERVAL '12 hours');

COMMIT;