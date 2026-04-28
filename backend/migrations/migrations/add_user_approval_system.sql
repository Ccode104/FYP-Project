-- Add user approval system
-- Set default is_active to false for new users, but keep existing users active
-- Admins will be active by default

-- First, update existing users to be active (since they were created before this system)
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Change the default for is_active column
ALTER TABLE users ALTER COLUMN is_active SET DEFAULT false;

-- Ensure admin users are always active
UPDATE users SET is_active = true WHERE role = 'admin';