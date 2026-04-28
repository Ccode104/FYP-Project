-- Migration: Make password_hash nullable to support OAuth users (Google, etc.)
-- OAuth users don't have passwords, so password_hash should be NULL for them

-- First, check if there's a NOT NULL constraint and drop it
DO $$
BEGIN
  -- Drop NOT NULL constraint if it exists
  ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Constraint might not exist, which is fine
    RAISE NOTICE 'password_hash column may already be nullable or constraint does not exist';
END $$;

-- Verify the change
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'password_hash' 
    AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'Failed to make password_hash nullable';
  ELSE
    RAISE NOTICE 'password_hash is now nullable - OAuth users can be created without passwords';
  END IF;
END $$;

