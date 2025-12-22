# AI-Enhanced Code Editor for Coding Contests

## Overview

The AI-Enhanced Code Editor is a sophisticated web-based code editor designed specifically for competitive programming and educational coding contests. It combines a professional code editor interface with integrated AI assistance, while encouraging genuine problem-solving through controlled logical bug injection and complexity analysis.

## Key Features

### 1. **Modern Code Editor (Monaco-based)**
- **Multi-language support**: Python, C++, Java, JavaScript, C#, Go, Rust
- **Syntax highlighting** with language-specific themes
- **Auto-indentation** and bracket matching
- **Code folding** for better readability
- **Minimap disabled** for distraction-free coding
- **Smart formatting** on paste and type
- **Dark theme** (with light theme variant available)

### 2. **AI Assistant Integration**
- **Query-Limited Assistance**: 10-15 queries per question per day
- **Query Types**:
  - **Hint**: Get guidance without full solutions
  - **Explanation**: Understand your code logic
  - **Debugging**: Get help identifying issues
  - **Algorithm**: Learn algorithmic approaches
- **Responsible AI**: Focuses on teaching, not solving
- **Contest Mode**: Even stricter limitations on AI help
- **Query Counter**: Visual progress bar showing usage

### 3. **Time & Space Complexity Analyzer**
- **Automatic Analysis**: Real-time complexity detection
- **Pattern Recognition**: Identifies loops, recursion, DP, sorting, etc.
- **Warnings**: Alerts for potential TLE (Time Limit Exceeded) or MLE (Memory Limit Exceeded)
- **Breakdown**: Shows detected patterns and nesting levels
- **Visual Feedback**: Complexity badge in editor header

### 4. **Logical Bug Injection System**
- **Controlled Bug Introduction**: Prevents blind copying of solutions
- **Non-trivial Bugs**: Off-by-one errors, wrong operators, incorrect boundaries
- **Educational Purpose**: Encourages actual code review and understanding
- **Randomized Triggers**: Based on user behavior and session settings
- **Bug Types**:
  - Loop boundary errors (off-by-one)
  - Incorrect comparison operators
  - Array indexing mistakes
  - Condition logic errors

### 5. **Contest Mode**
- **Distraction-Free Interface**: Hides AI panel with one click
- **Tight Time Limits**: Reduced AI query limits
- **Focus Mode**: Full-screen overlay with motivation message
- **Leaderboard Integration**: Track rankings in real-time
- **Session Timer**: Track time spent per question

### 6. **Data Logging & Analytics**
- **Query Tracking**: All AI interactions logged
- **Usage Statistics**: Per-user and per-question metrics
- **Bug Injection History**: Track injected bugs for review
- **Complexity Analysis History**: Past analyses for reference

## Architecture

### Frontend Components

#### AIEnhancedCodeEditor.tsx
Main component that manages:
- Code editor state and rendering
- AI panel visibility and interactions
- Language selection
- Complexity analysis triggering
- Contest mode toggling
- Distraction control

```tsx
<AIEnhancedCodeEditor
  questionId={1}
  language="python"
  onCodeChange={handleCodeChange}
  onSubmit={handleSubmit}
  onRun={handleRun}
  contestMode={true}
  allowAI={true}
  maxAIQueries={10}
  onComplexityAnalysis={handleComplexity}
/>
```

### Backend APIs

#### Code Analysis Endpoints

**POST /api/code-analysis/complexity**
- Analyzes code for time and space complexity
- Returns detected patterns and complexity estimates
- Logs analysis for user history

Request:
```json
{
  "code": "for (int i = 0; i < n; i++) { /* ... */ }",
  "language": "cpp",
  "question_id": 42
}
```

Response:
```json
{
  "time_complexity": "O(n)",
  "space_complexity": "O(1)",
  "patterns": ["Single loop"],
  "analysis": "Detected patterns: Single loop\nLoop depth: 1\n..."
}
```

**POST /api/code-analysis/inject-bug**
- Injects a logical bug into the code
- Returns modified code with bug description
- Logs injection for audit trail

Request:
```json
{
  "code": "for (int i = 0; i < n; i++) { /* ... */ }",
  "language": "cpp",
  "question_id": 42
}
```

Response:
```json
{
  "code": "for (int i = 1; i < n; i++) { /* ... */ }",
  "bug_description": "Off-by-one error in loop initialization",
  "injected": true,
  "hint": "Check your loop starting point"
}
```

#### AI Assistant Endpoints

**POST /api/ai-assistant/query**
- Sends query to AI assistant
- Enforces rate limiting
- Returns contextual AI response

Request:
```json
{
  "question_id": 42,
  "code": "user's code here",
  "language": "python",
  "query_type": "hint",
  "user_query": "How do I debug this?",
  "contest_mode": false
}
```

Response:
```json
{
  "type": "hint",
  "content": "Think about edge cases...",
  "remaining_queries": 9
}
```

**GET /api/ai-assistant/history/:questionId**
- Retrieves query history for a question
- Shows previous queries and responses

**GET /api/ai-assistant/stats**
- User's AI usage statistics
- Query counts by type
- Last query timestamp

### Database Schema

#### code_analysis_logs
```sql
CREATE TABLE code_analysis_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  question_id INTEGER REFERENCES code_questions(id),
  code_hash VARCHAR(255),
  time_complexity VARCHAR(50),
  space_complexity VARCHAR(50),
  analysis TEXT,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);
```

#### ai_query_logs
```sql
CREATE TABLE ai_query_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  question_id INTEGER REFERENCES code_questions(id),
  query_type VARCHAR(50),
  code_hash VARCHAR(255),
  response_preview TEXT,
  contest_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### logical_bug_injections
```sql
CREATE TABLE logical_bug_injections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  question_id INTEGER REFERENCES code_questions(id),
  original_code VARCHAR(255),
  modified_code VARCHAR(255),
  bug_type VARCHAR(50),
  bug_description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### contest_editor_settings
