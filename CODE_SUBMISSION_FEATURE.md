# Code-Based Submission Feature for Faculty

## Overview
This feature enables faculty to create code-based assignments and allows students to submit code directly through the platform. Faculty can then view, review, and grade the submitted code.

## Components Created

### 1. **CodeEditor Component** (`frontend/src/components/CodeEditor.tsx`)
- Provides a code editor interface for students
- Features:
  - Language selection (Python, Java, C++, JavaScript, C)
  - Syntax-highlighted textarea with monospace font
  - Line and character count display
  - Submit button with validation

### 2. **CodeViewer Component** (`frontend/src/components/CodeViewer.tsx`)
- Displays submitted code for faculty review
- Features:
  - Read-only code display with syntax highlighting
  - Student information (name, email)
  - Submission timestamp
  - Copy code button
  - Direct grading interface with score and feedback

### 3. **CodeEditor CSS** (`frontend/src/components/CodeEditor.css`)
- Styling for both CodeEditor and CodeViewer components
- Professional code display with proper formatting
- Modal-friendly styling

## Integration Points

### Student Workflow
1. Navigate to course details page
2. View list of assignments with type indicators (code, file, etc.)
3. For code assignments:
   - Select assignment from "Code Submission" dropdown
   - Click "Open Code Editor" button
   - Write code in the editor modal
   - Select programming language
   - Submit code

### Faculty Workflow
1. Create code-based assignment using "Manage Assignment" tab
2. View submissions in "Submissions" tab
3. For code submissions:
   - Select assignment to view submissions
   - Click "View Code" button on any code submission
   - Review code in modal viewer
   - Grade directly using "Grade" button
   - Provide score (0-100) and optional feedback

## Backend Integration

### Existing Endpoints Used
- `POST /api/submissions/submit/code` - Submit code (students & faculty)
- `GET /api/submissions/:submissionId` - Get submission details with code
- `POST /api/submissions/grade` - Grade submission
- `GET /api/assignments/:id/submissions` - List all submissions for an assignment

### Database Schema
Uses existing tables:
- `assignments` - with `assignment_type` = 'code'
- `assignment_submissions` - stores submission metadata
- `code_submissions` - stores actual code and language
- `submission_grades` - stores grades and feedback

## Features

### For Students
- ✅ Clean code editor interface
- ✅ Multiple language support
- ✅ Real-time line/character count
- ✅ Assignment selection dropdown
- ✅ Success/error notifications via toast
- ✅ Modal-based editor (doesn't disrupt page flow)

### For Faculty
- ✅ View all code submissions
- ✅ Syntax-highlighted code display
- ✅ Student information display
- ✅ Copy code to clipboard
- ✅ Direct grading from viewer
- ✅ Filter submissions by assignment
- ✅ Distinguish code submissions from file submissions

## Testing Checklist

### Student Tests
- [ ] Create a code-based assignment as faculty
- [ ] Log in as student
- [ ] Navigate to course details
- [ ] Select code assignment from dropdown
- [ ] Open code editor
- [ ] Write sample code (e.g., "print('Hello World')")
- [ ] Select language (e.g., Python)
- [ ] Submit code
- [ ] Verify success notification

### Faculty Tests
- [ ] Log in as faculty
- [ ] Navigate to course details > Submissions tab
- [ ] Select code assignment from dropdown
- [ ] Verify submissions appear
- [ ] Click "View Code" button
- [ ] Verify code displays correctly
- [ ] Click "Copy Code" button
- [ ] Click "Grade" button
- [ ] Enter score and feedback
- [ ] Verify grade is saved
- [ ] Verify success notification

## Future Enhancements
- Syntax highlighting with library like Prism.js or Monaco Editor
- Code execution/testing interface
- Automated testing against test cases
- Plagiarism detection
- Code diff viewer for multiple submissions
- Download code as file
- Inline comments on code
- Side-by-side comparison of submissions

## Files Modified
1. `frontend/src/pages/student/CourseDetails.tsx` - Added code submission UI and integration
2. `backend/routes/submissions.js` - Updated to allow faculty to submit code

## Files Created
1. `frontend/src/components/CodeEditor.tsx`
2. `frontend/src/components/CodeEditor.css`
3. `frontend/src/components/CodeViewer.tsx`

## Configuration
No additional configuration required. The feature uses existing authentication and authorization mechanisms.

## Troubleshooting

### Code Editor Not Opening
- Check that a code assignment is selected from the dropdown
- Verify the assignment type is 'code' in the database
- Check browser console for errors

### Code Not Displaying
- Verify submission was successful (check database `code_submissions` table)
- Ensure faculty has access to the course offering
- Check network tab for API errors

### Grading Not Working
- Verify faculty has 'ta', 'faculty', or 'admin' role
- Check submission_id is being passed correctly
- Verify API endpoint `/api/submissions/grade` is accessible

## Notes
- Code submissions are stored as plain text in the database
- No syntax validation is performed on submission (future enhancement)
- Language selection is required but not enforced by backend validation
- Faculty can submit code for testing purposes
