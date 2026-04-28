-- Migration: Add template_code and driver_code fields to code_questions table
-- This migration adds support for language-specific template code and driver code
-- for code assignment questions

ALTER TABLE code_questions
ADD COLUMN IF NOT EXISTS template_code JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS driver_code JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN code_questions.template_code IS 'Language-specific template code as JSON object (e.g., {"python": "def solution():", "java": "public class Solution {"})';
COMMENT ON COLUMN code_questions.driver_code IS 'Language-specific driver code as JSON object, prepended to user code during execution';