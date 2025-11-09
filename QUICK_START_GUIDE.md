# Quick Start Guide - Code Submission Assignment Feature

## ✅ Setup Complete!

Your environment is now configured:
- ✅ Database tables created
- ✅ Judge0 API configured
- ✅ Backend routes registered
- ✅ Frontend components ready

## 🚀 Start Your Application

### 1. Start Backend Server
```bash
cd backend
npm start
```
The server should start on `http://localhost:4000` (or your configured port)

### 2. Start Frontend Server
```bash
cd frontend
npm run dev
```
The frontend should start on `http://localhost:5173` (or your configured port)

## 🧪 Quick Test - Verify Judge0 Integration

Test the Judge0 API directly:

```bash
# Using curl
curl -X POST http://localhost:4000/api/judge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "source_code": "print(\"Hello World\")",
    "language": "python",
    "stdin": ""
  }'
```

Expected response:
```json
{
  "stdout": "Hello World\n",
  "stderr": "",
  "compile_output": "",
  "status": { "id": 3, "description": "Accepted" },
  "passed": null,
  "time": "0.001",
  "memory": 1234
}
```

## 📝 Complete Workflow Test

### As a Teacher:

1. **Create a Code Question:**
   - Navigate to your course management page
   - Use the `CodeQuestionCreator` component
   - Add:
     - Title: "Find Maximum Element"
     - Description: "Write a function to find the maximum element in an array"
     - Constraints: "1 ≤ n ≤ 1000"
     - Sample Test Case:
       - Input: `5\n1 2 3 4 5`
       - Expected Output: `5`
     - Hidden Test Case:
       - Input: `3\n10 20 30`
       - Expected Output: `30`

2. **Create a Code Assignment:**
   - Use the `CodeAssignmentCreator` component
   - Select the question you just created
   - Set assignment details (title, dates, max score)
   - Create the assignment

### As a Student:

1. **View Assignment:**
   - Navigate to the course
   - Find the code assignment
   - Click to view it

2. **Write and Test Code:**
   - See the question description and sample test case
   - Write code in the editor (e.g., Python):
     ```python
     n = int(input())
     arr = list(map(int, input().split()))
     print(max(arr))
     ```
   - Click "Run Code" to test against sample test case
   - Verify output matches expected

3. **Submit Code:**
   - Click "Submit" button
   - Code will be automatically tested against hidden test cases
   - View results

## 🔍 Verify Everything Works

### Check Backend Endpoints:

1. **Health Check:**
   ```
   GET http://localhost:4000/health
   ```
   Should return: `{"ok": true}`

2. **List Code Questions:**
   ```
   GET http://localhost:4000/api/code-questions
   Authorization: Bearer YOUR_TOKEN
   ```

3. **Create Code Question:**
   ```
   POST http://localhost:4000/api/code-questions
   Authorization: Bearer YOUR_TOKEN
   Content-Type: application/json
   
   {
     "title": "Test Question",
     "description": "Test description",
     "test_cases": [...]
   }
   ```

### Check Frontend:

1. Verify components are imported correctly
2. Check browser console for any errors
3. Test the UI flow end-to-end

## 🐛 Troubleshooting

### Judge0 API Issues:
- **Error: "Failed to execute code"**
  - Check your `.env` file has the correct API key
  - Verify the API key is active on RapidAPI
  - Check backend logs for detailed error messages

- **Error: "Rate limit exceeded"**
  - You may have hit the free tier limit
  - Wait a few minutes or upgrade your RapidAPI plan

### Database Issues:
- **Error: "relation does not exist"**
  - Verify you ran the migration SQL script
  - Check that all tables were created successfully

### Frontend Issues:
- **Components not showing:**
  - Verify components are imported
  - Check for TypeScript/compilation errors
  - Check browser console for errors

## 📚 Next Steps

1. **Customize the UI:**
   - Add syntax highlighting to code editor
   - Improve styling of components
   - Add loading states

2. **Enhance Features:**
   - Support multiple test cases per question
   - Add code submission history
   - Implement auto-grading with scores
   - Add code review features

3. **Production Deployment:**
   - Set up environment variables on your server
   - Configure CORS properly
   - Set up error monitoring
   - Add rate limiting

## 🎉 You're All Set!

Your Code Submission Assignment feature is ready to use. Teachers can create questions and assignments, and students can submit code that is automatically tested!

