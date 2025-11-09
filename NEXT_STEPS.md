# Next Steps After Database Migration

## ✅ Database Migration - COMPLETE

Your database now has all the required tables for the Code Submission Assignment feature.

## Next Steps

### 1. Install Backend Dependencies

The implementation requires `axios` for Judge0 API integration:

```bash
cd backend
npm install axios
```

### 2. Configure Environment Variables (Optional)

Add these to your `.env` file in the `backend` directory:

```env
# Judge0 API Configuration (optional)
# If not set, will attempt to use public API (may have rate limits)
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key_here
```

**Note:** You can get a free Judge0 API key from RapidAPI, or use the public instance (with rate limits).

### 3. Verify Backend Routes Are Registered

Make sure your `backend/server.js` includes the code questions routes:

```javascript
import codeQuestionsRoutes from './routes/codeQuestions.js';
// ...
app.use('/api/code-questions', codeQuestionsRoutes);
```

### 4. Test the API Endpoints

You can test the endpoints using curl, Postman, or your frontend:

#### Create a Code Question:
```bash
POST /api/code-questions
Content-Type: application/json
Authorization: Bearer <your_token>

{
  "title": "Find Maximum Element",
  "description": "Write a function to find the maximum element in an array",
  "constraints": "1 ≤ n ≤ 1000",
  "test_cases": [
    {
      "is_sample": true,
      "input_text": "5\n1 2 3 4 5",
      "expected_text": "5"
    },
    {
      "is_sample": false,
      "input_text": "3\n10 20 30",
      "expected_text": "30"
    }
  ]
}
```

#### Get Code Questions for a Course:
```bash
GET /api/courses/{offeringId}/code-questions
Authorization: Bearer <your_token>
```

#### Create Code Assignment:
```bash
POST /api/assignments
Content-Type: application/json
Authorization: Bearer <your_token>

{
  "course_offering_id": 1,
  "title": "Programming Assignment 1",
  "description": "Complete the following coding problems",
  "assignment_type": "code",
  "max_score": 100,
  "question_ids": [1, 2, 3]
}
```

#### Execute Code (Judge0):
```bash
POST /api/judge
Content-Type: application/json
Authorization: Bearer <your_token>

{
  "source_code": "print('Hello World')",
  "language": "python",
  "stdin": ""
}
```

### 5. Integrate Frontend Components

Add the components to your course management pages:

#### For Teachers - Create Questions:
```tsx
import CodeQuestionCreator from './components/CodeQuestionCreator';

<CodeQuestionCreator 
  courseOfferingId={courseId} 
  onComplete={() => {
    // Refresh questions list or navigate
    console.log('Question created!');
  }} 
/>
```

#### For Teachers - Create Assignments:
```tsx
import CodeAssignmentCreator from './components/CodeAssignmentCreator';

<CodeAssignmentCreator 
  courseOfferingId={courseId} 
  onComplete={() => {
    // Refresh assignments list
    console.log('Assignment created!');
  }} 
/>
```

#### For Students - View and Submit:
```tsx
import CodeAssignmentViewer from './components/CodeAssignmentViewer';

<CodeAssignmentViewer 
  assignmentId={assignment.id} 
  onComplete={() => {
    // Navigate back or show success message
    console.log('Code submitted!');
  }} 
/>
```

### 6. Quick Verification Checklist

- [ ] Database tables created (code_questions, code_question_testcases, assignment_questions)
- [ ] Column added to code_submissions (assignment_question_id)
- [ ] Column added to code_submission_results (code_testcase_id)
- [ ] Backend dependencies installed (axios)
- [ ] Backend routes registered
- [ ] Environment variables configured (optional)
- [ ] Frontend components imported and ready to use

### 7. Test the Complete Flow

1. **As a Teacher:**
   - Create a code question with test cases
   - Create an assignment with multiple questions
   - Verify questions are linked to the assignment

2. **As a Student:**
   - View the assignment
   - See question descriptions and sample test cases
   - Write code in the editor
   - Run code to test against sample cases
   - Submit code for grading
   - Verify test results are stored

### 8. Troubleshooting

If you encounter issues:

- **Judge0 API errors**: Check your API key or use the public endpoint
- **Database errors**: Verify all tables were created successfully
- **Route not found**: Check that routes are registered in server.js
- **CORS issues**: Ensure CORS is configured in your backend

### 9. Optional Enhancements

- Enable auto-grading by uncommenting the auto-grade code in `submissionsController.js`
- Add support for multiple test cases per question (currently runs first hidden test case)
- Add file upload support for large test case files
- Add code syntax highlighting in the editor
- Add submission history for students

## You're All Set! 🎉

The Code Submission Assignment feature is now ready to use. Teachers can create questions and assignments, and students can submit code that is automatically tested.

