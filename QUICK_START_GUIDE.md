# AI-Enhanced Code Editor - Quick Start Guide

## 5-Minute Setup

### Step 1: Apply Database Migration (2 minutes)

```bash
cd backend
node apply-ai-editor-migration.js
```

You should see:
```
🚀 Applying AI-Enhanced Code Editor migration...
✅ Migration applied successfully! (8 statements executed)

📊 New tables created:
   - code_analysis_logs
   - logical_bug_injections
   - ai_query_logs
   - contest_editor_settings
```

### Step 2: Configure Environment (1 minute)

Ensure your `.env` file has:
```env
GROQ_API_KEY=your_groq_api_key_here
JUDGE0_API_KEY=your_judge0_api_key_here
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
```

### Step 3: Update Contest Editor (2 minutes)

In `frontend/src/pages/student/ContestEditorPage.tsx`:

**Find** the CodeEditor component import:
```tsx
import CodeEditor from '../../components/CodeEditor'
```

**Replace with**:
```tsx
import AIEnhancedCodeEditor from '../../components/AIEnhancedCodeEditor'
```

**Find** the CodeEditor component usage (around line 500):
```tsx
<CodeEditor
  value={codeEditor[currentQuestion.id] || ''}
  language={codeLang[currentQuestion.id] || 'python'}
  onChange={(code) => setCodeEditor(prev => ({ ...prev, [currentQuestion.id]: code }))}
  defaultLanguage={codeLang[currentQuestion.id] || 'python'}
/>
```

**Replace with**:
```tsx
<AIEnhancedCodeEditor
  questionId={currentQuestion.id}
  initialCode={codeEditor[currentQuestion.id] || ''}
  language={codeLang[currentQuestion.id] || 'python'}
  onCodeChange={(code, lang) => {
    setCodeEditor(prev => ({ ...prev, [currentQuestion.id]: code }))
    setCodeLang(prev => ({ ...prev, [currentQuestion.id]: lang }))
  }}
  onRun={() => runCodeForQuestion(currentQuestion)}
  onSubmit={() => saveQuestionCode(currentQuestion.id)}
  contestMode={true}
  allowAI={true}
  maxAIQueries={10}
/>
```

### Step 4: Test It

```bash
npm run dev
```

Open a contest and start coding! You should see:
- 🤖 AI Assistant button with query count
- 📊 Complexity analysis badge
- 👁️ Distraction mode toggle
- Enhanced code editor UI

## Common Tasks

### Change AI Query Limit

In `AIEnhancedCodeEditor.tsx`:
```tsx
<AIEnhancedCodeEditor
  maxAIQueries={15}  // Change this number
  // ... other props
/>
```

### Disable AI for Specific Contest

In `ContestEditorPage.tsx`:
```tsx
<AIEnhancedCodeEditor
  allowAI={false}  // Disables AI panel
  // ... other props
/>
```

### Customize AI Prompt Behavior

In `backend/controllers/aiAssistantController.js`, modify `buildSystemPrompt()`:
```javascript
const basePrompt = `Your custom instructions here...`
```

### Check What Students Are Asking AI

```sql
-- Top 10 most asked questions
SELECT query_type, COUNT(*) as count, response_preview
FROM ai_query_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query_type, response_preview
ORDER BY count DESC
LIMIT 10;

-- Check if student reached query limit
SELECT COUNT(*) FROM ai_query_logs
WHERE user_id = 123
AND question_id = 456
AND created_at > NOW() - INTERVAL '1 day';
```

## Testing the APIs

### Test Complexity Analysis

```bash
curl -X POST http://localhost:4000/api/code-analysis/complexity \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "for (int i = 0; i < n; i++) { for (int j = 0; j < n; j++) { } }",
    "language": "cpp",
    "question_id": 1
  }'
```

Expected response:
```json
{
  "time_complexity": "O(n²)",
  "space_complexity": "O(1)",
  "patterns": ["Double nested loop"],
  "analysis": "Detected patterns: Double nested loop\nLoop depth: 2\n..."
}
```

### Test AI Query

```bash
curl -X POST http://localhost:4000/api/ai-assistant/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question_id": 1,
    "code": "x = [1, 2, 3]\nprint(x[0])",
    "language": "python",
    "query_type": "hint",
    "user_query": "How do I access elements?",
    "contest_mode": false
  }'
```