```sql
CREATE TABLE contest_editor_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  contest_id INTEGER REFERENCES contests(id),
  ai_enabled BOOLEAN DEFAULT true,
  distraction_mode BOOLEAN DEFAULT false,
  max_ai_queries INTEGER DEFAULT 15,
  theme VARCHAR(20) DEFAULT 'dark',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, contest_id)
);
```

## Setup Instructions

### 1. Apply Database Migration

```bash
cd backend
node apply-ai-editor-migration.js
```

This creates:
- `code_analysis_logs` table
- `logical_bug_injections` table
- `ai_query_logs` table
- `contest_editor_settings` table

### 2. Ensure Environment Variables

Add to your `.env`:
```
GROQ_API_KEY=your_groq_api_key_here
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_judge0_api_key_here
```

### 3. Integrate with Contest Pages

In your contest editor component, import and use:

```tsx
import AIEnhancedCodeEditor from '../../components/AIEnhancedCodeEditor'

// In your contest editor page
<AIEnhancedCodeEditor
  questionId={currentQuestion.id}
  language="python"
  initialCode={userCode}
  onCodeChange={setUserCode}
  onRun={handleRunCode}
  onSubmit={handleSubmitCode}
  contestMode={true}
  allowAI={contestSettings?.ai_enabled ?? true}
  maxAIQueries={contestSettings?.max_ai_queries ?? 10}
/>
```

## Usage Guidelines

### For Students

1. **Use AI Wisely**: AI queries are limited. Think before asking.
2. **Focus on Learning**: Hints are meant to guide, not solve.
3. **Review Complexity**: Use complexity analyzer to optimize solutions.
4. **Spot Bugs**: If a logical bug is injected, try to find it!
5. **Contest Mode**: When competing, use Distraction Mode to stay focused.

### For Instructors

1. **Configure Limits**: Set appropriate AI query limits per contest
2. **Monitor Usage**: Check AI statistics to identify struggling students
3. **Review Bugs**: Inspect injected bugs to ensure educational value
4. **Feedback**: Use complexity analysis to guide student improvements

## Complexity Analysis Details

### Detected Patterns

- **Linear Loop**: O(n)
- **Nested Loops**: O(n²) or O(n³)
- **Recursion**: O(n) or O(2^n) depending on pattern
- **Dynamic Programming**: O(n) to O(n²)
- **Binary Search**: O(log n)
- **Sorting**: O(n log n)
- **Hash Operations**: O(1) average, O(n) worst

### Space Complexity

- **Stack Recursion**: O(n)
- **DP Array**: O(n) for 1D, O(n²) for 2D
- **Hash Table/Set**: O(n)
- **No Extra Space**: O(1)

## Future Enhancements

1. **Advanced RAG**: Retrieval-Augmented Generation for code context
2. **Test Case Generator**: Auto-generate edge cases
3. **Performance Profiling**: Per-function timing
4. **Plagiarism Detection**: Code fingerprinting
5. **Multi-file Support**: Support projects with multiple files
6. **Collaborative Coding**: Real-time collaboration with AI
7. **Custom Validators**: Problem-specific solution validation
8. **Learning Analytics**: Detailed progress tracking

## Security Considerations

1. **Rate Limiting**: Per-user, per-question query limits enforced
2. **Query Auditing**: All AI interactions logged with timestamps
3. **Code Hashing**: Code content not stored, only hashes
4. **Authentication**: All endpoints require authentication
5. **Timeout Protection**: Long-running analyses timeout gracefully

## Performance Optimization

- **Debounced Analysis**: Complexity analysis debounced by 2 seconds
- **Lazy Loading**: AI panel loaded only when needed
- **Code Caching**: Recent analyses cached
- **Async Queries**: Non-blocking AI requests
- **Efficient Algorithms**: O(n) complexity parsing

## Troubleshooting

### AI Assistant Not Responding
- Check GROQ_API_KEY is set correctly
- Verify internet connectivity
- Check API quota limits

### Complexity Analysis Shows Wrong Results
- Ensure code is syntactically correct
- Complex patterns may not be detected perfectly
- Manual review recommended for accuracy

### Bug Injection Not Working
- Check code has suitable injection points
- Try with different code patterns
- Some patterns intentionally don't get bugs

## API Reference

### All Endpoints Require Authentication

All endpoints below require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

### Code Analysis

#### Analyze Complexity
```
POST /api/code-analysis/complexity
Content-Type: application/json

{
  "code": "...",
  "language": "python",
  "question_id": 1
}
```

#### Inject Bug
```
POST /api/code-analysis/inject-bug
Content-Type: application/json

{
  "code": "...",
  "language": "python",
  "question_id": 1
}
```

### AI Assistant

#### Send Query
```
POST /api/ai-assistant/query
Content-Type: application/json

{
  "question_id": 1,
  "code": "...",
  "language": "python",
  "query_type": "hint|explanation|debugging|algorithm",
  "user_query": "...",
  "contest_mode": false
}
```

#### Get History
```
GET /api/ai-assistant/history/{questionId}
```

#### Get Statistics
```
GET /api/ai-assistant/stats
```

## Contributing

To contribute improvements:

1. **Code Analysis**: Improve pattern detection in `codeAnalysisController.js`
2. **AI Prompts**: Refine AI prompts in `aiAssistantController.js`
3. **UI/UX**: Enhance editor UI in `AIEnhancedCodeEditor.tsx`
4. **Bug Injection**: Add new bug types in bug injection system

## License

This feature is part of the Unified Academic Portal and follows the same MIT license.
