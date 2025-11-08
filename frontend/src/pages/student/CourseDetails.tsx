import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { courses } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'
import { getUserCourses } from '../../data/userCourses'
import { addCustomAssignment } from '../../data/courseOverlays'
import { addSubmission } from '../../data/submissions'
import './CourseDetails.css'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../services/api'
import { type ProgressRow } from '../../services/progress'
import QuizCreator from '../../components/QuizCreator'
import Chatbot from '../../components/Chatbot'
import { listDiscussionMessages, postDiscussionMessage, type DiscussionMessage } from '../../services/discussion'

// Add CodeQuestion type for frontend usage
interface CodeQuestion {
  id: string | number
  title?: string
  description?: string
  constraints?: string
  sample_input?: string
  sample_output?: string
  test_input?: string
  expected_output?: string
  test_cases?: Array<{
    id?: number
    is_sample?: boolean
    input_text?: string
    expected_text?: string
    input_path?: string
    expected_path?: string
  }>
}

// Teacher Code Submission Viewer Component
function TeacherCodeSubmissionViewer({ submission, onGrade, push }: { submission: any; onGrade: (score: number, feedback: string) => void; push: any }) {
  const [showGradingForm, setShowGradingForm] = useState(false)
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [runningTestCases, setRunningTestCases] = useState<Record<string, boolean>>({})
  const [testCaseResults, setTestCaseResults] = useState<Record<string, any>>({})
  const [questionDetails, setQuestionDetails] = useState<Record<string, any>>({})

  // Load question details for each code submission
  useEffect(() => {
    const loadQuestionDetails = async () => {
      const details: Record<string, any> = {}

      for (const codeSub of submission.code || []) {
        // question_id should now be available from the backend response
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
      loadQuestionDetails()
    }
  }, [submission])

  const runHiddenTestCases = async (codeSub: any, questionId: number) => {
    if (!codeSub.code || !codeSub.language) {
      push({ kind: 'error', message: 'No code found for this question' })
      return
    }

    setRunningTestCases(prev => ({ ...prev, [codeSub.id]: true }))
    try {
      // Fetch all test cases for this question (including hidden ones)
      const question = await apiFetch(`/api/code-questions/${questionId}`)
      const allTestCases = question.test_cases || []
      const hiddenTestCases = allTestCases.filter((tc: any) => !tc.is_sample)

      if (hiddenTestCases.length === 0) {
        push({ kind: 'info', message: 'No hidden test cases found for this question' })
        setRunningTestCases(prev => ({ ...prev, [codeSub.id]: false }))
        return
      }

      // Run each hidden test case
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
      {/* Grading Form */}
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

      {/* Grade Button */}
      {!showGradingForm && (
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => setShowGradingForm(true)}>
            Grade Assignment
          </button>
        </div>
      )}

      {/* Display all questions */}
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

            {/* Question Description */}
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

            {/* Code Display */}
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

            {/* Test Case Results */}
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

            {/* Summary */}
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

function loadLocalCodeQuestions(courseId: string) : CodeQuestion[] {
  try {
    const raw = localStorage.getItem(`codeQuestions:${courseId}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function saveLocalCodeQuestions(courseId: string, items: CodeQuestion[]) {
  try { localStorage.setItem(`codeQuestions:${courseId}`, JSON.stringify(items)) } catch {}
}

function BackendSubmissions({ assignments, onViewCode }: { assignments: any[]; onViewCode?: (submission: any) => void }) {
  const [assignmentId, setAssignmentId] = useState<string>('')
  const [items, setItems] = useState<any[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const load = async (id: string) => {
    if (!id) { setItems([]); setSelectedAssignment(null); return }
    const data = await apiFetch<{ submissions: any[] }>(`/api/assignments/${id}/submissions`)
    setItems(data.submissions || [])
    const assn = assignments.find((a: any) => String(a.id) === String(id))
    setSelectedAssignment(assn)
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select className="select" value={assignmentId} onChange={(e) => { setAssignmentId(e.target.value); void load(e.target.value) }}>
          <option value="">Select assignment</option>
          {assignments.map((a: any) => (<option key={a.id} value={a.id}>{a.title} ({a.assignment_type || 'file'})</option>))}
        </select>
      </div>
      {items.length === 0 ? <p className="muted">No submissions yet.</p> : (
        <ul className="list">
          {items.map((s) => (
            <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1 }}>
                {selectedAssignment?.assignment_type === 'code' ? '💻 Code submission' : (s.files?.[0]?.filename || 'file')} — {s.student_name || s.student_email}
              </span>
              {selectedAssignment?.assignment_type === 'code' && onViewCode && (
                <button className="btn btn-primary" onClick={async () => {
                  // Fetch full submission details including code
                  const detail = await apiFetch<{ submission: any }>(`/api/submissions/${s.id}`)
                  onViewCode(detail.submission)
                }}>View Code</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BackendGrading({ assignments, onSave }: { assignments: any[]; onSave: (sid: string, letter: string) => void }) {
  const [assignmentId, setAssignmentId] = useState<string>('')
  const [items, setItems] = useState<any[]>([])
  const [grades, setGrades] = useState<Record<string, string>>({})
  const load = async (id: string) => {
    if (!id) { setItems([]); return }
    const data = await apiFetch<{ submissions: any[] }>(`/api/assignments/${id}/submissions`)
    setItems(data.submissions || [])
  }
  const save = async (sid: string) => {
    const letter = grades[sid]
    if (!letter) return
    const map: Record<string, number> = { A: 95, B: 85, C: 75, D: 65, E: 55, F: 45 }
    await apiFetch('/api/submissions/grade', { method: 'POST', body: { submission_id: Number(sid), score: map[letter] ?? 0, feedback: null } })
    onSave(sid, letter)
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select className="select" value={assignmentId} onChange={(e) => { setAssignmentId(e.target.value); void load(e.target.value) }}>
          <option value="">Select assignment</option>
          {assignments.map((a: any) => (<option key={a.id} value={a.id}>{a.title}</option>))}
        </select>
      </div>
      {items.length === 0 ? <p className="muted">No submissions to grade.</p> : (
        <ul className="list">
          {items.map((s) => (
            <li key={s.id}>
              {s.files?.[0]?.filename || 'file'} — {s.student_name || s.student_email}
              <select className="select" style={{ marginLeft: 8 }} value={grades[s.id] ?? ''} onChange={(e) => setGrades((m) => ({ ...m, [s.id]: e.target.value }))}>
                <option value="">Select grade</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
              </select>
              <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={() => void save(s.id)}>Save</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MenuTiny({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn" onClick={(e)=>{ e.stopPropagation(); setOpen((v)=>!v) }} aria-label="More">⋮</button>
      {open && (
        <div className="card" style={{ position: 'absolute', right: 0, marginTop: 4, zIndex: 10 }}>
          <button className="btn" onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete() }}>Delete</button>
        </div>
      )}
    </div>
  )
}

function groupBy<T, K extends keyof any>(list: T[], getKey: (item: T) => K): Record<K, T[]> {
  return list.reduce((acc, item) => {
    const k = getKey(item)
    ;(acc as any)[k] ||= []
    ;(acc as any)[k].push(item)
    return acc
  }, {} as Record<K, T[]>)
}

function StudentProgressEmbed() {
  const [rows, setRows] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      try {
        // Student progress: call /api/progress/me
        const r = await apiFetch<{ rows: ProgressRow[] }>('/api/progress/me')
        setRows(r.rows || [])
      } catch(e:any){ setError(e?.message||'Failed to load') }
      finally { setLoading(false) }
    })()
  }, [])
  const totalMax = rows.reduce((s, r)=> s + (r.max_score||0), 0)
  const totalScore = rows.reduce((s, r)=> s + (r.score||0), 0)
  const pct = totalMax>0 ? Math.round((totalScore/totalMax)*100) : 0
  const byType = groupBy(rows, (r)=> r.activity_type)
  return (
    <div>
      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{error}</div> : null}
      {!loading && rows.length===0 ? <p className="muted">No progress yet.</p> : (
        <>
          <div className="muted" style={{ marginBottom: 8 }}>Overall: {totalScore} / {totalMax} ({pct}%)</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{minWidth:240}}>Title</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Max</th>
                  <th>Due</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byType).map(([type, list]) => (
                  list.map((r) => (
                    <tr key={`${type}-${r.activity_id}`}>
                      <td>{r.activity_title || `#${r.activity_id}`}</td>
                      <td>{type}</td>
                      <td>{r.status || (r.score!=null ? 'Submitted' : 'Pending')}</td>
                      <td>{r.score ?? '-'}</td>
                      <td>{r.max_score ?? '-'}</td>
                      <td>{r.due_at ? new Date(r.due_at).toLocaleString() : '-'}</td>
                      <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function CourseProgressEmbed({ offeringId }: { offeringId: string }) {
  const [rows, setRows] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      try {
        // Staff progress: call /api/progress/course/:offeringId
        const r = await apiFetch<{ rows: ProgressRow[] }>(`/api/progress/course/${offeringId}`)
        setRows(r.rows || [])
      } catch(e:any){ setError(e?.message||'Failed to load') }
      finally { setLoading(false) }
    })()
  }, [offeringId])
  const byStudent = useMemo(() => groupBy(rows, (r)=> String(r.student_id||'unknown')), [rows])
  return (
    <div>
      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{error}</div> : null}
      {Object.keys(byStudent).length===0 && !loading ? <p className="muted">No data.</p> : (
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
          {Object.entries(byStudent).map(([sid, items]) => {
            const name = items[0]?.student_name || items[0]?.student_email || `Student #${sid}`
            const totalMax = items.reduce((s, r) => s + (r.max_score || 0), 0)
            const totalScore = items.reduce((s, r) => s + (r.score || 0), 0)
            const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
            const byType = groupBy(items, (r)=> r.activity_type)
            return (
              <section key={sid} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ margin: 0 }}>{name}</h4>
                  <div className="muted">{totalScore} / {totalMax} ({pct}%)</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{minWidth:240}}>Title</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Max</th>
                        <th>Due</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(byType).map(([type, list]) => (
                        list.map((r) => (
                          <tr key={`${sid}-${type}-${r.activity_id}`}>
                            <td>{r.activity_title || `#${r.activity_id}`}</td>
                            <td>{type}</td>
                            <td>{r.status || (r.score!=null ? 'Submitted' : 'Pending')}</td>
                            <td>{r.score ?? '-'}</td>
                            <td>{r.max_score ?? '-'}</td>
                            <td>{r.due_at ? new Date(r.due_at).toLocaleString() : '-'}</td>
                            <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '-'}</td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CourseDetails() {
  const { courseId } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'present' | 'past' | 'pyq' | 'notes' | 'quizzes' | 'quizzes_submitted' | 'manage' | 'submissions' | 'grading' | 'progress' | 'discussion' | 'chatbot' | 'pdfchat'>('present')
  const [assignmentCreationType, setAssignmentCreationType] = useState<'selection' | 'code' | 'quiz' | 'pdf'>('selection')
  const isBackend = !!courseId && /^\d+$/.test(courseId)
  const toast = useToast()
  const push = (opts: { kind?: 'success' | 'error' | string; message?: string }) => {
    if (toast && typeof (toast as any).push === 'function') {
      (toast as any).push(opts)
    } else {
      console.log(opts)
    }
  }

  // Backend data states
  const [backendAssignments, setBackendAssignments] = useState<any[]>([])
  const [backendPYQ, setBackendPYQ] = useState<any[]>([])
  const [backendNotes, setBackendNotes] = useState<any[]>([])
  const [backendQuizzes, setBackendQuizzes] = useState<any[]>([])
  const [myQuizAttempts, setMyQuizAttempts] = useState<any[]>([])
  const [mySubmissions, setMySubmissions] = useState<any[]>([]) // Track student's submissions
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('')
  const [discussionMessages, setDiscussionMessages] = useState<DiscussionMessage[]>([])
  const [discussionLoading, setDiscussionLoading] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState('')

  const course = useMemo(() => {
    if (!courseId) return undefined
    if (/^\d+$/.test(courseId)) {
      // backend mode uses offeringId; we won't have local course meta
      return { id: courseId, title: `Offering #${courseId}`, description: 'Backend course offering', assignmentsPast: [], assignmentsPresent: [], pyq: [], notes: [] }
    }
    const fromDefault = courses.find((c) => c.id === courseId)
    if (fromDefault) return fromDefault
    if (!user) return undefined
    const mine = getUserCourses(user.id)
    return mine.find((c) => c.id === courseId)
  }, [courseId, user])

  // Compute present assignments (not past due date)
  const allPresentAssignments = useMemo(() => {
    if (isBackend) {
      return backendAssignments.filter((a: any) => {
        if (!a.due_at) return true
        return new Date(a.due_at) >= new Date()
      })
    }
    return course?.assignmentsPresent || []
  }, [isBackend, backendAssignments, course])

  // For students: filter out submitted assignments and combine with unsubmitted quizzes
  const presentAssignments = useMemo(() => {
    if (user?.role !== 'student') {
      return allPresentAssignments
    }

    if (!isBackend) {
      return allPresentAssignments
    }

    // Get set of submitted assignment IDs
    const submittedAssignmentIds = new Set(
      mySubmissions.map((s: any) => String(s.assignment_id))
    )

    // Get set of attempted quiz IDs
    const attemptedQuizIds = new Set(
      (myQuizAttempts || []).map((a: any) => String(a.quiz_id))
    )

    // Filter assignments: only show unsubmitted ones
    const unsubmittedAssignments = allPresentAssignments.filter((a: any) => {
      return !submittedAssignmentIds.has(String(a.id))
    })

    // Get unsubmitted quizzes and convert them to assignment-like objects
    const unsubmittedQuizzes = (backendQuizzes || [])
      .filter((q: any) => !attemptedQuizIds.has(String(q.id)))
      .map((q: any) => ({
        id: `quiz_${q.id}`, // Prefix to avoid ID conflicts
        title: q.title,
        assignment_type: 'quiz',
        due_at: q.end_at || q.due_at,
        release_at: q.start_at,
        is_quiz: true,
        quiz_id: q.id,
        quiz_data: q
      }))

    // Combine unsubmitted assignments and quizzes
    return [...unsubmittedAssignments, ...unsubmittedQuizzes]
  }, [allPresentAssignments, mySubmissions, myQuizAttempts, backendQuizzes, user?.role, isBackend])

  const [file, setFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const submitAssignment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !courseId) return alert('Please choose a file to upload!')
    // Record submission for teacher/TA views
    addSubmission(courseId, user?.name ?? 'Student', file.name)
    setTimeout(() => {
      alert(`Submitted ${file.name} for ${course?.title}`)
      setFile(null)
    }, 200)
  }

  // Code submission states
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const [codeAssignmentId, setCodeAssignmentId] = useState<string>('')
  const [viewingCodeSubmission, setViewingCodeSubmission] = useState<any>(null)

  // --- Added states for code-question management & editors ---
  const [codeQuestions, setCodeQuestions] = useState<CodeQuestion[]>(() => loadLocalCodeQuestions(courseId ?? ''))
  const [newCodeQ, setNewCodeQ] = useState<CodeQuestion>({
    id: Date.now().toString(), title: '', description: '', constraints: '', sample_input: '', sample_output: '', test_input: '', expected_output: ''
  })
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Record<string, boolean>>({})
  const [selectedCodeAssignment, setSelectedCodeAssignment] = useState<any>(null)
  const [codeEditor, setCodeEditor] = useState<Record<string, string>>({})
  const [codeLang, setCodeLang] = useState<Record<string, string>>({})
  const [runResults, setRunResults] = useState<Record<string, any>>({})
  const [isRunningCode, setIsRunningCode] = useState<Record<string, boolean>>({})
  const [savedQuestions, setSavedQuestions] = useState<Record<string, boolean>>({}) // Track which questions have been saved
  const [isSavingCode, setIsSavingCode] = useState<Record<string, boolean>>({}) // Track saving state per question
  const [tabInternal, setTabInternal] = useState<string>('')

  // Load code questions from backend or local storage
  useEffect(() => {
    if (!courseId) return
    if (isBackend) {
      // Load from backend API
      (async () => {
        try {
          const questions = await apiFetch<CodeQuestion[]>(`/api/courses/${courseId}/code-questions`)
          setCodeQuestions(questions || [])
        } catch (err: any) {
          console.error('Failed to load code questions:', err)
          // Fallback to empty array
          setCodeQuestions([])
        }
      })()
    } else {
      // Load from local storage
      setCodeQuestions(loadLocalCodeQuestions(courseId))
    }
  }, [courseId, isBackend])

  // Submit code assignment (backend endpoint assumed; fallback to localStorage)
  const submitCodeAssignment = async () => {
    if (!selectedCodeAssignment) return push({ kind: 'error', message: 'No code assignment selected' })
    // build answers payload
    const answers = Object.entries(codeEditor).reduce<Record<string, any>>((acc, [qid, src]) => {
      acc[qid] = { source_code: src, language: codeLang[qid] ?? 'python' }
      return acc
    }, {})

    if (isBackend) {
      try {
        await apiFetch('/api/submissions/submit/code', {
          method: 'POST',
          body: {
            assignment_id: Number(selectedCodeAssignment.id),
            answers
          }
        })
        push({ kind: 'success', message: 'Code submitted' })
        setShowCodeEditor(false)
        // Reload submissions to update the list
        if (user?.role === 'student' && user?.id && courseId) {
          try {
            const submissions = await apiFetch<any[]>(`/api/student/courses/${courseId}/submissions`)
            setMySubmissions(submissions || [])
          } catch {}
        }
      } catch (err: any) {
        push({ kind: 'error', message: err?.message || 'Submission failed' })
      }
      return
    }

    // Local mode: persist to localStorage
    try {
      const key = `localCodeSubmissions:${courseId}`
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      existing.push({
        id: Date.now().toString(),
        assignment_id: selectedCodeAssignment.id,
        student_name: user?.name ?? 'Student',
        code: codeEditor,
        langs: codeLang,
        submitted_at: new Date().toISOString()
      })
      localStorage.setItem(key, JSON.stringify(existing))
      push({ kind: 'success', message: 'Code saved locally' })
      setShowCodeEditor(false)
    } catch (err: any) {
      push({ kind: 'error', message: err?.message || 'Failed to save locally' })
    }
  }

  const [newAssnTitle, setNewAssnTitle] = useState('')
  const [newAssnDesc, setNewAssnDesc] = useState('')
  const [newAssnType, setNewAssnType] = useState<'file' | 'code' | 'link'>('file')
  const [newAssnRelease, setNewAssnRelease] = useState('')
  const [newAssnDue, setNewAssnDue] = useState('')
  const [newAssnMax, setNewAssnMax] = useState('100')
  const [newAssnMulti, setNewAssnMulti] = useState(false)
  const addAssn = async () => {
    if (!courseId) return
    const title = newAssnTitle.trim()
    if (!title) return
    if (isBackend) {
      // create real assignment with extended fields
      await apiFetch('/api/assignments', {
        method: 'POST',
        body: {
          course_offering_id: Number(courseId),
          title,
          description: newAssnDesc,
          assignment_type: newAssnType,
          release_at: newAssnRelease || null,
          due_at: newAssnDue || null,
          max_score: Number(newAssnMax) || 100,
          allow_multiple_submissions: newAssnMulti,
        },
      })
      const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
      setBackendAssignments(data)
      push({ kind: 'success', message: 'Assignment added' })
    } else {
      addCustomAssignment(courseId, title, newAssnDue.trim() || undefined)
    }
    // reset
    setNewAssnTitle('')
    setNewAssnDesc('')
    setNewAssnType('file')
    setNewAssnRelease('')
    setNewAssnDue('')
    setNewAssnMax('100')
    setNewAssnMulti(false)
    setTab('present')
  }

  // create a code assignment (teacher) using selected code question ids
  const createCodeAssignment = async () => {
    if (!courseId) return push({ kind: 'error', message: 'Course missing' })
    const title = newAssnTitle.trim()
    if (!title) return push({ kind: 'error', message: 'Title required' })
    const qids = Object.entries(selectedQuestionIds).filter(([,v])=>v).map(([k])=>k)
    if (qids.length === 0) return push({ kind: 'error', message: 'Select at least one question' })
    
    if (isBackend) {
      try {
        // Convert question IDs to numbers (backend expects numeric IDs)
        const questionIds = qids.map(id => {
          const numId = Number(id)
          if (isNaN(numId)) {
            throw new Error(`Invalid question ID: ${id}`)
          }
          return numId
        })

        await apiFetch('/api/assignments', {
          method: 'POST',
          body: {
            course_offering_id: Number(courseId),
            title,
            description: newAssnDesc || null,
            assignment_type: 'code',
            question_ids: questionIds,
            release_at: newAssnRelease || null,
            due_at: newAssnDue || null,
            max_score: Number(newAssnMax) || 100,
            allow_multiple_submissions: newAssnMulti || false
          }
        })
        
        // Refresh assignments list
        const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
        setBackendAssignments(data)
        push({ kind: 'success', message: 'Code assignment created successfully' })
        
        // Reset form
        setNewAssnTitle('')
        setNewAssnDesc('')
        setNewAssnRelease('')
        setNewAssnDue('')
        setNewAssnMax('100')
        setNewAssnMulti(false)
        setSelectedQuestionIds({})
        setAssignmentCreationType('selection')
        setTab('present')
      } catch (err:any) {
        console.error('Error creating code assignment:', err)
        push({ kind: 'error', message: err?.message || 'Failed to create assignment. Check console for details.' })
      }
    } else {
      // local mode: create custom assignment and embed question ids in localStorage mapping
      const assn = addCustomAssignment(courseId, title, newAssnDue.trim() || undefined)
      // store mapping of custom code assignments
      const key = `customCodeAssignments:${courseId}`
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      existing.push({ id: assn.id ?? Date.now().toString(), title, question_ids: qids })
      localStorage.setItem(key, JSON.stringify(existing))
      push({ kind: 'success', message: 'Local code assignment created' })
      
      // Reset form
      setNewAssnTitle('')
      setNewAssnDesc('')
      setSelectedQuestionIds({})
      setAssignmentCreationType('selection')
      setTab('present')
    }
  }

  // Teacher: save a new code question locally (or POST to backend)
  const saveCodeQuestion = async () => {
    if (!courseId) return push({ kind: 'error', message: 'Course missing' })
    
    // Validate required fields
    if (!newCodeQ.title?.trim()) {
      return push({ kind: 'error', message: 'Question title is required' })
    }
    if (!newCodeQ.description?.trim()) {
      return push({ kind: 'error', message: 'Question description is required' })
    }
    
    if (isBackend) {
      try {
        // Prepare test cases from the form fields
        const testCases = []
        
        // Add sample test case if provided
        if (newCodeQ.sample_input || newCodeQ.sample_output) {
          testCases.push({
            is_sample: true,
            input_text: newCodeQ.sample_input || null,
            expected_text: newCodeQ.sample_output || null
          })
        }
        
        // Add hidden test case if provided
        if (newCodeQ.test_input || newCodeQ.expected_output) {
          testCases.push({
            is_sample: false,
            input_text: newCodeQ.test_input || null,
            expected_text: newCodeQ.expected_output || null
          })
        }
        
        // Prepare request body (course_offering_id is optional, used for filtering only)
        const requestBody: any = { 
          title: newCodeQ.title,
          description: newCodeQ.description,
          constraints: newCodeQ.constraints || null
        }
        
        // Only include test_cases if we have at least one
        if (testCases.length > 0) {
          requestBody.test_cases = testCases
        }
        
        console.log('Creating code question with body:', requestBody)
        
        // Create the question
        const created = await apiFetch('/api/code-questions', { 
          method: 'POST', 
          body: requestBody
        })
        
        console.log('Question created:', created)
        
        // Reload questions from backend
        try {
          const updated = await apiFetch<any[]>(`/api/courses/${courseId}/code-questions`)
          setCodeQuestions(updated || [])
        } catch (reloadErr: any) {
          console.warn('Failed to reload questions, but question was created:', reloadErr)
          // Still show success even if reload fails
        }
        
        push({ kind: 'success', message: 'Question saved successfully' })
        
        // Reset form
        setNewCodeQ({ 
          id: Date.now().toString(), 
          title: '', 
          description: '', 
          constraints: '', 
          sample_input: '', 
          sample_output: '', 
          test_input: '', 
          expected_output: '' 
        })
      } catch (err:any) {
        console.error('Error saving code question:', err)
        
        // Provide more helpful error messages
        let errorMessage = 'Failed to save question'
        if (err?.message) {
          if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            errorMessage = 'Cannot connect to server. Please check if the backend server is running on http://localhost:4000'
          } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
            errorMessage = 'Authentication failed. Please log in again.'
          } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
            errorMessage = 'You do not have permission to create code questions. Only faculty, TA, or admin can create questions.'
          } else {
            errorMessage = err.message
          }
        }
        
        push({ kind: 'error', message: errorMessage })
      }
    } else {
      // local mode
      const item = { ...newCodeQ, id: newCodeQ.id || Date.now().toString() }
      const updatedLocal = [...codeQuestions.filter(q=>String(q.id)!==String(item.id)), item]
      setCodeQuestions(updatedLocal)
      saveLocalCodeQuestions(courseId, updatedLocal)
      setNewCodeQ({ 
        id: Date.now().toString(), 
        title: '', 
        description: '', 
        constraints: '', 
        sample_input: '', 
        sample_output: '', 
        test_input: '', 
        expected_output: '' 
      })
      push({ kind: 'success', message: 'Question saved locally' })
    }
  }

  // Student: start attempting a code assignment (load questions then switch to attempt tab)
  const startCodeAttempt = async (assignment: any) => {
    if (!assignment) return
    let qs: CodeQuestion[] = []
    if (isBackend) {
      try {
        qs = await apiFetch<CodeQuestion[]>(`/api/assignments/${assignment.id}/questions`)
      } catch (err:any) {
        push({ kind: 'error', message: err?.message || 'Failed to load questions' })
      }
    } else {
      // local: read mapping and load questions from local storage
      const key = `customCodeAssignments:${courseId}`
      const mapping = JSON.parse(localStorage.getItem(key) || '[]').find((x:any)=>String(x.id)===String(assignment.id))
      const ids = mapping?.question_ids || []
      const all = loadLocalCodeQuestions(courseId!)
      qs = all.filter(q=>ids.includes(q.id))
    }
    setSelectedCodeAssignment({ ...assignment, questions: qs })
    // prefill editors for each question
    const editors: Record<string,string> = {}
    const langs: Record<string,string> = {}
    qs.forEach(q => { editors[q.id] = ''; langs[q.id] = 'python' })
    setCodeEditor(editors)
    setCodeLang(langs)
    setRunResults({})
    setSavedQuestions({}) // Reset saved questions when starting new attempt
    setTabInternal('code_attempt')
    setTab('quizzes') // keep outer tab consistent (optional)
  }

  // run code for a question using judge endpoint (uses SAMPLE test cases, not hidden ones)
  const runCodeForQuestion = async (q: CodeQuestion) => {
    const src = codeEditor[q.id] ?? ''
    const lang = codeLang[q.id] ?? 'python'
    if (!src.trim()) return push({ kind: 'error', message: 'Write your code first' })
    
    // Set loading state for this question
    setIsRunningCode(prev => ({ ...prev, [q.id]: true }))
    
    // Clear previous results for this question
    setRunResults(prev => {
      const updated = { ...prev }
      delete updated[q.id]
      return updated
    })
    
    // Get sample test case (for "Run Code", students should test against sample cases)
    let sampleInput = ''
    let sampleOutput = ''
    
    // First try to get from test_cases array (from backend)
    if (q.test_cases && Array.isArray(q.test_cases)) {
      const sampleCase = q.test_cases.find((tc: any) => tc.is_sample === true)
      if (sampleCase) {
        sampleInput = sampleCase.input_text || ''
        sampleOutput = sampleCase.expected_text || ''
      }
    }
    
    // Fallback to direct properties (for local mode or older format)
    if (!sampleInput && q.sample_input) {
      sampleInput = q.sample_input
      sampleOutput = q.sample_output || ''
    }
    
    if (!sampleInput) {
      setIsRunningCode(prev => ({ ...prev, [q.id]: false }))
      push({ kind: 'error', message: 'No sample test case available for this question' })
      return
    }
    
    try {
      const payload = { 
        source_code: src, 
        language: lang, 
        stdin: sampleInput // Use sample input, not hidden test input
      }
      const res = await apiFetch('/api/judge', { method: 'POST', body: payload })
      const stdout = (res.stdout ?? '').toString()
      const stderr = (res.stderr ?? '').toString()
      const compileOutput = (res.compile_output ?? '').toString()
      
      // Check if output matches expected sample output
      const ok = stdout.trim() === sampleOutput.trim()
      
      // Determine status message
      let message = 'Failed'
      if (res.status) {
        if (res.status.id === 3) {
          // Accepted
          message = ok ? 'Passed' : 'Failed - Output mismatch'
        } else if (res.status.id === 4) {
          // Wrong Answer
          message = 'Failed - Wrong Answer'
        } else if (res.status.id === 5) {
          // Time Limit Exceeded
          message = 'Failed - Time Limit Exceeded'
        } else if (res.status.id === 6) {
          // Compilation Error
          message = 'Failed - Compilation Error'
        } else if (res.status.id === 7) {
          // Runtime Error
          message = 'Failed - Runtime Error'
        } else {
          message = res.status.description || 'Failed'
        }
      }
      
      setRunResults(r => ({ 
        ...r, 
        [q.id]: { 
          ok, 
          stdout, 
          stderr: stderr || compileOutput, 
          message,
          status: res.status,
          expected: sampleOutput,
          actual: stdout
        } 
      }))
      
      if (ok) {
        push({ kind: 'success', message: 'Sample test case passed!' })
      } else {
        push({ kind: 'error', message: `Sample test case failed. Expected: "${sampleOutput}", Got: "${stdout}"` })
      }
    } catch (err:any) {
      setRunResults(r => ({ 
        ...r, 
        [q.id]: { 
          ok: false, 
          message: err?.message || 'Judge failed',
          error: err?.message || 'Execution error'
        } 
      }))
      push({ kind: 'error', message: err?.message || 'Judge service unavailable' })
    } finally {
      // Clear loading state
      setIsRunningCode(prev => ({ ...prev, [q.id]: false }))
    }
  }

  // Load backend data once per offering id
  useEffect(() => {
    let cancelled = false
    if (!isBackend || !courseId) return
    ;(async () => {
      try { const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`); if (!cancelled) setBackendAssignments(data) } catch {}
      try { const pyq = await apiFetch<any[]>(`/api/courses/${courseId}/pyqs`); if (!cancelled) setBackendPYQ(pyq) } catch {}
      try { const notes = await apiFetch<any[]>(`/api/courses/${courseId}/notes`); if (!cancelled) setBackendNotes(notes) } catch {}
        // quizzes list for offering + my attempts
        try {
          const quizzesMod = await import('../../services/quizzes')
          const quizzes = await quizzesMod.listCourseQuizzes(Number(courseId))
          if (!cancelled) setBackendQuizzes(quizzes)
          if (!cancelled && user?.role === 'student' && user?.id) {
            const attempts = await quizzesMod.getQuizAttempts(Number(user.id))
            if (!cancelled) setMyQuizAttempts(attempts)
          }
        } catch {}
      // Load student's submissions to track which assignments have been submitted
      if (user?.role === 'student' && user?.id) {
        try {
          const submissions = await apiFetch<any[]>(`/api/student/courses/${courseId}/submissions`)
          if (!cancelled) setMySubmissions(submissions || [])
        } catch (err) {
          console.error('Failed to load student submissions:', err)
          if (!cancelled) setMySubmissions([])
        }
      }
      // Load discussion messages
      if (isBackend && courseId) {
        try {
          const messages = await listDiscussionMessages(courseId)
          if (!cancelled) setDiscussionMessages(messages || [])
        } catch (err) {
          console.error('Failed to load discussion messages:', err)
          if (!cancelled) setDiscussionMessages([])
        }
      }
    })()
    return () => { cancelled = true }
  }, [courseId, isBackend, user?.id, user?.role])

  // Load discussion messages when tab is active
  useEffect(() => {
    if (tab === 'discussion' && isBackend && courseId) {
      setDiscussionLoading(true)
      listDiscussionMessages(courseId)
        .then(messages => {
          setDiscussionMessages(messages || [])
        })
        .catch(err => {
          console.error('Failed to load discussion messages:', err)
          push({ kind: 'error', message: 'Failed to load discussion messages' })
        })
        .finally(() => {
          setDiscussionLoading(false)
        })
    }
  }, [tab, isBackend, courseId])

  // Handle posting a new discussion message
  const handlePostMessage = async () => {
    if (!newPostContent.trim() || !courseId || !isBackend) return
    
    setDiscussionLoading(true)
    try {
      const result = await postDiscussionMessage(courseId, newPostContent.trim())
      if (result.message) {
        setDiscussionMessages(prev => [result.message, ...prev])
        setNewPostContent('')
        push({ kind: 'success', message: 'Message posted successfully' })
      }
    } catch (err: any) {
      console.error('Failed to post message:', err)
      push({ kind: 'error', message: err.message || 'Failed to post message' })
    } finally {
      setDiscussionLoading(false)
    }
  }

  // Handle posting a reply
  const handlePostReply = async (parentId: number) => {
    if (!replyContent.trim() || !courseId || !isBackend) return
    
    setDiscussionLoading(true)
    try {
      const result = await postDiscussionMessage(courseId, replyContent.trim(), parentId)
      if (result.message) {
        setDiscussionMessages(prev => [result.message, ...prev])
        setReplyContent('')
        setReplyingTo(null)
        push({ kind: 'success', message: 'Reply posted successfully' })
      }
    } catch (err: any) {
      console.error('Failed to post reply:', err)
      push({ kind: 'error', message: err.message || 'Failed to post reply' })
    } finally {
      setDiscussionLoading(false)
    }
  }

  // Organize messages into threads (top-level messages with their replies)
  const discussionThreads = useMemo(() => {
    const threads: DiscussionMessage[] = []
    const repliesMap = new Map<number, DiscussionMessage[]>()
    
    // Separate top-level messages from replies
    discussionMessages.forEach(msg => {
      if (msg.parent_id === null) {
        threads.push(msg)
      } else {
        if (!repliesMap.has(msg.parent_id)) {
          repliesMap.set(msg.parent_id, [])
        }
        repliesMap.get(msg.parent_id)!.push(msg)
      }
    })
    
    // Sort threads by created_at (newest first)
    threads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    // Sort replies by created_at (oldest first)
    repliesMap.forEach(replies => {
      replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    })
    
    return { threads, repliesMap }
  }, [discussionMessages])

  return (
    <>
      {/* Scoped styles to fix overlapping label/input fields on this page */}
      <style>{`
        .course-details-page .form {
          display: flex !important;
          flex-direction: column !important;
          gap: 16px !important;
        }
        .course-details-page .form .field {
          display: flex !important;
          flex-direction: column !important;
          gap: 8px !important;
          align-items: stretch !important;
          margin-bottom: 0 !important;
          position: relative !important;
        }
        .course-details-page .form .field .label {
          display: block !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          color: #374151 !important;
          margin-bottom: 8px !important;
          margin-top: 0 !important;
          padding: 0 !important;
          line-height: 1.4 !important;
          position: static !important;
          top: auto !important;
          left: auto !important;
          transform: none !important;
          order: -1 !important;
          z-index: 1 !important;
          pointer-events: none !important;
        }
        .course-details-page .form .field .input,
        .course-details-page .form .field textarea,
        .course-details-page .form .field .select {
          width: 100% !important;
          box-sizing: border-box !important;
          padding: 10px 12px !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          background: #ffffff !important;
          color: #111827 !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
          font-family: inherit !important;
          position: relative !important;
          z-index: 0 !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }
        .course-details-page .form .field .input:focus,
        .course-details-page .form .field textarea:focus,
        .course-details-page .form .field .select:focus {
          outline: none !important;
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
        }
        .course-details-page .form .field textarea {
          resize: vertical !important;
          min-height: 80px !important;
          font-family: inherit !important;
        }
        .course-details-page .form .field input[type="checkbox"] {
          width: auto !important;
          align-self: flex-start !important;
          margin-top: 4px !important;
          margin-right: 8px !important;
          cursor: pointer !important;
        }
        .course-details-page .form .field[style*="align-items: center"] {
          flex-direction: row !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .course-details-page .form .field[style*="align-items: center"] .label {
          margin-bottom: 0 !important;
          margin-right: 8px !important;
          order: 0 !important;
        }
      `}</style>
       
      <div className="course-details-page">
       <div className="container">
      <header className="topbar">
        <h2>
          {course?.title || 'Course'} - {user?.role.toUpperCase()}
        </h2>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>Back</button>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </header>

          <nav className="tabs">
            {user?.role === 'student' ? (
              <>
                <button className={tab === 'present' ? 'active' : ''} onClick={() => setTab('present')} aria-pressed={tab === 'present'}>
                  Assignments
                </button>
                <button className={tab === 'pyq' ? 'active' : ''} onClick={() => setTab('pyq')} aria-pressed={tab === 'pyq'}>
                  PYQ
                </button>
                <button className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')} aria-pressed={tab === 'notes'}>
                  Notes
                </button>
                {isBackend && (
                  <button className={tab === 'progress' ? 'active' : ''} onClick={() => setTab('progress')} aria-pressed={tab === 'progress'}>
                    Progress
                  </button>
                )}
                {isBackend && (
                  <button className={tab === 'discussion' ? 'active' : ''} onClick={() => setTab('discussion')} aria-pressed={tab === 'discussion'}>
                    Discussion
                  </button>
                )}
                {isBackend && (
                  <button className={tab === 'chatbot' ? 'active' : ''} onClick={() => setTab('chatbot')} aria-pressed={tab === 'chatbot'}>
                    AI Assistant
                  </button>
                )}
                {isBackend && (
                  <button className={tab === 'pdfchat' ? 'active' : ''} onClick={() => setTab('pdfchat')} aria-pressed={tab === 'pdfchat'}>
                    PDF Q&A
                  </button>
                )}
              </>
            ) : (
              <>
                <button className={tab === 'present' ? 'active' : ''} onClick={() => setTab('present')} aria-pressed={tab === 'present'}>
                  Assignments (Present)
                </button>
                <button className={tab === 'past' ? 'active' : ''} onClick={() => setTab('past')} aria-pressed={tab === 'past'}>
                  Assignments (Past)
                </button>
                <button className={tab === 'pyq' ? 'active' : ''} onClick={() => setTab('pyq')} aria-pressed={tab === 'pyq'}>
                  PYQ
                </button>
                <button className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')} aria-pressed={tab === 'notes'}>
                  Notes
                </button>
                {isBackend && (
                  <button className={tab === 'progress' ? 'active' : ''} onClick={() => setTab('progress')} aria-pressed={tab === 'progress'}>
                    Progress
                  </button>
                )}
                {isBackend && (
                  <button className={tab === 'discussion' ? 'active' : ''} onClick={() => setTab('discussion')} aria-pressed={tab === 'discussion'}>
                    Discussion
                  </button>
                )}
                {isBackend && (
                  <button className={tab === 'chatbot' ? 'active' : ''} onClick={() => setTab('chatbot')} aria-pressed={tab === 'chatbot'}>
                    AI Assistant
                  </button>
                )}
                {isBackend && (
                  <button className={tab === 'pdfchat' ? 'active' : ''} onClick={() => setTab('pdfchat')} aria-pressed={tab === 'pdfchat'}>
                    PDF Q&A
                  </button>
                )}
              </>
            )}
        {user?.role === 'teacher' && (
              <>
                <button className={tab === 'manage' ? 'active' : ''} onClick={() => setTab('manage')} aria-pressed={tab === 'manage'}>
                  Manage Assignment
                </button>
                <button className={tab === 'submissions' ? 'active' : ''} onClick={() => setTab('submissions')} aria-pressed={tab === 'submissions'}>
                  Submissions
                </button>
              </>
            )}
            {user?.role === 'ta' && (
              <button className={tab === 'grading' ? 'active' : ''} onClick={() => setTab('grading')} aria-pressed={tab === 'grading'}>
                Grading
              </button>
            )}
      </nav>

          {tab === 'present' && (
            <section className="card">
              <h3>{user?.role === 'student' ? 'Assignments & Quizzes' : 'Open Assignments'}</h3>
              {user?.role === 'student' && presentAssignments.length === 0 && (
                <p className="muted">No unsubmitted assignments or quizzes available.</p>
              )}
              <ul className="list">
                {presentAssignments.map((a: any) => (
                  <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1 }}>
                      {a.title} 
                      {a.due_at ? ` (Due: ${new Date(a.due_at).toLocaleString()})` : ''}
                      {a.assignment_type && (
                        <span style={{ marginLeft: 8, fontSize: '0.9em', color: '#6b7280' }}>
                          [{a.assignment_type === 'code' ? '💻 Code' : a.assignment_type === 'quiz' ? '📝 Quiz' : a.assignment_type === 'file' ? '📄 PDF' : a.assignment_type}]
                        </span>
                      )}
                      {a.is_quiz && (
                        <span style={{ marginLeft: 8, fontSize: '0.9em', color: '#6b7280' }}>
                          [📝 Quiz-based]
                        </span>
                      )}
                    </span>
                    {isBackend && user?.role === 'teacher' && (
                      <MenuTiny onDelete={async () => { 
                        try { 
                          await (await import('../../services/assignments')).deleteAssignmentApi(Number(a.id))
                          push({ kind: 'success', message: 'Assignment deleted' })
                          const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
                          setBackendAssignments(data) 
                        } catch (e: any) { 
                          push({ kind: 'error', message: e?.message || 'Failed' }) 
                        } 
                      }} />
                    )}
                    {user?.role === 'student' && (
                      <>
                        {a.is_quiz ? (
                          <button 
                            className="btn btn-primary" 
                            style={{ marginLeft: 8 }} 
                            onClick={() => location.assign(`/quizzes/${a.quiz_id}`)}
                          >
                            Attempt Quiz
                          </button>
                        ) : a.assignment_type === 'code' ? (
                          <button 
                            className="btn btn-primary" 
                            style={{ marginLeft: 8 }} 
                            onClick={() => void startCodeAttempt(a)}
                          >
                            Attempt Code
                          </button>
                        ) : a.assignment_type === 'file' || a.assignment_type === 'pdf' ? (
                          <button 
                            className="btn btn-primary" 
                            style={{ marginLeft: 8 }} 
                            onClick={() => {
                              setSelectedAssignmentId(String(a.id))
                              // Scroll to submission form
                              setTimeout(() => {
                                const form = document.querySelector('form[style*="marginTop"]')
                                if (form) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                              }, 100)
                            }}
                          >
                            Submit PDF
                          </button>
                        ) : null}
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {user?.role === 'student' && isBackend && (
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border-color, #ddd)' }}>
                  <h4>Submit PDF Assignment</h4>
                  <form onSubmit={async (e) => {
                    e.preventDefault()
                    if (!selectedAssignmentId || !linkUrl.trim()) {
                      return push({ kind: 'error', message: 'Please select an assignment and provide a URL' })
                    }
                    try {
                      await apiFetch('/api/submissions/submit/link', { 
                        method: 'POST', 
                        body: { assignment_id: Number(selectedAssignmentId), url: linkUrl.trim() } 
                      })
                      push({ kind: 'success', message: 'Assignment submitted successfully' })
                      setLinkUrl('')
                      setSelectedAssignmentId('')
                      // Reload submissions to update the list
                      if (user?.id) {
                        try {
                          const submissions = await apiFetch<any[]>(`/api/student/courses/${courseId}/submissions`)
                          setMySubmissions(submissions || [])
                        } catch {}
                      }
                    } catch (err: any) {
                      push({ kind: 'error', message: err?.message || 'Submission failed' })
                    }
                  }} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                    <select 
                      className="select" 
                      value={selectedAssignmentId} 
                      onChange={(e) => setSelectedAssignmentId(e.target.value)}
                      style={{ minWidth: 200 }}
                    >
                      <option value="">Select PDF assignment</option>
                      {allPresentAssignments
                        .filter((a: any) => (a.assignment_type === 'file' || a.assignment_type === 'pdf') && !mySubmissions.some((s: any) => String(s.assignment_id) === String(a.id)))
                        .map((a: any) => (
                          <option key={a.id} value={a.id}>{a.title}</option>
                        ))}
                    </select>
                    <input 
                      className="input" 
                      style={{ flex: 1, minWidth: 260 }} 
                      placeholder="Submission URL (e.g., Google Drive link)" 
                      value={linkUrl} 
                      onChange={(e) => setLinkUrl(e.target.value)} 
                      required
                    />
                    <button className="btn btn-primary" type="submit" disabled={!selectedAssignmentId || !linkUrl.trim()}>
                      Submit
                    </button>
                  </form>
                </div>
              )}
              {user?.role === 'student' && isBackend && (
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border-color, #ddd)' }}>
                  <h4>Code Submission</h4>
                  <p className="muted">Submit code for code-based assignments</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
                    <select 
                      className="select" 
                      value={codeAssignmentId} 
                      onChange={(e) => setCodeAssignmentId(e.target.value)}
                    >
                      <option value="">Select code assignment</option>
                      {presentAssignments.filter((a: any) => a.assignment_type === 'code').map((a: any) => (
                        <option key={a.id} value={a.id}>{a.title}</option>
                      ))}
                    </select>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => {
                        if (!codeAssignmentId) {
                          push({ kind: 'error', message: 'Please select a code assignment' })
                          return
                        }
                        setShowCodeEditor(true)
                      }}
                      disabled={!codeAssignmentId}
                    >
                      Open Code Editor
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

      {tab === 'past' && (
        <section className="card">
          <h3>Past Assignments</h3>
          <ul className="list">
            {isBackend ? (
              backendAssignments.filter((a: any) => {
                if (!a.due_at) return false
                return new Date(a.due_at) < new Date()
              }).map((a: any) => (
                <li key={a.id}>
                  {a.title} {a.due_at ? `(Due: ${new Date(a.due_at).toLocaleString()})` : ''}
                </li>
              ))
            ) : (
              course?.assignmentsPast.map((a) => (
                <li key={a.id}>
                  {a.title} {a.submitted ? '✓ Submitted' : ''}
                </li>
              )) || []
            )}
          </ul>
        </section>
      )}


      {user?.role === 'teacher' && tab === 'manage' && (
        <section className="card">
          {assignmentCreationType === 'selection' && (
            <>
              <h3>Create Assignment</h3>
              <p className="muted" style={{ marginBottom: 16 }}>Choose the type of assignment you want to create:</p>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 16, maxWidth: 800 }}>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: 24, fontSize: 16, height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                  onClick={() => setAssignmentCreationType('code')}
                >
                  <span style={{ fontSize: 32 }}>💻</span>
                  <span>Code-based</span>
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: 24, fontSize: 16, height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                  onClick={() => setAssignmentCreationType('quiz')}
                >
                  <span style={{ fontSize: 32 }}>📝</span>
                  <span>Quiz-based</span>
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: 24, fontSize: 16, height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                  onClick={() => setAssignmentCreationType('pdf')}
                >
                  <span style={{ fontSize: 32 }}>📄</span>
                  <span>PDF Submission</span>
                </button>
              </div>
            </>
          )}

          {assignmentCreationType === 'pdf' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <button className="btn" onClick={() => setAssignmentCreationType('selection')} style={{ marginRight: 8 }}>← Back</button>
                <h3 style={{ margin: 0 }}>Create PDF Submission Assignment</h3>
              </div>
              <div className="form" style={{ maxWidth: 640 }}>
                <label className="field">
                  <span className="label">Title</span>
                  <input className="input" value={newAssnTitle} onChange={(e) => setNewAssnTitle(e.target.value)} />
                </label>
                <label className="field">
                  <span className="label">Description</span>
                  <input className="input" value={newAssnDesc} onChange={(e) => setNewAssnDesc(e.target.value)} />
                </label>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label className="field">
                    <span className="label">Release at</span>
                    <input className="input" value={newAssnRelease} onChange={(e) => setNewAssnRelease(e.target.value)} />
                  </label>
                  <label className="field">
                    <span className="label">Due at</span>
                    <input className="input" value={newAssnDue} onChange={(e) => setNewAssnDue(e.target.value)} />
                  </label>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label className="field">
                    <span className="label">Max score</span>
                    <input className="input" value={newAssnMax} onChange={(e) => setNewAssnMax(e.target.value)} />
                  </label>
                  <label className="field" style={{ alignItems: 'center' }}>
                    <span className="label">Allow multiple submissions</span>
                    <input type="checkbox" checked={newAssnMulti} onChange={(e) => setNewAssnMulti(e.target.checked)} />
                  </label>
                </div>
                <div>
                  <button className="btn btn-primary" onClick={() => { setNewAssnType('file'); addAssn(); }}>Create PDF Assignment</button>
                </div>
              </div>
            </>
          )}

          {assignmentCreationType === 'code' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <button className="btn" onClick={() => setAssignmentCreationType('selection')} style={{ marginRight: 8 }}>← Back</button>
                <h3 style={{ margin: 0 }}>Create Code-based Assignment</h3>
              </div>
              <div className="form" style={{ maxWidth: 900 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
                  <div>
                    <label className="field"><span className="label">Title</span><input className="input" value={newAssnTitle} onChange={(e)=>setNewAssnTitle(e.target.value)} /></label>
                    <label className="field"><span className="label">Description</span><input className="input" value={newAssnDesc} onChange={(e)=>setNewAssnDesc(e.target.value)} /></label>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <label className="field"><span className="label">Release at</span><input className="input" value={newAssnRelease} onChange={(e)=>setNewAssnRelease(e.target.value)} /></label>
                      <label className="field"><span className="label">Due at</span><input className="input" value={newAssnDue} onChange={(e)=>setNewAssnDue(e.target.value)} /></label>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <label className="field"><span className="label">Max score</span><input className="input" value={newAssnMax} onChange={(e)=>setNewAssnMax(e.target.value)} /></label>
                      <label className="field" style={{ alignItems: 'center' }}><span className="label">Allow multiple submissions</span><input type="checkbox" checked={newAssnMulti} onChange={(e)=>setNewAssnMulti(e.target.checked)} /></label>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button className="btn btn-primary" onClick={createCodeAssignment}>Create Code Assignment (with selected questions)</button>
                    </div>
                  </div>
                  <aside>
                    <h4 style={{ marginTop: 0 }}>Question Manager</h4>
                    <div style={{ marginBottom: 8 }}>
                      <label className="field"><span className="label">Title</span><input className="input" value={newCodeQ.title} onChange={(e)=>setNewCodeQ(q=>({...q, title:e.target.value}))} /></label>
                      <label className="field"><span className="label">Description</span><textarea className="input" rows={3} value={newCodeQ.description} onChange={(e)=>setNewCodeQ(q=>({...q, description:e.target.value}))} /></label>
                      <label className="field"><span className="label">Constraints</span><input className="input" value={newCodeQ.constraints} onChange={(e)=>setNewCodeQ(q=>({...q, constraints:e.target.value}))} /></label>
                      <label className="field"><span className="label">Sample Input</span><textarea className="input" rows={2} value={newCodeQ.sample_input} onChange={(e)=>setNewCodeQ(q=>({...q, sample_input:e.target.value}))} /></label>
                      <label className="field"><span className="label">Sample Output</span><textarea className="input" rows={2} value={newCodeQ.sample_output} onChange={(e)=>setNewCodeQ(q=>({...q, sample_output:e.target.value}))} /></label>
                      <label className="field"><span className="label">Test Input (hidden)</span><textarea className="input" rows={2} value={newCodeQ.test_input} onChange={(e)=>setNewCodeQ(q=>({...q, test_input:e.target.value}))} /></label>
                      <label className="field"><span className="label">Expected Output (hidden)</span><textarea className="input" rows={2} value={newCodeQ.expected_output} onChange={(e)=>setNewCodeQ(q=>({...q, expected_output:e.target.value}))} /></label>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="btn btn-primary" onClick={saveCodeQuestion}>Save Question</button>
                      </div>
                    </div>
                    <div>
                      <h5>Available Questions</h5>
                      {codeQuestions.length === 0 ? (
                        <p className="muted">No questions</p>
                      ) : (
                        <ul className="list" style={{ maxHeight: 260, overflow: 'auto' }}>
                          {codeQuestions.map(q => {
                            // Convert ID to string for consistent key handling
                            const qId = String(q.id)
                            return (
                              <li key={qId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={!!selectedQuestionIds[qId]}
                                  onChange={(e) => setSelectedQuestionIds(m => ({ ...m, [qId]: e.target.checked }))}
                                  aria-label={`Select question ${q.title ?? qId}`}
                                />
                                <div style={{ flex: 1 }}>
                                  <strong>{q.title || `Question ${qId}`}</strong>
                                  <div className="muted" style={{ fontSize: 12 }}>
                                    {q.description?.substring(0, 60) || 'No description'}
                                    {q.description && q.description.length > 60 ? '...' : ''}
                                  </div>
                                  {q.test_cases && q.test_cases.length > 0 && (
                                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                                      {q.test_cases.filter((tc: any) => tc.is_sample).length} sample test case(s)
                                    </div>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                         </ul>
                       )}
                     </div>
                   </aside>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {user?.role === 'teacher' && tab === 'submissions' && (
        <section className="card">
          <h3>Submissions</h3>
          {isBackend ? (
            <BackendSubmissions assignments={backendAssignments} onViewCode={(submission) => {
              setViewingCodeSubmission(submission)
              setShowCodeEditor(true)
            }} />
          ) : (
            <p className="muted">Submissions view available in backend mode only.</p>
          )}
        </section>
      )}

      {user?.role === 'ta' && tab === 'grading' && (
        <section className="card">
          <h3>Grading</h3>
          {isBackend ? (
            <BackendGrading assignments={backendAssignments} onSave={(sid, letter) => {
              push({ kind: 'success', message: `Grade ${letter} saved for submission ${sid}` })
            }} />
          ) : (
            <p className="muted">Grading view available in backend mode only.</p>
          )}
        </section>
      )}

      {tab === 'progress' && (
        <section className="card">
          <h3>Progress</h3>
          {user?.role === 'student' ? (
            <StudentProgressEmbed />
          ) : (
            <CourseProgressEmbed offeringId={courseId || ''} />
          )}
        </section>
      )}

      {tab === 'discussion' && isBackend && (
        <section className="card">
          <h3>Discussion Forum</h3>
          <div className="discussion-wrap">
            {/* New Post Form */}
            <div className="discussion-new">
              <textarea
                className="input"
                placeholder="Start a new discussion..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={3}
                disabled={discussionLoading}
              />
              <button
                className="btn btn-primary"
                onClick={handlePostMessage}
                disabled={!newPostContent.trim() || discussionLoading}
              >
                {discussionLoading ? 'Posting...' : 'Post'}
              </button>
            </div>

            {/* Discussion Threads */}
            {discussionLoading && discussionThreads.threads.length === 0 ? (
              <p className="muted">Loading discussions...</p>
            ) : discussionThreads.threads.length === 0 ? (
              <p className="muted">No discussions yet. Be the first to start one!</p>
            ) : (
              <ul className="discussion-list">
                {discussionThreads.threads.map((thread) => {
                  const replies = discussionThreads.repliesMap.get(thread.id) || []
                  return (
                    <li key={thread.id} className="discussion-thread">
                      <div className="discussion-meta">
                        <strong>{thread.author_name || 'Anonymous'}</strong>
                        {thread.author_role && ` (${thread.author_role})`}
                        {' • '}
                        {new Date(thread.created_at).toLocaleString()}
                      </div>
                      <div className="discussion-content">{thread.content}</div>
                      
                      {/* Replies */}
                      {replies.length > 0 && (
                        <div className="discussion-replies">
                          {replies.map((reply) => (
                            <div key={reply.id} className="discussion-reply">
                              <div className="discussion-meta">
                                <strong>{reply.author_name || 'Anonymous'}</strong>
                                {reply.author_role && ` (${reply.author_role})`}
                                {' • '}
                                {new Date(reply.created_at).toLocaleString()}
                              </div>
                              <div className="discussion-content">{reply.content}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Form */}
                      {replyingTo === thread.id ? (
                        <div className="discussion-reply-form">
                          <textarea
                            className="input"
                            placeholder="Write a reply..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={2}
                            disabled={discussionLoading}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-primary"
                              onClick={() => handlePostReply(thread.id)}
                              disabled={!replyContent.trim() || discussionLoading}
                            >
                              {discussionLoading ? 'Posting...' : 'Reply'}
                            </button>
                            <button
                              className="btn btn-ghost"
                              onClick={() => {
                                setReplyingTo(null)
                                setReplyContent('')
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn btn-ghost"
                          onClick={() => setReplyingTo(thread.id)}
                          style={{ marginTop: '12px' }}
                        >
                          Reply
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {tab === 'pyq' && (
        <section className="card">
          <h3>Previous Year Questions</h3>
          {isBackend ? (
            backendPYQ.length === 0 ? <p className="muted">No PYQs available.</p> : (
              <ul className="list">
                {backendPYQ.map((p: any) => (
                  <li key={p.id}>
                    <a href={p.storage_path} target="_blank" rel="noopener noreferrer">{p.filename || p.title}</a>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="muted">PYQs available in backend mode only.</p>
          )}
        </section>
      )}

      {tab === 'notes' && (
        <section className="card">
          <h3>Notes</h3>
          {isBackend ? (
            backendNotes.length === 0 ? <p className="muted">No notes available.</p> : (
              <ul className="list">
                {backendNotes.map((n: any) => (
                  <li key={n.id}>
                    <a href={n.storage_path} target="_blank" rel="noopener noreferrer">{n.filename || n.title}</a>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="muted">Notes available in backend mode only.</p>
          )}
        </section>
      )}

      {tab === 'progress' && isBackend && (
        <section className="card">
          <h3>Progress</h3>
          {user?.role === 'student' ? (
            <StudentProgressEmbed />
          ) : (
            <CourseProgressEmbed offeringId={courseId || ''} />
          )}
        </section>
      )}

      {user?.role === 'teacher' && tab === 'manage' && assignmentCreationType === 'quiz' && (
        <section className="card">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <button className="btn" onClick={() => setAssignmentCreationType('selection')} style={{ marginRight: 8 }}>← Back</button>
            <h3 style={{ margin: 0 }}>Create Quiz</h3>
          </div>
          <QuizCreator courseOfferingId={courseId || ''} onComplete={() => {
            setAssignmentCreationType('selection')
            push({ kind: 'success', message: 'Quiz created' })
          }} />
        </section>
      )}

      {tabInternal === 'code_attempt' && selectedCodeAssignment && (
        <section className="card">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <button className="btn" onClick={() => { setTabInternal(''); setSelectedCodeAssignment(null) }} style={{ marginRight: 8 }}>← Back</button>
            <h3 style={{ margin: 0 }}>{selectedCodeAssignment.title}</h3>
          </div>
          {selectedCodeAssignment.questions && selectedCodeAssignment.questions.length > 0 ? (
            <div>
              {selectedCodeAssignment.questions.map((q: CodeQuestion, idx: number) => (
                <div key={q.id} style={{ marginBottom: 24, padding: 16, border: '1px solid #ddd', borderRadius: 4 }}>
                  <h4>Question {idx + 1}: {q.title || 'Untitled'}</h4>
                  <div style={{ marginBottom: 12, whiteSpace: 'pre-wrap' }}>{q.description}</div>
                  {q.constraints && (
                    <div style={{ marginBottom: 12, padding: 8, backgroundColor: '#fff3cd', borderRadius: 4 }}>
                      <strong>Constraints:</strong> {q.constraints}
                    </div>
                  )}
                  {(() => {
                    // Get sample test cases from test_cases array (backend) or direct properties (local)
                    let sampleCases: any[] = []
                    if (q.test_cases && Array.isArray(q.test_cases)) {
                      sampleCases = q.test_cases.filter((tc: any) => tc.is_sample === true)
                    } else if (q.sample_input && q.sample_output) {
                      // Fallback to direct properties for local mode
                      sampleCases = [{ input_text: q.sample_input, expected_text: q.sample_output }]
                    }
                    
                    return sampleCases.length > 0 ? (
                      <div style={{ marginBottom: 12 }}>
                        <strong>Sample Test Cases:</strong>
                        {sampleCases.map((tc: any, idx: number) => (
                          <div key={idx} style={{ marginTop: 8 }}>
                            <div style={{ backgroundColor: '#f8f9fa', padding: 12, borderRadius: 4, fontSize: '0.9em' }}>
                              <div style={{ marginBottom: 8 }}>
                                <strong>Input:</strong>
                                <pre style={{ marginTop: 4, marginBottom: 0, padding: 8, backgroundColor: '#ffffff', borderRadius: 4, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9em' }}>
                                  {tc.input_text || '(empty)'}
                                </pre>
                              </div>
                              <div>
                                <strong>Expected Output:</strong>
                                <pre style={{ marginTop: 4, marginBottom: 0, padding: 8, backgroundColor: '#ffffff', borderRadius: 4, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9em' }}>
                                  {tc.expected_text || '(empty)'}
                                </pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null
                  })()}
                  <div style={{ marginBottom: 8 }}>
                    <select className="select" value={codeLang[q.id] || 'python'} onChange={(e) => setCodeLang(prev => ({ ...prev, [q.id]: e.target.value }))}>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="c">C</option>
                      <option value="javascript">JavaScript</option>
                    </select>
                  </div>
                  <textarea
                    className="input"
                    value={codeEditor[q.id] || ''}
                    onChange={(e) => setCodeEditor(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Write your code here..."
                    rows={10}
                    style={{ fontFamily: 'monospace', fontSize: '14px', width: '100%', marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button 
                      className="btn" 
                      onClick={() => void runCodeForQuestion(q)} 
                      disabled={!codeEditor[q.id]?.trim() || isRunningCode[q.id]}
                      style={{ position: 'relative' }}
                    >
                      {isRunningCode[q.id] ? (
                        <>
                          <span className="spinner" style={{ marginRight: 8 }}></span>
                          Running...
                        </>
                      ) : (
                        'Run Code'
                      )}
                    </button>
                    <button 
                      className="btn" 
                      onClick={async () => {
                        if (!codeEditor[q.id]?.trim()) {
                          push({ kind: 'error', message: 'Write your code first' })
                          return
                        }
                        setIsSavingCode(prev => ({ ...prev, [q.id]: true }))
                        try {
                          await apiFetch('/api/submissions/submit/code', {
                            method: 'POST',
                            body: {
                              assignment_id: Number(selectedCodeAssignment.id),
                              question_id: Number(q.id),
                              language: codeLang[q.id] || 'python',
                              code: codeEditor[q.id]
                            }
                          })
                          setSavedQuestions(prev => ({ ...prev, [q.id]: true }))
                          push({ kind: 'success', message: `Question ${idx + 1} code saved successfully` })
                        } catch (err: any) {
                          push({ kind: 'error', message: err?.message || 'Failed to save code' })
                        } finally {
                          setIsSavingCode(prev => ({ ...prev, [q.id]: false }))
                        }
                      }} 
                      disabled={!codeEditor[q.id]?.trim() || isSavingCode[q.id]}
                      style={{ 
                        backgroundColor: savedQuestions[q.id] ? '#10b981' : undefined,
                        color: savedQuestions[q.id] ? 'white' : undefined
                      }}
                    >
                      {isSavingCode[q.id] ? (
                        <>
                          <span className="spinner" style={{ marginRight: 8, display: 'inline-block' }}></span>
                          Saving...
                        </>
                      ) : savedQuestions[q.id] ? (
                        '✓ Saved'
                      ) : (
                        'Save Code'
                      )}
                    </button>
                  </div>
                  {isRunningCode[q.id] && (
                    <div style={{ marginTop: 12, padding: 16, backgroundColor: '#e7f3ff', borderRadius: 4, border: '1px solid #b3d9ff', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="spinner" style={{ display: 'inline-block' }}></span>
                      <span style={{ color: '#0066cc', fontWeight: 500 }}>Running the test cases...</span>
                    </div>
                  )}
                  {runResults[q.id] && !isRunningCode[q.id] && (
                    <div style={{ marginTop: 12, padding: 12, backgroundColor: runResults[q.id].ok ? '#d4edda' : '#f8d7da', borderRadius: 4 }}>
                      <div style={{ marginBottom: 8 }}>
                        <strong>Result:</strong> {runResults[q.id].message || (runResults[q.id].ok ? 'Passed' : 'Failed')}
                      </div>
                      {runResults[q.id].stdout !== undefined && runResults[q.id].stdout !== '' && (
                        <div style={{ marginTop: 8 }}>
                          <strong>Output:</strong>
                          <pre style={{ marginTop: 4, fontSize: '0.9em', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                            {runResults[q.id].stdout || '(empty)'}
                          </pre>
                                               </div>
                      )}
                      {runResults[q.id].expected && (
                        <div style={{ marginTop: 8 }}>
                          <strong>Expected:</strong>
                          <pre style={{ marginTop: 4, fontSize: '0.9em', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                            {runResults[q.id].expected}
                          </pre>
                        </div>
                      )}
                      {runResults[q.id].stderr && runResults[q.id].stderr.trim() !== '' && (
                        <div style={{ marginTop: 8 }}>
                          <strong>Error:</strong>
                          <pre style={{ marginTop: 4, fontSize: '0.9em', color: '#dc3545', backgroundColor: '#fff5f5', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                            {runResults[q.id].stderr}
                          </pre>
                        </div>
                      )}
                      {runResults[q.id].error && (
                        <div style={{ marginTop: 8, color: '#dc3545' }}>
                          <strong>Error:</strong> {runResults[q.id].error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No questions found for this assignment.</p>
          )}
          {selectedCodeAssignment.questions && selectedCodeAssignment.questions.length > 0 && (
            <div style={{ 
              marginTop: 24, 
              padding: 16, 
              backgroundColor: '#f9fafb', 
              border: '2px solid #6366f1', 
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h4 style={{ margin: 0, marginBottom: 4 }}>Final Submission</h4>
                <p style={{ margin: 0, fontSize: '0.9em', color: '#6b7280' }}>
                  {(() => {
                    const savedCount = selectedCodeAssignment.questions.filter((q: CodeQuestion) => savedQuestions[q.id]).length
                    const totalCount = selectedCodeAssignment.questions.length
                    return `Saved ${savedCount} of ${totalCount} questions`
                  })()}
                </p>
              </div>
              <button
                className="btn btn-primary"
                style={{ 
                  fontSize: '16px',
                  padding: '12px 24px',
                  fontWeight: 600
                }}
                onClick={async () => {
                  // Check if all questions have code
                  const allHaveCode = selectedCodeAssignment.questions.every((q: CodeQuestion) => {
                    return codeEditor[q.id]?.trim()
                  })

                  if (!allHaveCode) {
                    push({ kind: 'error', message: 'Please write code for all questions before final submission' })
                    return
                  }

                  // Check if all questions are saved
                  const allSaved = selectedCodeAssignment.questions.every((q: CodeQuestion) => {
                    return savedQuestions[q.id]
                  })

                  if (!allSaved) {
                    const confirmSave = confirm('Some questions are not saved. Do you want to save all questions and submit?')
                    if (!confirmSave) return

                    // Save all unsaved questions first
                    for (const q of selectedCodeAssignment.questions) {
                      if (!savedQuestions[q.id] && codeEditor[q.id]?.trim()) {
                        try {
                          await apiFetch('/api/submissions/submit/code', {
                            method: 'POST',
                            body: {
                              assignment_id: Number(selectedCodeAssignment.id),
                              question_id: Number(q.id),
                              language: codeLang[q.id] || 'python',
                              code: codeEditor[q.id]
                            }
                          })
                          setSavedQuestions(prev => ({ ...prev, [q.id]: true }))
                        } catch (err: any) {
                          push({ kind: 'error', message: `Failed to save question ${q.id}: ${err?.message}` })
                          return
                        }
                      }
                    }
                  }

                  // Final submission - ensure all questions are saved, then mark as complete
                  try {
                    // Ensure all questions are saved (submit any unsaved ones)
                    for (const q of selectedCodeAssignment.questions) {
                      if (codeEditor[q.id]?.trim() && !savedQuestions[q.id]) {
                        try {
                          await apiFetch('/api/submissions/submit/code', {
                            method: 'POST',
                            body: {
                              assignment_id: Number(selectedCodeAssignment.id),
                              question_id: Number(q.id),
                              language: codeLang[q.id] || 'python',
                              code: codeEditor[q.id]
                            }
                          })
                          setSavedQuestions(prev => ({ ...prev, [q.id]: true }))
                        } catch (err: any) {
                          push({ kind: 'error', message: `Failed to save question ${q.id}: ${err?.message}` })
                          return
                        }
                      }
                    }

                    // All questions are now saved. The submission is complete.
                    // The backend creates/updates the submission when code is saved,
                    // so all questions are already stored in the database.
                    
                    push({ kind: 'success', message: 'Assignment submitted successfully! All questions have been saved and submitted.' })
                    
                    // Reload submissions to update the list
                    if (user?.role === 'student' && user?.id && courseId) {
                      try {
                        const submissions = await apiFetch<any[]>(`/api/student/courses/${courseId}/submissions`)
                        setMySubmissions(submissions || [])
                      } catch {}
                    }

                    // Close the code attempt view and go back
                    setTabInternal('')
                    setSelectedCodeAssignment(null)
                    setCodeEditor({})
                    setCodeLang({})
                    setSavedQuestions({})
                    setRunResults({})
                  } catch (err: any) {
                    push({ kind: 'error', message: err?.message || 'Final submission failed' })
                  }
                }}
                disabled={selectedCodeAssignment.questions.some((q: CodeQuestion) => !codeEditor[q.id]?.trim())}
              >
                Final Submit Assignment
              </button>
            </div>
          )}
        </section>
      )}

      {showCodeEditor && viewingCodeSubmission && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: '95%', maxHeight: '95%', overflow: 'auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>Code Submission - {viewingCodeSubmission.student_name || viewingCodeSubmission.student_email}</h3>
                <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.9em' }}>
                  Submitted: {viewingCodeSubmission.submitted_at ? new Date(viewingCodeSubmission.submitted_at).toLocaleString() : 'N/A'}
                </p>
              </div>
              <button className="btn" onClick={() => { setShowCodeEditor(false); setViewingCodeSubmission(null) }}>Close</button>
            </div>
            
            {viewingCodeSubmission.code && viewingCodeSubmission.code.length > 0 ? (
              <TeacherCodeSubmissionViewer 
                submission={viewingCodeSubmission}
                onGrade={async (score, feedback) => {
                  try {
                    await apiFetch('/api/submissions/grade', {
                      method: 'POST',
                      body: {
                        submission_id: viewingCodeSubmission.id,
                        score,
                        feedback
                      }
                    })
                    push({ kind: 'success', message: 'Graded successfully' })
                    setShowCodeEditor(false)
                    setViewingCodeSubmission(null)
                  } catch (err: any) {
                    push({ kind: 'error', message: err?.message || 'Grading failed' })
                  }
                }}
                push={push}
              />
            ) : (
              <p className="muted">No code submissions found.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'chatbot' && isBackend && (
        <section className="card">
          <h3>AI Assistant — Course</h3>
          <p className="muted" style={{ marginTop: 4 }}>Ask questions about this course and get AI-powered answers.</p>
          <div style={{ marginTop: 12 }}>
            <Chatbot type="course" offeringId={Number(courseId)} />
          </div>
        </section>
      )}
      {tab === 'pdfchat' && isBackend && (
        <section className="card">
          <h3>AI Assistant — PDF</h3>
          <p className="muted" style={{ marginTop: 4 }}>Upload a PDF, then ask questions about its content.</p>
          <div style={{ marginTop: 12 }}>
            <Chatbot type="pdf" />
          </div>
        </section>
      )}
        </div>
      </div>
    </>
  )
}