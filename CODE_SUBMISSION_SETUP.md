# Code Submission Assignment Feature - Setup Guide

## Database Migration

Your database schema needs to be extended to support the code question bank feature. Run the following migration:

```bash
psql "$DATABASE_URL" -f backend/prisma/migrations/add_code_questions_tables.sql
```

Or manually execute the SQL in `backend/prisma/migrations/add_code_questions_tables.sql`

## New Tables Added

1. **code_questions** - Question bank for reusable code questions
2. **code_question_testcases** - Test cases for each question (supports sample and hidden test cases)
3. **assignment_questions** - Maps questions to assignments (many-to-many relationship)
4. **code_submission_results** - Detailed per-testcase execution results (optional, complements JSONB in code_submissions)

## Environment Variables

Add these to your `.env` file for Judge0 integration:

```env
# Judge0 API Configuration (optional - uses public API if not set)
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key_here
```

If you don't set these, the system will attempt to use the public Judge0 API (may have rate limits).

## Installation

1. **Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

## API Endpoints

### Code Questions
- `POST /api/code-questions` - Create a code question
- `GET /api/code-questions` - List all code questions
- `GET /api/code-questions/:id` - Get a specific question
- `PUT /api/code-questions/:id` - Update a question
- `DELETE /api/code-questions/:id` - Delete a question
- `GET /api/courses/:offeringId/code-questions` - Get questions for a course offering

### Assignments
- `POST /api/assignments` - Create assignment (supports `question_ids` array for code assignments)
- `GET /api/assignments/:id/questions` - Get questions for an assignment

### Code Execution
- `POST /api/judge` - Execute code using Judge0

### Submissions
- `POST /api/submissions/submit/code` - Submit code (supports `question_id` parameter)

## Usage Flow

### For Teachers:

1. **Create Code Questions:**
   - Use `CodeQuestionCreator` component
   - Add question title, description, constraints
   - Add test cases (mark as sample or hidden)
   - Test cases can be text or file-based

2. **Create Code Assignment:**
   - Use `CodeAssignmentCreator` component
   - Select multiple questions from the question bank
   - Set assignment details (title, dates, max score)
   - Questions are automatically linked to the assignment

### For Students:

1. **View Assignment:**
   - Use `CodeAssignmentViewer` component
   - See all questions in the assignment
   - View question descriptions, constraints, and sample test cases

2. **Write and Test Code:**
   - Write code in the editor
   - Select programming language
   - Click "Run Code" to test against sample test cases
   - See execution results immediately

3. **Submit Code:**
   - Click "Submit" to submit code for grading
   - Code is automatically tested against hidden test cases
   - Results are stored in the database

## Integration with Existing Components

To integrate these components into your existing course management pages:

```tsx
// Example: Add to teacher dashboard
import CodeQuestionCreator from './components/CodeQuestionCreator'
import CodeAssignmentCreator from './components/CodeAssignmentCreator'

// In your component:
<CodeQuestionCreator 
  courseOfferingId={courseId} 
  onComplete={() => {/* refresh questions list */}} 
/>

<CodeAssignmentCreator 
  courseOfferingId={courseId} 
  onComplete={() => {/* refresh assignments list */}} 
/>
```

```tsx
// Example: Add to student assignment view
import CodeAssignmentViewer from './components/CodeAssignmentViewer'

// In your component:
<CodeAssignmentViewer 
  assignmentId={assignment.id} 
  onComplete={() => {/* navigate back or refresh */}} 
/>
```

## Database Schema Compatibility

The migration adds new tables that work alongside your existing schema:
- `assignment_testcases` (your existing table) - can still be used for assignment-level test cases
- `code_questions` + `code_question_testcases` (new) - for question bank with per-question test cases
- `assignment_questions` (new) - links questions to assignments

Both approaches can coexist if needed, but the new question bank approach is recommended for the described workflow.

## Testing

1. Create a code question with test cases
2. Create an assignment with multiple questions
3. As a student, view the assignment and submit code
4. Verify test case execution and results

## Troubleshooting

- **Judge0 API errors**: Check your API key and URL configuration
- **Test case matching**: Ensure expected output matches exactly (whitespace matters)
- **File uploads**: Ensure S3 configuration is set up for file-based test cases
- **Database errors**: Verify migration ran successfully and all tables exist

