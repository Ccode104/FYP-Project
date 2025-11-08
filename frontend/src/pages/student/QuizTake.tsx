import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getQuiz, submitQuizAttempt, Quiz } from '../../services/quizzes'
import { useToast } from '../../components/ToastProvider'

export default function QuizTake() {
  const { quizId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // answers keyed by question id
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number | null; needs_manual_grading: boolean } | null>(null)
  const [gradedAnswers, setGradedAnswers] = useState<Record<number, { student_answer: any; is_correct: boolean | null; correct_answer: any }>>({})

  useEffect(() => {
    (async () => {
      if (!quizId) return
      try {
        const q = await getQuiz(Number(quizId))
        setQuiz(q)
      } catch (e: any) {
        setErr(e?.message || 'Failed to load quiz')
      } finally {
        setLoading(false)
      }
    })()
  }, [quizId])

  const canSubmit = useMemo(() => {
    if (!quiz) return false
    // require an answer for each question
    return quiz.questions.every((q) => {
      const a = answers[q.id]
      if (q.question_type === 'short') return typeof a === 'string' && a.trim().length > 0
      return a !== undefined && a !== null && a !== ''
    })
  }, [quiz, answers])

  const handleSubmit = async () => {
    if (!quiz || !user) return
    setSubmitting(true)
    try {
      const res = await submitQuizAttempt({
        quiz_id: quiz.id,
        student_id: Number(user.id),
        answers,
      })
      setResult({ score: res.attempt.score, needs_manual_grading: res.needs_manual_grading })
      setGradedAnswers(res.graded_answers as any)
      push({ kind: 'success', message: 'Quiz submitted' })
    } catch (e: any) {
      push({ kind: 'error', message: e?.message || 'Submit failed' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="container"><p className="muted">Loading…</p></div>
  if (err) return <div className="container"><div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{err}</div></div>
  if (!quiz) return <div className="container"><p className="muted">Quiz not found</p></div>

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <header className="topbar">
        <h2>{quiz.title}</h2>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>Back</button>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="muted">Course: {quiz.course_code} — {quiz.course_title}</div>
        <div className="muted">Max score: {quiz.max_score}</div>
        {quiz.start_at && <div className="muted">Opens: {new Date(quiz.start_at).toLocaleString()}</div>}
        {quiz.end_at && <div className="muted">Closes: {new Date(quiz.end_at).toLocaleString()}</div>}
      </div>

      <form className="card" onSubmit={(e) => { e.preventDefault(); void handleSubmit() }}>
        <ol style={{ paddingLeft: 20 }}>
          {quiz.questions.map((q, idx) => (
            <li key={q.id} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Q{idx + 1}. {q.question_text}</div>
              {q.question_type === 'mcq' && (
                <div>
                  {(q.metadata.choices || []).map((choice, i) => (
                    <label key={i} style={{ display: 'block', marginBottom: 6, color: gradedAnswers[q.id]?.is_correct !== undefined && gradedAnswers[q.id] ? (gradedAnswers[q.id].student_answer === i && gradedAnswers[q.id].is_correct ? 'green' : (gradedAnswers[q.id].student_answer === i && gradedAnswers[q.id].is_correct === false ? '#b91c1c' : 'inherit')) : 'inherit' }}>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === i}
                        onChange={() => setAnswers((m) => ({ ...m, [q.id]: i }))}
                        disabled={!!result}
                      />{' '}
                      {choice}
                      {result && gradedAnswers[q.id]?.correct_answer === i ? ' ✓' : ''}
                    </label>
                  ))}
                </div>
              )}
              {q.question_type === 'true_false' && (
                <div>
                  {['True', 'False'].map((label, i) => (
                    <label key={i} style={{ display: 'block', marginBottom: 6, color: gradedAnswers[q.id]?.student_answer === i ? (gradedAnswers[q.id]?.is_correct ? 'green' : '#b91c1c') : 'inherit' }}>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === i}
                        onChange={() => setAnswers((m) => ({ ...m, [q.id]: i }))}
                        disabled={!!result}
                      />{' '}
                      {label}
                      {result && gradedAnswers[q.id]?.correct_answer === i ? ' ✓' : ''}
                    </label>
                  ))}
                </div>
              )}
              {q.question_type === 'short' && (
                <div>
                  <textarea
                    className="input"
                    style={{ width: '100%', minHeight: 80 }}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((m) => ({ ...m, [q.id]: e.target.value }))}
                    placeholder="Your answer..."
                    disabled={!!result}
                  />
                  {result && gradedAnswers[q.id] && gradedAnswers[q.id].is_correct === null && (
                    <div className="muted" style={{ marginTop: 4 }}>Pending manual grading.</div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-primary" type="submit" disabled={!canSubmit || submitting || !!result}>
            {submitting ? 'Submitting…' : (!!result ? 'Submitted' : 'Submit Quiz')}
          </button>
        </div>
      </form>

      {result && (
        <div className="card" style={{ marginTop: 16 }}>
          <div>Score: {result.score === null ? 'Pending' : Math.round(result.score)}</div>
          {result.needs_manual_grading && <div className="muted">Some questions require manual grading.</div>}
        </div>
      )}
    </div>
  )
}