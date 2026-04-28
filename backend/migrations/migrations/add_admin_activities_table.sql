-- Add admin activities table for logging admin actions
CREATE TABLE IF NOT EXISTS admin_activities (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- e.g., 'create_user', 'update_user', 'delete_user', etc.
    entity_type TEXT NOT NULL, -- e.g., 'user', 'course', 'department'
    entity_id BIGINT, -- ID of the affected entity
    entity_name TEXT, -- Human-readable name of the entity
    details JSONB DEFAULT '{}', -- Additional details about the action
    undo_data JSONB, -- Data needed to undo the action
    undoable BOOLEAN DEFAULT false, -- Whether this action can be undone
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_id ON admin_activities(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activities_action ON admin_activities(action);
CREATE INDEX IF NOT EXISTS idx_admin_activities_entity_type ON admin_activities(entity_type);
CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON admin_activities(created_at DESC);