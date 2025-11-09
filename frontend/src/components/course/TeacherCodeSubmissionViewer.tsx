import { useEffect, useState } from 'react'
import { apiFetch } from '../../services/api'

function TeacherCodeSubmissionViewer({ submission, onGrade, push }: { submission: any; onGrade: (score: number, feedback: string) => void; push: any }) {
  const [showGradingForm, setShowGradingForm] = useState(false)
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [runningTestCases, setRunningTestCases] = useState<Record<string, boolean>>({})
  const [testCaseResults, setTestCaseResults] = useState<Record<string, any>>({})
  const [questionDetails, setQuestionDetails] = useState<Record<string, any>>({})

  useEffect(() => {
    const loadQuestionDetails = async () => {
      const details: Record<string, any> = {}
      for (const codeSub of submission.code || []) {
        const questionId = codeSub.question_id
        if (questionId) {
          try {
            const questionData = await apiFetch(`/api/code-questions/${questionId}`)
            details[codeSub.id] = questionData
          } catch (err) {
            console.error('Failed to load question details:', err)
          }
        }
      }
      setQuestionDetails(details)
    }
    if (submission.code && submission.code.length > 0 && submission.assignment_id) {
      void loadQuestionDetails()
    }
  }, [submission])

  const runHiddenTestCases = async (codeSub: any, questionId: number) => {
    if (!codeSub.code || !codeSub.language) {
      push({ kind: 'error', message: 'No code found for this question' })
      return
    }

    setRunningTestCases(prev => ({ ...prev, [codeSub.id]: true }))
    try {
      const question = await apiFetch(`/api/code-questions/${questionId}`)
      const allTestCases = question.test_cases || []
      const hiddenTestCases = allTestCases.filter((tc: any) => !tc.is_sample)

      if (hiddenTestCases.length === 0) {
        push({ kind: 'info', message: 'No hidden test cases found for this question' })
        setRunningTestCases(prev => ({ ...prev, [codeSub.id]: false }))
        return
      }

      const results: any[] = []
      for (const testCase of hiddenTestCases) {
        try {
          const result = await apiFetch('/api/judge', {
            method: 'POST',
            body: {
              source_code: codeSub.code,
              language: codeSub.language,
              stdin: testCase.input_text || '',
              expected_output: testCase.expected_text || ''
            }
          })

          const passed = result.stdout && testCase.expected_text && 
                        result.stdout.trim() === testCase.expected_text.trim()

          results.push({
            ...testCase,
            passed,
            student_output: result.stdout || '',
            error_output: result.stderr || result.compile_output || '',
            execution_time_ms: result.time ? Math.round(result.time * 1000) : null,
            status: result.status
          })
        } catch (err: any) {
          results.push({
            ...testCase,
            passed: false,
            error: err?.message || 'Execution failed'
          })
        }
      }

      setTestCaseResults(prev => ({ ...prev, [codeSub.id]: results }))
      const passedCount = results.filter(r => r.passed).length
      push({ kind: 'success', message: `Ran ${results.length} hidden test cases. ${passedCount}/${results.length} passed.` })
    } catch (err: any) {
      push({ kind: 'error', message: err?.message || 'Failed to run hidden test cases' })
    } finally {
      setRunningTestCases(prev => ({ ...prev, [codeSub.id]: false }))
    }
  }

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numScore = parseFloat(score)
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      push({ kind: 'error', message: 'Please enter a valid score between 0 and 100' })
      return
    }
    onGrade(numScore, feedback)
    setShowGradingForm(false)
    setScore('')
    setFeedback('')
  }

  return (
    <div>
      {showGradingForm && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f9fafb', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Grade Assignment</h4>
          <form onSubmit={handleGradeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Score (0-100):
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Feedback (optional):
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                placeholder="Provide feedback to the student..."
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">
                Submit Grade
              </button>
              <button type="button" className="btn" onClick={() => setShowGradingForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!showGradingForm && (
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => setShowGradingForm(true)}>
            Grade Assignment
          </button>
        </div>
      )}

      {submission.code.map((codeSub: any, idx: number) => {
        const question = questionDetails[codeSub.id]
        const hiddenTestResults = testCaseResults[codeSub.id] || []
        const existingTestResults = codeSub.test_case_results || []
        const allTestResults = [...existingTestResults, ...hiddenTestResults]

        return (
          <div key={codeSub.id || idx} style={{ 
            marginBottom: '32px', 
            padding: '20px', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            backgroundColor: '#ffffff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <h4 style={{ margin: 0 }}>Question {idx + 1}</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                {question && (
                  <button
                    className="btn"
                    onClick={() => runHiddenTestCases(codeSub, question.id)}
                    disabled={runningTestCases[codeSub.id]}
                  >
                    {runningTestCases[codeSub.id] ? (
                      <>
                        <span className="spinner" style={{ marginRight: 8, display: 'inline-block' }}></span>
                        Running...
                      </>
                    ) : (
                      'Run Hidden Test Cases'
                    )}
                  </button>
                )}
              </div>
            </div>

            {question && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                <strong>Question:</strong>
                <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{question.description}</div>
                {question.constraints && (
                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                    <strong>Constraints:</strong> {question.constraints}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong>Submitted Code</strong>
                <span style={{ fontSize: '0.9em', color: '#6b7280' }}>Language: {codeSub.language}</span>
              </div>
              <pre style={{
                margin: 0,
                padding: '16px',
                backgroundColor: '#1e293b',
                color: '#e2e8f0',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '14px',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {codeSub.code}
              </pre>
              <button 
                className="btn" 
                style={{ marginTop: '8px' }}
                onClick={() => {
                  navigator.clipboard.writeText(codeSub.code)
                  push({ kind: 'success', message: 'Code copied to clipboard' })
                }}
              >
                Copy Code
              </button>
            </div>

            {allTestResults.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h5 style={{ marginBottom: '12px' }}>Test Case Results</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {allTestResults.map((testCase: any, tcIdx: number) => (
                    <div
                      key={testCase.id || tcIdx}
                      style={{
                        padding: '16px',
                        border: `2px solid ${testCase.passed ? '#10b981' : '#ef4444'}`,
                        borderRadius: '8px',
                        backgroundColor: testCase.passed ? '#f0fdf4' : '#fef2f2'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                          {testCase.passed ? '✓' : '✗'}
                        </span>
                        <strong style={{ fontSize: '16px' }}>
                          Test Case {tcIdx + 1}
                          {testCase.is_sample && <span style={{ color: '#6b7280', fontSize: '14px', marginLeft: '8px' }}>(Sample)</span>}
                          {!testCase.is_sample && <span style={{ color: '#6366f1', fontSize: '14px', marginLeft: '8px' }}>(Hidden)</span>}
                        </strong>
                        {testCase.execution_time_ms !== null && testCase.execution_time_ms !== undefined && (
                          <span style={{ color: '#6b7280', fontSize: '14px', marginLeft: 'auto' }}>
                            {testCase.execution_time_ms}ms
                          </span>
                        )}
                      </div>

                      {testCase.input_text && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Input:</strong>
                          <pre style={{
                            margin: 0,
                            padding: '8px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            fontSize: '13px',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            overflowX: 'auto'
                          }}>
                            {testCase.input_text || '(empty)'}
                          </pre>
                        </div>
                      )}

                      {testCase.expected_text && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Expected Output:</strong>
                          <pre style={{
                            margin: 0,
                            padding: '8px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            fontSize: '13px',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            overflowX: 'auto'
                          }}>
                            {testCase.expected_text || '(empty)'}
                          </pre>
                        </div>
                      )}

                      {testCase.student_output !== undefined && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Student Output:</strong>
                          <pre style={{
                            margin: 0,
                            padding: '8px',
                            backgroundColor: '#ffffff',
                            border: `1px solid ${testCase.passed ? '#10b981' : '#ef4444'}`,
                            borderRadius: '4px',
                            fontSize: '13px',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            overflowX: 'auto'
                          }}>
                            {testCase.student_output || '(empty)'}
                          </pre>
                        </div>
                      )}

                      {testCase.error_output && testCase.error_output.trim() !== '' && (
                        <div style={{ marginTop: '8px' }}>
                          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#ef4444' }}>Error:</strong>
                          <pre style={{
                            margin: 0,
                            padding: '8px',
                            backgroundColor: '#fff5f5',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            fontSize: '13px',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            color: '#dc2626',
                            overflowX: 'auto'
                          }}>
                            {testCase.error_output}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allTestResults.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                <strong>Summary: </strong>
                {allTestResults.filter((tc: any) => tc.passed).length} / {allTestResults.length} test cases passed
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default TeacherCodeSubmissionViewer
