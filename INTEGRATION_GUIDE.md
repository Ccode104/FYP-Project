# Integration Guide: AI-Enhanced Editor with Contest System

## Overview
This guide explains how to integrate the new AI-Enhanced Code Editor with the existing Contest Editor Page.

## Step 1: Update ContestEditorPage.tsx

Replace the simple `CodeEditor` component with the new `AIEnhancedCodeEditor`:

```tsx
// Before: Import statement
import CodeEditor from '../../components/CodeEditor'

// After: Add new import
import AIEnhancedCodeEditor from '../../components/AIEnhancedCodeEditor'
```

### Step 2: Update the Render Section

Find the code editor rendering section in `ContestEditorPage.tsx` (around line 500-600) and replace it:

**Before (Old Implementation):**
```tsx
<CodeEditor
  value={codeEditor[currentQuestion.id] || ''}
  language={codeLang[currentQuestion.id] || 'python'}
  onChange={(code) => setCodeEditor(prev => ({ ...prev, [currentQuestion.id]: code }))}
  onSubmit={(code, lang) => {
    setCodeEditor(prev => ({ ...prev, [currentQuestion.id]: code }))
    setCodeLang(prev => ({ ...prev, [currentQuestion.id]: lang }))
  }}
  defaultLanguage={codeLang[currentQuestion.id] || 'python'}
/>
```

**After (New Implementation):**
```tsx
<AIEnhancedCodeEditor
  questionId={currentQuestion.id}
  initialCode={codeEditor[currentQuestion.id] || ''}
  language={codeLang[currentQuestion.id] || 'python'}
  onCodeChange={(code, lang) => {
    setCodeEditor(prev => ({ ...prev, [currentQuestion.id]: code }))
    setCodeLang(prev => ({ ...prev, [currentQuestion.id]: lang }))
  }}
  onRun={(code, lang) => {
    // Handle run code
    runCodeForQuestion(currentQuestion)
  }}
  onSubmit={(code, lang) => {
    // Handle submit
    saveQuestionCode(currentQuestion.id, code, lang)
  }}
  contestMode={true}
  allowAI={true}
  maxAIQueries={10}
  disableDistractionControl={false}
  onComplexityAnalysis={(complexity) => {
    console.log('Code complexity:', complexity)
    // Optionally store complexity analysis
  }}
/>
```

## Step 3: Add State for Contest Settings

Add new state variables to manage AI settings:

```tsx
// Add to ContestEditorPage state
const [contestSettings, setContestSettings] = useState({
  aiEnabled: true,
  maxAIQueries: 10,
  allowDistraction: true,
  theme: 'dark'
})

const [complexityAnalysis, setComplexityAnalysis] = useState<Record<string, any>>({})
```

## Step 4: Load Contest Settings from Backend

Add a new effect to load contest-specific settings:

```tsx
useEffect(() => {
  if (!contestId) return

  const loadContestSettings = async () => {
    try {
      const settings = await apiFetch(
        `/api/contests/${contestId}/editor-settings`,
        { method: 'GET' }
      )
      setContestSettings(settings)
    } catch (error) {
      console.warn('Could not load contest settings, using defaults:', error)
      // Use defaults if endpoint doesn't exist
    }
  }

  loadContestSettings()
}, [contestId])
```

## Step 5: Add Backend Endpoint (Optional but Recommended)

Create a new endpoint to manage contest-specific AI settings:

```javascript
// In backend/routes/contests.js

router.get('/:id/editor-settings', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    // Get or create settings
    const result = await pool.query(
      `SELECT ai_enabled, max_ai_queries, distraction_mode, theme
       FROM contest_editor_settings
       WHERE user_id = $1 AND contest_id = $2`,
      [userId, id]
    )

    if (result.rows.length > 0) {
      res.json(result.rows[0])
    } else {
      // Return defaults
      res.json({
        ai_enabled: true,
        max_ai_queries: 10,
        distraction_mode: false,
        theme: 'dark'
      })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load settings' })
  }
})
```

## Step 6: Handle Complexity Analysis

Update the complexity analysis handler:

```tsx
const handleComplexityAnalysis = (complexity: { time: string; space: string }) => {
  if (currentQuestion) {
    setComplexityAnalysis(prev => ({
      ...prev,
      [currentQuestion.id]: complexity
    }))

    // Optionally log to console or send to analytics
    console.log(`Q${currentQuestion.id} Complexity:`, complexity)
  }
}
```

Then pass it to the editor:

```tsx
<AIEnhancedCodeEditor
  // ... other props
  onComplexityAnalysis={handleComplexityAnalysis}
/>
```

