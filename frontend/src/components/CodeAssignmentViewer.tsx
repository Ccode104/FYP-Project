import { useState, useEffect } from 'react'
import { useToast } from './ToastProvider'
// import CodeEditor from './CodeEditor'

interface TestCase {
  id: number
  is_sample: boolean
  input_text?: string
  expected_text?: string
  input_path?: string
  expected_path?: string
}

interface CodeQuestion {
  id: number
  title: string
  description: string
  constraints?: string
  points?: number
  test_cases?: TestCase[]
}

interface CodeAssignmentViewerProps {
  assignmentId: number
  onComplete?: () => void
}

export default function CodeAssignmentViewer({ assignmentId, onComplete }: CodeAssignmentViewerProps) {
  const toast = useToast()
  let push: (opts: { kind?: 'success' | 'error' | string; message?: string }) => void = (opts) => {
    if (!opts) return
    const kind = (opts as any)?.kind
    const msg = (opts as any)?.message ?? opts
    if (kind === 'error') console.error(msg)
    else if (kind === 'success') console.log(msg)
    else console.log(msg)
  }
  if (toast && typeof (toast as any).push === 'function') {
    push = (toast as any).push
  }

  const [questions, setQuestions] = useState<CodeQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [code, setCode] = useState<Record<number, string>>({})
  const [language, setLanguage] = useState<Record<number, string>>({})
  const [runResults, setRunResults] = useState<Record<number, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    loadQuestions()
  }, [assignmentId])

  const loadQuestions = async () => {
    try {
      const { apiFetch } = await import('../services/api')
      const questionsData = await apiFetch<CodeQuestion[]>(`/api/assignments/${assignmentId}/questions`)
      setQuestions(questionsData || [])
      
      // Initialize code and language for each question
      const initialCode: Record<number, string> = {}
      const initialLang: Record<number, string> = {}
      questionsData?.forEach(q => {
        initialCode[q.id] = ''
        initialLang[q.id] = 'python'
      })
      setCode(initialCode)
      setLanguage(initialLang)
    } catch (err: any) {
      push({ kind: 'error', message: err?.message || 'Failed to load questions' })
    } finally {
      setIsLoading(false)
    }
  }

  const currentQuestion = questions[currentQuestionIndex]
  const sampleTestCases = currentQuestion?.test_cases?.filter(tc => tc.is_sample) || []
  const currentCode = currentQuestion ? code[currentQuestion.id] || '' : ''
  const currentLanguage = currentQuestion ? language[currentQuestion.id] || 'python' : 'python'

  const runCode = async (questionId: number) => {
    const src = code[questionId] || ''
    const lang = language[questionId] || 'python'
    
    if (!src.trim()) {
      push({ kind: 'error', message: 'Write your code first' })
      return
    }

    setIsRunning(true)
    try {
      const { apiFetch } = await import('../services/api')
      const result = await apiFetch('/api/judge', {
        method: 'POST',
        body: {
          source_code: src,
          language: lang,
          question_id: questionId
        }
      })

      setRunResults(prev => ({
        ...prev,
        [questionId]: {
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          compile_output: result.compile_output || '',
          passed: result.passed,
          status: result.status,
          message: result.passed ? 'Test passed!' : 'Test failed'
        }
      }))

      if (result.passed) {
        push({ kind: 'success', message: 'Test passed!' })
      } else {
        push({ kind: 'error', message: 'Test failed. Check the output.' })
      }
    } catch (err: any) {
      setRunResults(prev => ({
        ...prev,
        [questionId]: {
          error: err?.message || 'Failed to run code',
          message: 'Execution error'
        }
      }))
      push({ kind: 'error', message: err?.message || 'Failed to execute code' })
    } finally {
      setIsRunning(false)
    }
  }

  const submitCode = async () => {
    if (!currentQuestion) return

    const src = code[currentQuestion.id] || ''
    const lang = language[currentQuestion.id] || 'python'

    if (!src.trim()) {
      push({ kind: 'error', message: 'Write your code first' })
      return
    }

    setIsSubmitting(true)
    try {
      const { apiFetch } = await import('../services/api')
      const result = await apiFetch('/api/submissions/submit/code', {
        method: 'POST',
        body: {
          assignment_id: assignmentId,
          question_id: currentQuestion.id,
          language: lang,
          code: src
        }
      })

      push({ kind: 'success', message: 'Code submitted successfully!' })
      
      // Update run results with test results from submission
      if (result.test_results) {
        setRunResults(prev => ({
          ...prev,
          [currentQuestion.id]: result.test_results
        }))
      }

      if (onComplete) {
        onComplete()
      }
    } catch (err: any) {
      push({ kind: 'error', message: err?.message || 'Failed to submit code' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div>Loading assignment...</div>
  }

  if (questions.length === 0) {
    return <div>No questions found for this assignment.</div>
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', maxHeight: '80vh' }}>
      {/* Questions Sidebar */}
      <div style={{ width: 300, borderRight: '1px solid #ddd', paddingRight: 16, overflowY: 'auto' }}>
        <h4 style={{ marginTop: 0 }}>Questions</h4>
        {questions.map((q, idx) => (
          <div
            key={q.id}
            onClick={() => setCurrentQuestionIndex(idx)}
            style={{
              padding: 12,
              marginBottom: 8,
              cursor: 'pointer',
              backgroundColor: idx === currentQuestionIndex ? '#f0f8ff' : '#fff',
              border: idx === currentQuestionIndex ? '2px solid #007bff' : '1px solid #ddd',
              borderRadius: 4
            }}
          >
            <div style={{ fontWeight: 600 }}>Question {idx + 1}</div>
            <div style={{ fontSize: '0.9em', color: '#666' }}>{q.title}</div>
            {q.points && (
              <div style={{ fontSize: '0.85em', color: '#888', marginTop: 4 }}>
                Points: {q.points}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {currentQuestion && (
          <>
            {/* Question Details */}
            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #ddd', overflowY: 'auto', maxHeight: '30vh' }}>
              <h3 style={{ marginTop: 0 }}>{currentQuestion.title}</h3>
              <div style={{ marginBottom: 12, whiteSpace: 'pre-wrap' }}>
                {currentQuestion.description}
              </div>
              {currentQuestion.constraints && (
                <div style={{ marginBottom: 12, padding: 8, backgroundColor: '#fff3cd', borderRadius: 4 }}>
                  <strong>Constraints:</strong> {currentQuestion.constraints}
                </div>
              )}

              {/* Sample Test Cases */}
              {sampleTestCases.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <strong>Sample Test Cases:</strong>
                  {sampleTestCases.map((tc, idx) => (
                    <div key={idx} style={{ marginTop: 8, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
                      <div style={{ marginBottom: 4 }}>
                        <strong>Input:</strong>
                        <pre style={{ margin: '4px 0', padding: 8, backgroundColor: '#fff', borderRadius: 4, fontSize: '0.9em' }}>
                          {tc.input_text || '(See input file)'}
                        </pre>
                      </div>
                      <div>
                        <strong>Expected Output:</strong>
                        <pre style={{ margin: '4px 0', padding: 8, backgroundColor: '#fff', borderRadius: 4, fontSize: '0.9em' }}>
                          {tc.expected_text || '(See output file)'}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Code Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <select
                  className="select"
                  value={currentLanguage}
                  onChange={(e) => setLanguage(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                  style={{ width: 150 }}
                >
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                  <option value="javascript">JavaScript</option>
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn"
                    onClick={() => runCode(currentQuestion.id)}
                    disabled={isRunning || !currentCode.trim()}
                  >
                    {isRunning ? 'Running...' : 'Run Code'}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={submitCode}
                    disabled={isSubmitting || !currentCode.trim()}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden' }}>
                <textarea
                  value={currentCode}
                  onChange={(e) => setCode(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: 12,
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    border: 'none',
                    resize: 'none',
                    outline: 'none'
                  }}
                  placeholder="Write your code here..."
                />
              </div>

              {/* Run Results */}
              {runResults[currentQuestion.id] && (
                <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
                  <strong>Execution Result:</strong>
                  {runResults[currentQuestion.id].error ? (
                    <div style={{ color: 'red', marginTop: 8 }}>
                      {runResults[currentQuestion.id].error}
                    </div>
                  ) : (
                    <>
                      {runResults[currentQuestion.id].passed !== null && (
                        <div style={{ marginTop: 8, fontWeight: 600, color: runResults[currentQuestion.id].passed ? 'green' : 'red' }}>
                          {runResults[currentQuestion.id].passed ? '✓ Test Passed' : '✗ Test Failed'}
                        </div>
                      )}
                      {runResults[currentQuestion.id].stdout && (
                        <div style={{ marginTop: 8 }}>
                          <strong>Output:</strong>
                          <pre style={{ margin: '4px 0', padding: 8, backgroundColor: '#fff', borderRadius: 4, fontSize: '0.9em', whiteSpace: 'pre-wrap' }}>
                            {runResults[currentQuestion.id].stdout}
                          </pre>
                        </div>
                      )}
                      {runResults[currentQuestion.id].stderr && (
                        <div style={{ marginTop: 8, color: 'red' }}>
                          <strong>Errors:</strong>
                          <pre style={{ margin: '4px 0', padding: 8, backgroundColor: '#fff', borderRadius: 4, fontSize: '0.9em', whiteSpace: 'pre-wrap' }}>
                            {runResults[currentQuestion.id].stderr}
                          </pre>
                        </div>
                      )}
                      {runResults[currentQuestion.id].compile_output && (
                        <div style={{ marginTop: 8, color: 'orange' }}>
                          <strong>Compilation:</strong>
                          <pre style={{ margin: '4px 0', padding: 8, backgroundColor: '#fff', borderRadius: 4, fontSize: '0.9em', whiteSpace: 'pre-wrap' }}>
                            {runResults[currentQuestion.id].compile_output}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

