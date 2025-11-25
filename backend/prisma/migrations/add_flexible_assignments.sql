-- Migration: Add flexible assignment system with JSONB configuration
-- This enables complex, mixed-type assignments with component-based structure

-- Add new JSONB columns to assignments table for flexible configuration
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assignment_config JSONB DEFAULT '{}';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS submission_requirements JSONB DEFAULT '[]';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS grading_config JSONB DEFAULT '{}';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_graded BOOLEAN DEFAULT true;

-- Create component-based submission table
CREATE TABLE IF NOT EXISTS assignment_component_submissions (
    id BIGSERIAL PRIMARY KEY,
    assignment_submission_id BIGINT NOT NULL,
    component_id TEXT NOT NULL,
    submission_type TEXT NOT NULL CHECK (submission_type IN ('file', 'text', 'link', 'code')),
    content TEXT, -- For text/link submissions
    file_path TEXT, -- For file submissions
    metadata JSONB DEFAULT '{}', -- Language, size, execution results, etc.
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (assignment_submission_id) REFERENCES assignment_submissions(id) ON DELETE CASCADE
);

-- Create component-specific grading table
CREATE TABLE IF NOT EXISTS component_grades (
    id BIGSERIAL PRIMARY KEY,
    assignment_submission_id BIGINT NOT NULL,
    component_id TEXT NOT NULL,
    score DECIMAL(6,2),
    feedback TEXT,
    graded_by BIGINT,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (assignment_submission_id) REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignment_component_submissions_assignment ON assignment_component_submissions(assignment_submission_id);
CREATE INDEX IF NOT EXISTS idx_assignment_component_submissions_component ON assignment_component_submissions(component_id);
CREATE INDEX IF NOT EXISTS idx_component_grades_assignment ON component_grades(assignment_submission_id);
CREATE INDEX IF NOT EXISTS idx_component_grades_component ON component_grades(component_id);

-- Migrate existing assignments to new format
-- Convert simple assignment_type to component-based config
UPDATE assignments SET
    assignment_config = jsonb_build_object(
        'assignment_type', 'simple',
        'components', jsonb_build_array(
            jsonb_build_object(
                'id', 'main_component',
                'type', CASE
                    WHEN assignment_type = 'homework' THEN 'document'
                    WHEN assignment_type = 'project' THEN 'code'
                    WHEN assignment_type = 'exam' THEN 'assessment'
                    ELSE 'other'
                END,
                'subtype', assignment_type,
                'title', title,
                'description', description,
                'points', max_score
            )
        ),
        'settings', jsonb_build_object(
            'allow_group_work', false,
            'peer_review_required', false,
            'auto_grading_enabled', false,
            'plagiarism_check', true
        )
    ),
    submission_requirements = jsonb_build_array(
        jsonb_build_object(
            'component_id', 'main_component',
            'submission_type', CASE
                WHEN assignment_type IN ('homework', 'project') THEN 'file_upload'
                ELSE 'text'
            END,
            'accepted_formats', CASE
                WHEN assignment_type = 'project' THEN jsonb_build_array('.py', '.java', '.cpp', '.zip')
                WHEN assignment_type = 'homework' THEN jsonb_build_array('.pdf', '.docx', '.txt')
                ELSE jsonb_build_array('*')
            END,
            'max_file_size_mb', 10,
            'required', true
        )
    ),
    grading_config = jsonb_build_object(
        'grading_type', 'simple',
        'use_rubric', false,
        'allow_partial_credit', true,
        'grade_visibility', 'after_due_date'
    )
WHERE assignment_config = '{}' OR assignment_config IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN assignments.assignment_config IS 'JSON configuration defining assignment structure, components, and workflow';
COMMENT ON COLUMN assignments.submission_requirements IS 'JSON array defining what students need to submit for each component';
COMMENT ON COLUMN assignments.grading_config IS 'JSON configuration for grading rules and rubrics';
COMMENT ON COLUMN assignments.is_graded IS 'Whether this assignment should be graded (false for practice assignments)';
COMMENT ON TABLE assignment_component_submissions IS 'Individual component submissions within assignment submissions';
COMMENT ON TABLE component_grades IS 'Grades for individual assignment components';