## Step 7: Update CSS Classes (If Needed)

Ensure your contest editor CSS doesn't conflict with the new editor styles. You may need to adjust:

```css
/* Your ContestEditorPage.css */

/* Ensure proper layout with split view */
.contest-editor-main {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-section {
  flex: 1;
  min-height: 0;
  display: flex;
}

/* Adjust if using split layout */
@media (max-width: 768px) {
  .editor-section {
    flex-direction: column;
  }
}
```

## Step 8: Migration and Database Setup

Before deploying, run the migration:

```bash
cd backend
node apply-ai-editor-migration.js
```

This creates all necessary tables for:
- Code analysis logging
- AI query tracking
- Logical bug injection
- Contest editor settings

## Step 9: Environment Variables

Ensure these are set in your `.env` file:

```env
# Required for AI Assistant
GROQ_API_KEY=your_groq_api_key_here

# Existing (for code execution)
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_judge0_api_key_here
```

## Step 10: Test the Integration

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Test the editor:**
   - Open a contest
   - Write some code
   - Check complexity analysis appears
   - Try using AI assistant
   - Test distraction mode toggle

3. **Check API endpoints:**
   ```bash
   # Test complexity analysis
   curl -X POST http://localhost:4000/api/code-analysis/complexity \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"code":"for(int i=0;i<n;i++){}","language":"cpp"}'

   # Test AI query
   curl -X POST http://localhost:4000/api/ai-assistant/query \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"question_id":1,"code":"x=1","language":"python","query_type":"hint"}'
   ```

## Step 11: Optional - Add Settings Panel

Create a contest settings modal to allow students/instructors to customize:

```tsx
<SettingsModal
  settings={contestSettings}
  onSave={(newSettings) => {
    setContestSettings(newSettings)
    // Save to backend
  }}
/>
```

### Settings Panel Component:

```tsx
function ContestEditorSettings({ settings, onSave }) {
  const [localSettings, setLocalSettings] = useState(settings)

  return (
    <div className="settings-panel">
      <h3>Editor Settings</h3>

      <label>
        <input
          type="checkbox"
          checked={localSettings.aiEnabled}
          onChange={(e) =>
            setLocalSettings({
              ...localSettings,
              aiEnabled: e.target.checked
            })
          }
        />
        Enable AI Assistant
      </label>

      <label>
        Max AI Queries:
        <input
          type="number"
          value={localSettings.maxAIQueries}
          onChange={(e) =>
            setLocalSettings({
              ...localSettings,
              maxAIQueries: parseInt(e.target.value)
            })
          }
          min="1"
          max="50"
        />
      </label>

      <button onClick={() => onSave(localSettings)}>
        Save Settings
      </button>
    </div>
  )
}
```

## Troubleshooting

### AI Panel Not Showing
- Check `allowAI` prop is `true`
- Verify API routes are registered in server.js
- Check browser console for errors

### Complexity Analysis Not Working
- Ensure code is syntactically valid
- Check backend is accessible
- Look for 401 Unauthorized errors (auth issue)

### Query Limit Not Enforcing
- Check `ai_query_logs` table exists
- Verify `maxAIQueries` prop is set
- Review database query logs

### Distraction Mode Not Working
- Ensure `disableDistractionControl` is `false`
- Check CSS classes are not being overridden
- Verify event handlers are connected

## Performance Optimization

The new editor includes several optimizations:

1. **Debounced Analysis**: Complexity analysis waits 2 seconds after code changes
2. **Lazy Loading**: AI panel only loads when opened
3. **Memoization**: Uses `useMemo` for complex computations
4. **Code Splitting**: Component can be lazy-loaded

To further optimize, use React.lazy:

```tsx
const AIEnhancedCodeEditor = lazy(() =>
  import('../../components/AIEnhancedCodeEditor')
)
```

## Rollback Instructions

If you need to rollback to the old CodeEditor:

1. Revert the import
2. Replace AIEnhancedCodeEditor with CodeEditor
3. Remove new route registrations from server.js
4. Keep database tables (no need to drop)

## Next Steps

After successful integration:

1. Gather student feedback
2. Refine AI prompts based on usage patterns
3. Adjust query limits based on actual usage
4. Add more bug injection patterns
5. Implement performance profiling
6. Add test case generation

## Support

For issues or questions:
- Check the main documentation: `AI_ENHANCED_CODE_EDITOR.md`
- Review API responses in browser DevTools
- Check backend logs for errors
- Test API endpoints independently

