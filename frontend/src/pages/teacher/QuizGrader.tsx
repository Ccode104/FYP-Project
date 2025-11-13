import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import { listQuizAttemptsForQuiz, gradeQuizAttempt } from '../../services/quizzes'
import { useAuth } from '../../context/AuthContext'

export default function QuizGrader() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { push } = useToast()
  const { user } = useAuth()

  const [quiz, setQuiz] = useState<any>(null)
  const [attempts, setAttempts] = useState<any[]>([])
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>('')
  const [decisions, setDecisions] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)

  // Load quiz with correct answers for grading and attempts
  useEffect(() => {
    (async () => {
      if (!quizId) return
      try {
        const [q, ats] = await Promise.all([
          // grading view includes correct answers
          fetchQuizForGrading(Number(quizId)),
          listQuizAttemptsForQuiz(Number(quizId))
        ])
        setQuiz(q)
        setAttempts(ats)
      } catch (e: any) {
        push({ kind: 'error', message: e?.message || 'Failed to load grading data' })
      } finally {
        setLoading(false)
      }
    })()
  }, [quizId])

  const selectedAttempt = useMemo(() => attempts.find(a => String(a.id) === selectedAttemptId), [attempts, selectedAttemptId])

  useEffect(() => {
    // Reset decisions when switching attempts
    setDecisions({})
  }, [selectedAttemptId])

  const save = async () => {
    if (!selectedAttempt) return
    try {
      await gradeQuizAttempt(Number(selectedAttempt.id), decisions)
      push({ kind: 'success', message: 'Grading saved' })
      // reload attempts to reflect new score
      const ats = await listQuizAttemptsForQuiz(Number(quizId))
      setAttempts(ats)
    } catch (e: any) {
      push({ kind: 'error', message: e?.message || 'Failed to save grading' })
    }
  }

  if (!user || (user.role !== 'teacher' && user.role !== 'ta')) return <div className="container"><p className="muted">Unauthorized</p></div>
  if (loading) return <div className="container"><p className="muted">Loading…</p></div>
  if (!quiz) return <div className="container"><p className="muted">Quiz not found</p></div>

  return (
    <div className="container" style={{ maxWidth: 1000 }}>
      <header className="topbar">
        <h2>Grading — {quiz.title}</h2>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>Back</button>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="field">
            <span className="label">Attempt</span>
            <select className="select" value={selectedAttemptId} onChange={(e) => setSelectedAttemptId(e.target.value)}>
              <option value="">Select attempt</option>
              {attempts.map((a) => (
                <option key={a.id} value={a.id}>{a.student_name || a.student_email} — #{a.id} — Score: {a.score ?? 'Pending'}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" onClick={save} disabled={!selectedAttempt || Object.keys(decisions).length === 0}>Save</button>
        </div>
      </div>

      {!selectedAttempt ? (
        <div className="card">Select an attempt to grade.</div>
      ) : (
        <div className="card">
          <ol style={{ paddingLeft: 20 }}>
            {quiz.questions.map((q: any, idx: number) => {
              const ans = selectedAttempt.answers?.[q.id]
              const studentAnswer = ans?.student_answer
              const isCorrect = ans?.is_correct
              const canDecide = q.question_type === 'short'
              return (
                <li key={q.id} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Q{idx + 1}. {q.question_text}</div>
                  <div className="muted" style={{ marginBottom: 6 }}>Correct: {renderCorrect(q)}</div>
                  <div>Student: {renderStudentAnswer(q, studentAnswer)}</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="muted">Status:</span>
                    <span style={{ color: isCorrect === true ? 'green' : (isCorrect === false ? '#b91c1c' : '#6b7280') }}>
                      {isCorrect === true ? 'Correct' : isCorrect === false ? 'Incorrect' : 'Not graded'}
                    </span>
                  </div>
                  {canDecide && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <button className="btn" onClick={() => setDecisions((m) => ({ ...m, [q.id]: true }))}>Mark Correct</button>
                      <button className="btn" onClick={() => setDecisions((m) => ({ ...m, [q.id]: false }))}>Mark Incorrect</button>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}

// Helpers
async function fetchQuizForGrading(quizId: number) {
  // using existing endpoint that includes correct answers
  const res = await fetch(`${(import.meta as any).env?.REACT_APP_API_URL || 'http://localhost:4000'}/api/quizzes/${quizId}/grading`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('auth:token') || ''}` }
  })
  if (!res.ok) throw new Error('Failed to fetch quiz for grading')
  return res.json()
}

function renderCorrect(q: any) {
  if (q.question_type === 'mcq') {
    const idx = Number(q.metadata?.correct_answer)
    const choice = q.metadata?.choices?.[idx]
    return choice !== undefined ? `${idx + 1}. ${choice}` : '—'
  }
  if (q.question_type === 'true_false') {
    const idx = Number(q.metadata?.correct_answer)
    return idx === 0 ? 'True' : 'False'
  }
  return q.metadata?.correct_answer ?? '—'
}

function renderStudentAnswer(q: any, a: any) {
  if (q.question_type === 'mcq') {
    const idx = Number(a)
    const choice = q.metadata?.choices?.[idx]
    return choice !== undefined ? `${idx + 1}. ${choice}` : '—'
  }
  if (q.question_type === 'true_false') {
    return Number(a) === 0 ? 'True' : (Number(a) === 1 ? 'False' : '—')
  }
  return typeof a === 'string' ? a : '—'
}