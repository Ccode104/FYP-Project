import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
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

  // Proctoring state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [violations, setViolations] = useState<string[]>([])
  const [quizStarted, setQuizStarted] = useState(false)
  const [cleanupProctoring, setCleanupProctoring] = useState<(() => void) | null>(null)
  const timerRef = useRef<number | null>(null)
  const fullscreenCheckRef = useRef<number | null>(null)
  const submittedAttemptedRef = useRef(false)

  useEffect(() => {
    (async () => {
      if (!quizId) return
      try {
        const q = await getQuiz(Number(quizId))
        console.log('Loaded quiz:', { id: q.id, title: q.title, is_proctored: q.is_proctored, time_limit: q.time_limit })
        setQuiz(q)
      } catch (e: any) {
        setErr(e?.message || 'Failed to load quiz')
      } finally {
        setLoading(false)
      }
    })()
  }, [quizId])

  // Proctoring functions
  const enterFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen()
      } else if ((document.documentElement as any).mozRequestFullScreen) {
        await (document.documentElement as any).mozRequestFullScreen()
      } else if ((document.documentElement as any).msRequestFullscreen) {
        await (document.documentElement as any).msRequestFullscreen()
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error)
    }
  }, [])

  const checkFullscreen = useCallback(() => {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    )
    setIsFullscreen(isCurrentlyFullscreen)
    return isCurrentlyFullscreen
  }, [])

  const handleViolation = useCallback((violationType: string) => {
    setViolations(prev => [...prev, `${new Date().toISOString()}: ${violationType}`])
    if (!result && !submittedAttemptedRef.current) {
      submittedAttemptedRef.current = true
      push({ kind: 'error', message: `Proctoring violation: ${violationType}. Quiz suspended. Answers saved.` })

      // Save answers locally
      if (quiz && user) {
        const savedData = {
          quizId: quiz.id,
          studentId: user.id,
          answers,
          violations,
          timestamp: new Date().toISOString()
        }
        localStorage.setItem(`quiz_violation_${quiz.id}_${user.id}`, JSON.stringify(savedData))
      }

      // Submit violation attempt
      if (quiz && user) {
        handleViolationSubmit()
      }

      // Navigate back to quizzes
      setTimeout(() => {
        navigate(-1)
      }, 2000)
    } else {
      push({ kind: 'error', message: `Proctoring violation: ${violationType}.` })
    }
  }, [push, quiz, user, result, answers, violations, navigate])

  const startProctoring = useCallback(() => {
    if (!quiz?.is_proctored) return

    setQuizStarted(true)

    // Initialize timer if time limit exists
    if (quiz.time_limit) {
      setTimeRemaining(quiz.time_limit * 60) // Convert minutes to seconds
    }

    // Enter fullscreen
    enterFullscreen()

    // Start monitoring fullscreen
    fullscreenCheckRef.current = window.setInterval(() => {
      if (!checkFullscreen()) {
        handleViolation('Exited fullscreen mode')
      }
    }, 1000)

    // Monitor tab visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('Switched tabs or minimized window')
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Monitor window focus
    const handleBlur = () => {
      handleViolation('Window lost focus')
    }
    window.addEventListener('blur', handleBlur)

    // Cleanup function
    const cleanup = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
    }
    setCleanupProctoring(() => cleanup)
    return cleanup
  }, [quiz, enterFullscreen, checkFullscreen, handleViolation])

  // Timer effect
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && quizStarted && !result) {
      timerRef.current = window.setTimeout(() => {
        setTimeRemaining(prev => {
          if (prev !== null && prev <= 1) {
            handleViolation('Time expired')
            return 0
          }
          return prev ? prev - 1 : null
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [timeRemaining, quizStarted, result, handleViolation])

  // Stop proctoring when quiz submission starts or is submitted
  useEffect(() => {
    if (result || submitting) {
      if (cleanupProctoring) cleanupProctoring()
      if (timerRef.current) clearTimeout(timerRef.current)
      if (fullscreenCheckRef.current) clearInterval(fullscreenCheckRef.current)
    }
  }, [result, submitting, cleanupProctoring])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (fullscreenCheckRef.current) clearInterval(fullscreenCheckRef.current)
    }
  }, [])

  const canSubmit = useMemo(() => {
    if (!quiz) return false
    // require an answer for each question
    return quiz.questions.every((q) => {
      const a = answers[q.id]
      if (q.question_type === 'short') return typeof a === 'string' && a.trim().length > 0
      return a !== undefined && a !== null && a !== ''
    })
  }, [quiz, answers])

  const handleSubmit = async (violated = false) => {
    if (!quiz || !user || submitting || result) return
    setSubmitting(true)
    try {
      const res = await submitQuizAttempt({
        quiz_id: quiz.id,
        student_id: Number(user.id),
        answers,
        violated
      })
      setResult({ score: res.attempt.score, needs_manual_grading: res.needs_manual_grading })
      setGradedAnswers(res.graded_answers as any)
      if (!violated) {
        push({ kind: 'success', message: 'Quiz submitted' })
      }
    } catch (e: any) {
      push({ kind: 'error', message: e?.message || 'Submit failed' })
      // Don't reset submitting to prevent loops on repeated violations
    }
  }

  const handleViolationSubmit = () => {
    handleSubmit(true)
  }

  if (loading) return <div className="container"><p className="muted">Loading…</p></div>
  if (err) return <div className="container"><div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{err}</div></div>
  if (!quiz) return <div className="container"><p className="muted">Quiz not found</p></div>

  // Show proctoring start screen for proctored quizzes
  if (quiz.is_proctored && !quizStarted) {
    return (
      <div className="container" style={{ maxWidth: 600 }}>
        <div className="card">
          <h2>Proctored Quiz</h2>
          <p>This quiz is proctored. You must:</p>
          <ul style={{ marginLeft: 20, marginBottom: 20 }}>
            <li>Keep the browser in fullscreen mode</li>
            <li>Not switch tabs or minimize the window</li>
            <li>Not lose focus from this window</li>
            {quiz.time_limit && <li>Complete within {quiz.time_limit} minutes</li>}
          </ul>
          <p style={{ color: '#ef4444', fontWeight: 'bold' }}>
            Violation of any proctoring rules will suspend the quiz. Answers will be saved and you will be returned to the course page.
          </p>
          <button
            className="btn btn-primary"
            onClick={startProctoring}
            style={{ marginTop: 20 }}
          >
            Start Proctored Quiz
          </button>
        </div>
      </div>
    )
  }

  // Format time remaining
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <header className="topbar">
        <div>
          <h2>
            {quiz.title}
            {quiz.is_proctored && (
              <span style={{
                display: 'inline-block',
                marginLeft: '12px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.8em',
                fontWeight: 'bold',
                background: '#dc2626',
                color: 'white'
              }}>
                🔒 PROCTORED
              </span>
            )}
          </h2>
          {quiz.is_proctored && (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8 }}>
              {timeRemaining !== null && (
                <div style={{
                  color: timeRemaining < 300 ? '#ef4444' : timeRemaining < 600 ? '#f59e0b' : 'inherit',
                  fontWeight: 'bold',
                  fontSize: '1.2em'
                }}>
                  Time: {formatTime(timeRemaining)}
                </div>
              )}
              <div style={{
                color: isFullscreen ? '#10b981' : '#ef4444',
                fontWeight: 'bold'
              }}>
                {isFullscreen ? '✓ Fullscreen' : '✗ Not Fullscreen'}
              </div>
              {violations.length > 0 && (
                <div style={{ color: '#ef4444', fontWeight: 'bold' }}>
                  Violations: {violations.length}
                </div>
              )}
            </div>
          )}
        </div>
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