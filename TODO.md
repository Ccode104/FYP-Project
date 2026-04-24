# Fix Quiz Management Buttons (Delete/View/Edit) - Progress Tracker

## Plan Status: ✅ APPROVED
Fix non-functional buttons in frontend/src/pages/teacher/QuizManagement.tsx by integrating with existing quiz-builder APIs.

### Step 1: ✅ Create this TODO.md **DONE**

### Step 2: ✅ Fix quiz data loading
### Step 2: [ ] Fix quiz data loading
- Added reloadQuizzes(), reloadKey dependency, error handling
- Change useEffect fetch from `/api/student/courses/${courseId}/quizzes` → `/api/quiz-builder/quizzes/${courseId}`
- Update Quiz interface if needed (add questions_count, etc.)

### Step 3: ✅ Implement deleteQuiz function + button handlers
- ✅ `async deleteQuiz(quizId)`: apiFetch DELETE `/api/quiz-builder/quizzes/${quizId}`
- ✅ Confirmation modal with cancel/confirm
- ✅ Attached to delete buttons (upcoming + completed sections)
- ✅ Loading state, success toast, error handling

### Step 4: [ ] Implement viewQuizDetails modal + button
- Add `async getQuizDetails(quizId)`: apiFetch GET `/api/quiz-builder/quizzes/${quizId}`
- Create ViewQuizModal component showing title, dates, questions list
- Attach onClick to view buttons

### Step 5: [ ] Implement edit functionality
- Add edit button handler: navigate(`/courses/${courseId}/quiz-builder/${quizId}`) or inline modal
- Ensure quiz-builder supports edit mode (?quizId=xxx)

### Step 6: [ ] Add loading/error states + toasts
- Show loading on operations
- Error handling + user feedback
- Success messages after delete/view

### Step 7: [ ] Test quiz management
```
npm run dev
# Login teacher → /teacher/courses/:id/quizzes → test all buttons
```

### Step 8: [ ] Update TODO progress → attempt_completion
