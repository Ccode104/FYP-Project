-- Migration: Add assignment comments system
-- Allows students to ask questions and teachers/TAs to reply

CREATE TABLE IF NOT EXISTS assignment_comments (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_id BIGINT, -- For threaded replies, null for top-level comments
    content TEXT NOT NULL,
    is_instructor_reply BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES assignment_comments(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignment_comments_assignment ON assignment_comments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_comments_user ON assignment_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_comments_parent ON assignment_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_assignment_comments_created ON assignment_comments(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE assignment_comments IS 'Comments and questions on assignments with threaded replies';
COMMENT ON COLUMN assignment_comments.parent_id IS 'References parent comment for threaded conversations';
COMMENT ON COLUMN assignment_comments.is_instructor_reply IS 'True if comment is from teacher/TA, false for student questions';

COMMIT;