-- Add grading system tables for TA Assignment Grading

-- Table to assign TAs to specific assignments and students
CREATE TABLE IF NOT EXISTS grading_tasks (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ta_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
    UNIQUE(assignment_id, student_id, ta_id)
);

-- Table for regrade requests on rubric items
CREATE TABLE IF NOT EXISTS regrade_requests (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    criterion_id BIGINT REFERENCES rubric_criteria(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'resolved')),
    requested_by BIGINT NOT NULL REFERENCES users(id),
    requested_at TIMESTAMPTZ DEFAULT now(),
    responded_by BIGINT REFERENCES users(id),
    responded_at TIMESTAMPTZ,
    response_message TEXT,
    UNIQUE(submission_id, criterion_id, requested_by)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_grading_tasks_assignment_student ON grading_tasks(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_grading_tasks_ta ON grading_tasks(ta_id);
CREATE INDEX IF NOT EXISTS idx_grading_tasks_status ON grading_tasks(status);
CREATE INDEX IF NOT EXISTS idx_regrade_requests_submission ON regrade_requests(submission_id);
CREATE INDEX IF NOT EXISTS idx_regrade_requests_status ON regrade_requests(status);
CREATE INDEX IF NOT EXISTS idx_regrade_requests_requested_by ON regrade_requests(requested_by);

COMMIT;