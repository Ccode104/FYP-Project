import { useEffect, useState } from 'react'
import { apiFetch } from '../../services/api'
import '../CodeEditor.css'
import './TeacherCodeSubmissionViewer.css'

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
        <div className="teacher-grading-form">
          <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Grade Assignment</h4>
          <form onSubmit={handleGradeSubmit} className="form-field">
            <div>
              <label className="form-label">
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
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">
                Feedback (optional):
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="form-textarea"
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
          <div key={codeSub.id || idx} className="teacher-question-card">
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
              <div className="teacher-question-info">
                <strong>Question:</strong>
                <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{question.description}</div>
                {question.constraints && (
                  <div className="constraint-box">
                    <strong>Constraints:</strong> {question.constraints}
                  </div>
                )}
              </div>
            )}

            <div className="teacher-code-section">
              <div className="teacher-code-header">
                <strong>Submitted Code</strong>
                <span style={{ fontSize: '0.9em', color: 'var(--muted)' }}>Language: {codeSub.language}</span>
              </div>
              <pre className="teacher-code-display">
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
                      className={`teacher-test-case ${testCase.passed ? 'passed' : 'failed'}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                          {testCase.passed ? '✓' : '✗'}
                        </span>
                        <strong style={{ fontSize: '16px' }}>
                          Test Case {tcIdx + 1}
                          {testCase.is_sample && <span style={{ color: 'var(--muted)', fontSize: '14px', marginLeft: '8px' }}>(Sample)</span>}
                          {!testCase.is_sample && <span style={{ color: 'var(--primary)', fontSize: '14px', marginLeft: '8px' }}>(Hidden)</span>}
                        </strong>
                        {testCase.execution_time_ms !== null && testCase.execution_time_ms !== undefined && (
                          <span style={{ color: 'var(--muted)', fontSize: '14px', marginLeft: 'auto' }}>
                            {testCase.execution_time_ms}ms
                          </span>
                        )}
                      </div>

                      {testCase.input_text && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Input:</strong>
                          <pre className="teacher-test-output">
                            {testCase.input_text || '(empty)'}
                          </pre>
                        </div>
                      )}

                      {testCase.expected_text && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Expected Output:</strong>
                          <pre className="teacher-test-output">
                            {testCase.expected_text || '(empty)'}
                          </pre>
                        </div>
                      )}

                      {testCase.student_output !== undefined && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Student Output:</strong>
                          <pre className="teacher-test-output" style={{
                            borderColor: testCase.passed ? 'var(--secondary)' : '#ef4444'
                          }}>
                            {testCase.student_output || '(empty)'}
                          </pre>
                        </div>
                      )}

                      {testCase.error_output && testCase.error_output.trim() !== '' && (
                        <div style={{ marginTop: '8px' }}>
                          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#ef4444' }}>Error:</strong>
                          <pre className="teacher-test-error">
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
              <div className="teacher-summary">
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
