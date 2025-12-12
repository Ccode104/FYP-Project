# Submission Schema Refactor Design

## Current Issues
The `assignment_submissions` table contains redundant columns that are only used for specific assignment types:
- GitHub-related columns (repo_url, repo_name, etc.) only used for GitHub assignments
- `zip_file_url` and `submission_type` used inconsistently across types
- Mixed assignments store both file and GitHub data in the same table

## Proposed New Schema

### Base Table: assignment_submissions
Keep only common fields:
- id (BIGSERIAL PRIMARY KEY)
- assignment_id (BIGINT REFERENCES assignments(id) ON DELETE CASCADE)
- student_id (BIGINT REFERENCES users(id) ON DELETE CASCADE)
- submitted_at (TIMESTAMPTZ DEFAULT now())
- status (TEXT DEFAULT 'submitted')
- final_score (NUMERIC(6,2))
- grader_id (BIGINT REFERENCES users(id))
- graded_at (TIMESTAMPTZ)
- comments (TEXT)
- attempt (INT DEFAULT 1)
- UNIQUE(assignment_id, student_id, attempt)

### Type-Specific Tables

#### file_submissions
For file-based assignments (including link submissions):
```sql
CREATE TABLE file_submissions (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  zip_file_url TEXT,  -- For mixed assignments that include files
  submission_type TEXT DEFAULT 'file',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### github_submissions
For GitHub repository assignments:
```sql
CREATE TABLE github_submissions (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  repo_url TEXT NOT NULL,
  repo_name TEXT,
  repo_description TEXT,
  repo_language TEXT,
  repo_private BOOLEAN,
  repo_stars INTEGER,
  repo_forks INTEGER,
  repo_created_at TIMESTAMPTZ,
  repo_updated_at TIMESTAMPTZ,
  repo_default_branch TEXT,
  repo_size_kb INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### mixed_submissions
For mixed assignments (files + GitHub):
```sql
CREATE TABLE mixed_submissions (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  zip_file_url TEXT,  -- For file component
  repo_url TEXT,      -- For GitHub component
  repo_name TEXT,
  repo_description TEXT,
  repo_language TEXT,
  repo_private BOOLEAN,
  repo_stars INTEGER,
  repo_forks INTEGER,
  repo_created_at TIMESTAMPTZ,
  repo_updated_at TIMESTAMPTZ,
  repo_default_branch TEXT,
  repo_size_kb INTEGER,
  submission_type TEXT DEFAULT 'mixed',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Migration Strategy

1. Create new tables
2. Migrate existing data:
   - For submissions with github_repo_url: insert into github_submissions
   - For submissions with zip_file_url but no github: insert into file_submissions
   - For submissions with both: insert into mixed_submissions
3. Remove redundant columns from assignment_submissions
4. Update controllers to use new tables

## Controller Updates Required

- `submitFileAssignment`: Insert into file_submissions instead of updating assignment_submissions
- `submitGitHubRepoAssignment`: Insert into github_submissions instead of assignment_submissions
- `submitLinkAssignment`: Insert into file_submissions
- `getSubmissionById`: Query appropriate type-specific table based on assignment_type
- Handle mixed assignments in both file and GitHub submission functions

## Benefits

- Eliminates redundant columns in base table
- Cleaner separation of concerns
- Easier maintenance and extension
- Better data integrity
- More efficient queries (no NULL columns for unused fields)