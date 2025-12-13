import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getSuspendedAttempts, suspendQuizAttempt, resumeQuizAttempt, markAttemptAsViolated } from '../../services/quizzes'
import { useToast } from '../../components/ToastProvider'

interface SuspendedAttempt {
  id: number
  quiz_id: number
  student_id: number
  student_name: string
  student_email: string
  quiz_title: string
  course_code: string
  course_title: string
  suspension_reason: string
  suspended_at: string
  session_token?: string
  proctoring_status?: string
  violations?: Array<{
    violation_type: string
    severity: number
    description: string
    timestamp: string
  }>
}

export default function SuspendedQuizzes() {
  const { user } = useAuth()
  const { push } = useToast()
  const [suspendedAttempts, setSuspendedAttempts] = useState<SuspendedAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    loadSuspendedAttempts()
  }, [])

  const loadSuspendedAttempts = async () => {
    try {
      const response = await getSuspendedAttempts()
      setSuspendedAttempts(response.suspended_attempts)
    } catch (error) {
      console.error('Failed to load suspended attempts:', error)
      push({ kind: 'error', message: 'Failed to load suspended quiz attempts' })
    } finally {
      setLoading(false)
    }
  }

  const handleResume = async (attemptId: number) => {
    if (!user) return

    setActionLoading(attemptId)
    try {
      await resumeQuizAttempt(attemptId, Number(user.id))
      push({ kind: 'success', message: 'Quiz attempt resumed successfully' })
      await loadSuspendedAttempts() // Refresh the list
    } catch (error) {
      console.error('Failed to resume attempt:', error)
      push({ kind: 'error', message: 'Failed to resume quiz attempt' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkViolated = async (attemptId: number) => {
    if (!user) return

    if (!confirm('Are you sure you want to mark this attempt as violated? This will set the score to -1 and prevent the student from retaking the quiz.')) {
      return
    }

    setActionLoading(attemptId)
    try {
      await markAttemptAsViolated(attemptId, Number(user.id))
      push({ kind: 'success', message: 'Quiz attempt marked as violated successfully' })
      await loadSuspendedAttempts() // Refresh the list
    } catch (error) {
      console.error('Failed to mark attempt as violated:', error)
      push({ kind: 'error', message: 'Failed to mark quiz attempt as violated' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSuspend = async (attemptId: number, reason: string) => {
    if (!user) return

    setActionLoading(attemptId)
    try {
      await suspendQuizAttempt(attemptId, reason, Number(user.id))
      push({ kind: 'success', message: 'Quiz attempt suspended successfully' })
      await loadSuspendedAttempts() // Refresh the list
    } catch (error) {
      console.error('Failed to suspend attempt:', error)
      push({ kind: 'error', message: 'Failed to suspend quiz attempt' })
    } finally {
      setActionLoading(null)
    }
  }

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return '#fbbf24' // warning
      case 2: return '#f59e0b' // minor
      case 3: return '#ef4444' // major
      case 4: return '#dc2626' // critical
      default: return '#6b7280'
    }
  }

  const getSeverityLabel = (severity: number) => {
    switch (severity) {
      case 1: return 'Warning'
      case 2: return 'Minor'
      case 3: return 'Major'
      case 4: return 'Critical'
      default: return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="container">
        <h1>Suspended Quiz Attempts</h1>
        <p className="muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="container">
      <header className="topbar">
        <div>
          <h1>Suspended Quiz Attempts</h1>
          <p className="muted">Manage quiz attempts that have been suspended due to proctoring violations</p>
        </div>
      </header>

      {suspendedAttempts.length === 0 ? (
        <div className="card">
          <p className="muted">No suspended quiz attempts found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {suspendedAttempts.map((attempt) => (
            <div key={attempt.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0' }}>{attempt.quiz_title}</h3>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.9em' }}>
                    <strong>Student:</strong> {attempt.student_name} ({attempt.student_email})
                  </p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.9em' }}>
                    <strong>Course:</strong> {attempt.course_code} - {attempt.course_title}
                  </p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.9em' }}>
                    <strong>Suspended:</strong> {new Date(attempt.suspended_at).toLocaleString()}
                  </p>
                  <p style={{ margin: '0', fontSize: '0.9em', color: '#ef4444' }}>
                    <strong>Reason:</strong> {attempt.suspension_reason}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleResume(attempt.id)}
                    disabled={actionLoading === attempt.id}
                  >
                    {actionLoading === attempt.id ? 'Resuming...' : 'Resume Quiz'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleMarkViolated(attempt.id)}
                    disabled={actionLoading === attempt.id}
                  >
                    {actionLoading === attempt.id ? 'Marking...' : 'Mark as Violated'}
                  </button>
                </div>
              </div>

              {/* Violations Summary */}
              {attempt.violations && attempt.violations.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1em' }}>Recent Violations:</h4>
                  <div style={{ display: 'grid', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {attempt.violations.slice(0, 5).map((violation, _index) => (
                      <div
                        key={index}
                        style={{
                          padding: '8px',
                          borderRadius: '4px',
                          background: '#f9fafb',
                          border: `1px solid ${getSeverityColor(violation.severity)}`,
                          fontSize: '0.85em'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold' }}>{violation.violation_type}</span>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              background: getSeverityColor(violation.severity),
                              color: 'white',
                              fontSize: '0.75em',
                              fontWeight: 'bold'
                            }}
                          >
                            {getSeverityLabel(violation.severity)}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>
                          {violation.description}
                        </p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.8em', color: '#9ca3af' }}>
                          {new Date(violation.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  {attempt.violations.length > 5 && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', color: '#6b7280' }}>
                      ... and {attempt.violations.length - 5} more violations
                    </p>
                  )}
                </div>
              )}

              {/* Proctoring Status */}
              {attempt.proctoring_status && (
                <div style={{ marginTop: '12px', padding: '8px', background: '#fef3c7', borderRadius: '4px' }}>
                  <p style={{ margin: 0, fontSize: '0.9em' }}>
                    <strong>Proctoring Status:</strong> {attempt.proctoring_status}
                    {attempt.session_token && (
                      <span style={{ marginLeft: '8px', fontSize: '0.8em', color: '#6b7280' }}>
                        (Session: {attempt.session_token.substring(0, 8)}...)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
