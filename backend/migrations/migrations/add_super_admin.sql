-- Add super admin user: admin@gmail.com with id 44
-- This will be the only super admin who can create other admins

-- Insert the super admin user if it doesn't exist
INSERT INTO users (id, email, name, role, password_hash, is_active, created_at, updated_at)
VALUES (44, 'admin@gmail.com', 'Super Admin', 'admin', '$2b$10$dummy.hash.for.demo', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Set as super admin
INSERT INTO admins (user_id, is_super, created_at, created_by)
VALUES (44, true, NOW(), 44)
ON CONFLICT (user_id) DO UPDATE SET
  is_super = true;

-- Ensure no other admins are super admins (except this one)
UPDATE admins SET is_super = false WHERE user_id != 44;