import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getSuspendedProctoringSessions, resumeSession } from '../services/proctoringApi'
import { useToast } from './ToastProvider'

interface SuspendedSession {
  id: number
  quiz_attempt_id: number
  student_id: number
  student_name: string
  student_email: string
  quiz_title: string
  quiz_id: number
  course_code: string
  course_title: string
  course_offering_id: number
  session_token: string
  status: string
  started_at: string
  suspended_at: string
  suspension_reason: string
  violations?: Array<{
    violation_type: string
    severity: number
    description: string
    timestamp: string
  }>
}

interface SuspendedQuizzesProps {
  courseId: string
}

export default function SuspendedQuizzes({ courseId }: SuspendedQuizzesProps) {
  const { user } = useAuth()
  const { push } = useToast()
  const [suspendedSessions, setSuspendedSessions] = useState<SuspendedSession[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    loadSuspendedSessions()
  }, [courseId])

  const loadSuspendedSessions = async () => {
    try {
      const response = await getSuspendedProctoringSessions()
      // Filter sessions for this specific course
      const courseSessions = response.sessions.filter(
        (session: SuspendedSession) => session.course_code === courseId || session.course_offering_id.toString() === courseId
      )
      setSuspendedSessions(courseSessions)
    } catch (error) {
      console.error('Failed to load suspended sessions:', error)
      push({ kind: 'error', message: 'Failed to load suspended proctoring sessions' })
    } finally {
      setLoading(false)
    }
  }

  const handleResume = async (sessionId: number) => {
    if (!user) return

    setActionLoading(sessionId)
    try {
      await resumeSession(sessionId)
      push({ kind: 'success', message: 'Proctoring session resumed successfully' })
      await loadSuspendedSessions() // Refresh the list
    } catch (error) {
      console.error('Failed to resume session:', error)
      push({ kind: 'error', message: 'Failed to resume proctoring session' })
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
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p className="muted">Loading suspended sessions...</p>
      </div>
    )
  }

  return (
    <section className="assignments-section">
      <div className="section-header">
        <h2 className="section-title">Suspended Proctoring Sessions</h2>
        <span className="assignment-count">{suspendedSessions.length} suspended</span>
      </div>

      {suspendedSessions.length === 0 ? (
        <div className="card">
          <p className="muted">No suspended proctoring sessions for this course.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {suspendedSessions.map((session) => (
            <div key={session.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0' }}>{session.quiz_title}</h3>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.9em' }}>
                    <strong>Student:</strong> {session.student_name} ({session.student_email})
                  </p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.9em' }}>
                    <strong>Session Started:</strong> {new Date(session.started_at).toLocaleString()}
                  </p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.9em' }}>
                    <strong>Suspended:</strong> {new Date(session.suspended_at).toLocaleString()}
                  </p>
                  <p style={{ margin: '0', fontSize: '0.9em', color: '#ef4444' }}>
                    <strong>Reason:</strong> {session.suspension_reason}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleResume(session.id)}
                    disabled={actionLoading === session.id}
                  >
                    {actionLoading === session.id ? 'Resuming...' : 'Resume Session'}
                  </button>
                </div>
              </div>

              {/* Session Details */}
              <div style={{ marginTop: '12px', padding: '8px', background: '#f0f8ff', borderRadius: '4px' }}>
                <p style={{ margin: 0, fontSize: '0.9em' }}>
                  <strong>Session Token:</strong> {session.session_token}
                </p>
              </div>

              {/* Violations Summary */}
              {session.violations && session.violations.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1em' }}>Recent Violations:</h4>
                  <div style={{ display: 'grid', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {session.violations.slice(0, 5).map((violation, index) => (
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

                  {session.violations.length > 5 && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', color: '#6b7280' }}>
                      ... and {session.violations.length - 5} more violations
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