Expected response:
```json
{
  "type": "hint",
  "content": "Think about what happens when you access...",
  "remaining_queries": 9
}
```

## Troubleshooting

### AI Panel Not Showing?

1. Check browser console for errors
2. Verify `allowAI={true}` is set
3. Check API routes are registered:
   ```bash
   curl http://localhost:4000/api/ai-assistant/stats \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Complexity Analysis Returns "No patterns found"?

1. Ensure code is syntactically correct
2. Try with simple loops first:
   ```python
   for i in range(10):
       pass
   ```
3. Check backend logs for parsing errors

### "Query limit exceeded" error?

Check the database:
```sql
SELECT COUNT(*) FROM ai_query_logs
WHERE user_id = YOUR_USER_ID
AND question_id = QUESTION_ID
AND created_at > NOW() - INTERVAL '1 day';
```

### GROQ_API_KEY not working?

1. Verify key is correct in `.env`
2. Check Groq API status
3. Try getting AI stats endpoint first (returns mock data if no key)

## Customization Examples

### Increase AI Query Limit for Specific Contest

```javascript
// In backend/routes/contests.js
router.post('/:id/settings', requireAuth, async (req, res) => {
  const { id } = req.params
  const { max_ai_queries } = req.body
  
  await pool.query(
    `INSERT INTO contest_editor_settings 
     (user_id, contest_id, max_ai_queries)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, contest_id) DO UPDATE SET max_ai_queries = $3`,
    [req.user.id, id, max_ai_queries]
  )
  res.json({ success: true })
})
```

### Add Custom Bug Type

In `backend/controllers/codeAnalysisController.js`, add to the `bugs` array:

```javascript
{
  pattern: /if\s*\(\s*true\s*\)/,
  type: 'always_true',
  description: 'Logic will always execute',
  hint: 'Review conditional logic',
  replacement: (match) => match.replace('true', 'some_condition')
}
```

### Change AI Model

In `backend/controllers/aiAssistantController.js`:

```javascript
const response = await fetch(GROQ_API_URL, {
  // ...
  body: JSON.stringify({
    model: 'mixtral-8x7b-32768',  // Change this
    // ...
  })
})
```

Available Groq models:
- `mixtral-8x7b-32768` (default)
- `llama2-70b-4096`
- `llama-2-13b-chat`

## Performance Tips

1. **Debounce Analysis**: Already done (2 sec), adjust if needed
2. **Cache Results**: Complexity analysis is logged, can be retrieved
3. **Lazy Load AI**: Don't initialize unless needed
4. **Database Indexing**: Migration already creates optimal indexes

## Next Steps

1. ✅ Setup complete
2. 📊 Monitor usage with queries below
3. 🔧 Customize as needed
4. 📈 Gather student feedback
5. 🚀 Deploy to production

## Useful Queries

### Student Activity
```sql
SELECT u.name, COUNT(*) as queries_used
FROM ai_query_logs aql
JOIN users u ON aql.user_id = u.id
WHERE aql.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.id, u.name
ORDER BY queries_used DESC;
```

### Code Complexity Trends
```sql
SELECT 
  DATE(analyzed_at) as day,
  AVG(CASE WHEN time_complexity = 'O(1)' THEN 1 ELSE 0 END) as opt_count,
  AVG(CASE WHEN time_complexity LIKE 'O(n%' THEN 1 ELSE 0 END) as linear_count
FROM code_analysis_logs
WHERE analyzed_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(analyzed_at)
ORDER BY day;
```

### AI Feature Usage
```sql
SELECT 
  query_type,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM ai_query_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query_type
ORDER BY total DESC;
```

## Getting Help

1. **Check Documentation**: `AI_ENHANCED_CODE_EDITOR.md`
2. **Review Integration Guide**: `INTEGRATION_GUIDE.md`
3. **Read Implementation Summary**: `FEATURE_IMPLEMENTATION_SUMMARY.md`
4. **Test Endpoints**: Use curl/Postman examples above
5. **Check Logs**: Review backend and browser console

## Ready to Go! 🚀

Your AI-Enhanced Code Editor is now live. Students can:
- Write code with professional editor
- Get AI hints (limited)
- See complexity analysis
- Focus with distraction mode
- Enjoy competitive coding experience

Instructors can:
- Monitor AI usage
- Configure limits
- Review student progress
- Analyze learning patterns
