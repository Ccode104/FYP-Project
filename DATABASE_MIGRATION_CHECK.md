# Database Migration Check - What You Need to Add

## Comparison: Your Schema vs Required Schema

### ✅ Tables You Already Have (No Changes Needed)
- `users` - ✓
- `assignments` - ✓
- `assignment_submissions` - ✓
- `code_submissions` - ✓ (but needs one column added)
- `code_submission_results` - ✓ (but may need column adjustment)

### ❌ Tables You Need to ADD

Based on your provided schema, you need to add these **4 new tables**:

#### 1. `code_questions` - Question Bank
```sql
CREATE TABLE code_questions (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  constraints TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. `code_question_testcases` - Test Cases for Questions
```sql
CREATE TABLE code_question_testcases (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES code_questions(id) ON DELETE CASCADE,
  is_sample BOOLEAN DEFAULT false,
  input_path TEXT,
  expected_path TEXT,
  input_text TEXT,
  expected_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. `assignment_questions` - Maps Questions to Assignments
```sql
CREATE TABLE assignment_questions (
  id BIGSERIAL PRIMARY KEY,
  assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES code_questions(id) ON DELETE CASCADE,
  points NUMERIC(6,2) DEFAULT 0,
  position INT,
  UNIQUE(assignment_id, question_id)
);
```

#### 4. `code_submission_results` - You have this, but check the columns

Your existing table:
```sql
CREATE TABLE code_submission_results (
  id BIGSERIAL PRIMARY KEY,
  code_submission_id BIGINT NOT NULL REFERENCES code_submissions(id) ON DELETE CASCADE,
  testcase_id BIGINT REFERENCES assignment_testcases(id),  -- ⚠️ This references assignment_testcases
  passed BOOLEAN,
  student_output TEXT,
  error_output TEXT,
  execution_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Issue**: Your `testcase_id` references `assignment_testcases`, but the implementation uses `code_question_testcases`.

**Solution Options:**
- **Option A**: Keep both tables and update the code to use `assignment_testcases` when available
- **Option B**: Change `testcase_id` to reference `code_question_testcases` (recommended)
- **Option C**: Make `testcase_id` nullable and support both

### ⚠️ Column You Need to ADD

#### Add to `code_submissions` table:
```sql
ALTER TABLE code_submissions
  ADD COLUMN IF NOT EXISTS assignment_question_id BIGINT REFERENCES assignment_questions(id);
```

This links each code submission to a specific question in the assignment.

## Complete Migration Script

Run this migration to add everything needed:

```sql
-- 1. Code questions bank
CREATE TABLE IF NOT EXISTS code_questions (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  constraints TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Test cases for questions
CREATE TABLE IF NOT EXISTS code_question_testcases (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES code_questions(id) ON DELETE CASCADE,
  is_sample BOOLEAN DEFAULT false,
  input_path TEXT,
  expected_path TEXT,
  input_text TEXT,
  expected_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Map questions to assignments
CREATE TABLE IF NOT EXISTS assignment_questions (
  id BIGSERIAL PRIMARY KEY,
  assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES code_questions(id) ON DELETE CASCADE,
  points NUMERIC(6,2) DEFAULT 0,
  position INT,
  UNIQUE(assignment_id, question_id)
);

-- 4. Add column to code_submissions
ALTER TABLE code_submissions
  ADD COLUMN IF NOT EXISTS assignment_question_id BIGINT REFERENCES assignment_questions(id);

-- 5. Update code_submission_results to support code_question_testcases
-- Option: Add a new column or modify existing
ALTER TABLE code_submission_results
  ADD COLUMN IF NOT EXISTS code_testcase_id BIGINT REFERENCES code_question_testcases(id);

-- Or if you want to replace the existing testcase_id reference:
-- ALTER TABLE code_submission_results
--   DROP CONSTRAINT IF EXISTS code_submission_results_testcase_id_fkey;
-- ALTER TABLE code_submission_results
--   ALTER COLUMN testcase_id TYPE BIGINT,
--   ADD CONSTRAINT code_submission_results_testcase_id_fkey 
--     FOREIGN KEY (testcase_id) REFERENCES code_question_testcases(id);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_code_questions_created_by ON code_questions(created_by);
CREATE INDEX IF NOT EXISTS idx_code_question_testcases_question_id ON code_question_testcases(question_id);
CREATE INDEX IF NOT EXISTS idx_code_question_testcases_is_sample ON code_question_testcases(is_sample);
CREATE INDEX IF NOT EXISTS idx_assignment_questions_assignment_id ON assignment_questions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_questions_question_id ON assignment_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_assignment_question_id ON code_submissions(assignment_question_id);
CREATE INDEX IF NOT EXISTS idx_code_submission_results_code_testcase_id ON code_submission_results(code_testcase_id);
```

## Quick Check Query

Run this to see what you're missing:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'code_questions', 
    'code_question_testcases', 
    'assignment_questions'
  );

-- Check if column exists in code_submissions
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'code_submissions' 
  AND column_name = 'assignment_question_id';

-- Check code_submission_results structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'code_submission_results';
```

## Summary

**You need to add:**
1. ✅ `code_questions` table
2. ✅ `code_question_testcases` table
3. ✅ `assignment_questions` table
4. ✅ `assignment_question_id` column to `code_submissions`
5. ⚠️ Update `code_submission_results.testcase_id` to reference `code_question_testcases` (or add new column)

**You already have:**
- ✅ `code_submissions` table
- ✅ `code_submission_results` table (structure is compatible)

The migration file `backend/prisma/migrations/add_code_questions_tables.sql` contains all the necessary SQL. Just run it!

