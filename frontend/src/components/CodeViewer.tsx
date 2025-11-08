import { useState } from 'react'
import './CodeEditor.css'

interface TestCaseResult {
  id?: number
  passed?: boolean
  student_output?: string
  error_output?: string
  execution_time_ms?: number
  input_text?: string
  expected_text?: string
  is_sample?: boolean
}

interface CodeViewerProps {
  code: string
  language: string
  studentName?: string
  studentEmail?: string
  submittedAt?: string
  testCaseResults?: TestCaseResult[]
  testResults?: {
    passed?: boolean
    stdout?: string
    stderr?: string
    status?: any
    execution_time?: number
    memory?: number
  } | null
  onGrade?: (score: number, feedback: string) => void
}

export default function CodeViewer({ 
  code, 
  language, 
  studentName, 
  studentEmail, 
  submittedAt,
  testCaseResults = [],
  testResults = null,
  onGrade 
}: CodeViewerProps) {
  const [showGradingForm, setShowGradingForm] = useState(false)
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    alert('Code copied to clipboard!')
  }

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numScore = parseFloat(score)
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      alert('Please enter a valid score between 0 and 100')
      return
    }
    if (onGrade) {
      onGrade(numScore, feedback)
      setShowGradingForm(false)
      setScore('')
      setFeedback('')
    }
  }

  const passedCount = testCaseResults?.filter(tc => tc.passed).length || 0
  const totalCount = testCaseResults?.length || 0

  return (
    <div className="code-viewer-container">
      <div className="code-viewer-header">
        <div className="code-viewer-info">
          <span><strong>Language:</strong> {language}</span>
          {studentName && <span><strong>Student:</strong> {studentName}</span>}
          {studentEmail && <span><strong>Email:</strong> {studentEmail}</span>}
          {submittedAt && <span><strong>Submitted:</strong> {new Date(submittedAt).toLocaleString()}</span>}
          {totalCount > 0 && (
            <span style={{ 
              color: passedCount === totalCount ? '#10b981' : '#ef4444',
              fontWeight: 'bold'
            }}>
              Test Cases: {passedCount}/{totalCount} passed
            </span>
          )}
        </div>
        <div className="code-viewer-actions">
          <button className="btn" onClick={handleCopy}>
            Copy Code
          </button>
          {onGrade && (
            <button className="btn btn-primary" onClick={() => setShowGradingForm(!showGradingForm)}>
              {showGradingForm ? 'Cancel Grading' : 'Grade'}
            </button>
          )}
        </div>
      </div>

      {showGradingForm && onGrade && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f9fafb', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Grade Submission</h4>
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
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              Submit Grade
            </button>
          </form>
        </div>
      )}

      {/* Test Case Results Section */}
      {testCaseResults && testCaseResults.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 600 }}>Test Case Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {testCaseResults.map((testCase, index) => (
              <div
                key={testCase.id || index}
                style={{
                  padding: '16px',
                  border: `2px solid ${testCase.passed ? '#10b981' : '#ef4444'}`,
                  borderRadius: '8px',
                  backgroundColor: testCase.passed ? '#f0fdf4' : '#fef2f2'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{
                    fontSize: '20px',
                    fontWeight: 'bold'
                  }}>
                    {testCase.passed ? '✓' : '✗'}
                  </span>
                  <strong style={{ fontSize: '16px' }}>
                    Test Case {index + 1}
                    {testCase.is_sample && <span style={{ color: '#6b7280', fontSize: '14px', marginLeft: '8px' }}>(Sample)</span>}
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

      {/* Legacy test results (if no test case results but has test_results) */}
      {(!testCaseResults || testCaseResults.length === 0) && testResults && (
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px', fontWeight: 600 }}>Execution Results</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {testResults.passed ? '✓' : '✗'}
            </span>
            <strong style={{ color: testResults.passed ? '#10b981' : '#ef4444' }}>
              {testResults.passed ? 'Passed' : 'Failed'}
            </strong>
          </div>
          {testResults.stdout && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Output:</strong>
              <pre style={{ marginTop: '4px', padding: '8px', backgroundColor: '#ffffff', borderRadius: '4px', fontSize: '13px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {testResults.stdout}
              </pre>
            </div>
          )}
          {testResults.stderr && (
            <div>
              <strong style={{ color: '#ef4444' }}>Error:</strong>
              <pre style={{ marginTop: '4px', padding: '8px', backgroundColor: '#fff5f5', borderRadius: '4px', fontSize: '13px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: '#dc2626' }}>
                {testResults.stderr}
              </pre>
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <strong style={{ display: 'block', marginBottom: '8px' }}>Code:</strong>
        <pre className="code-viewer-code" style={{ margin: 0 }}>{code}</pre>
      </div>
    </div>
  )
}
