import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../services/api'
import { useToast } from '../../components/ToastProvider'

interface Contest {
  id: number
  title: string
  description: string
  start_at: string
  end_at: string
  max_score: number
  allow_multiple_submissions: boolean
  created_by: number
}

interface ContestCardsProps {
  courseId: string
  userRole?: string
}

export default function ContestCards({ courseId, userRole }: ContestCardsProps) {
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { push } = useToast()

  useEffect(() => {
    loadContests()
  }, [courseId])

  const loadContests = async () => {
    try {
      setLoading(true)
      const data = await apiFetch<Contest[]>(`/api/contests/course-offerings/${courseId}/contests`)
      setContests(data || [])
    } catch (err: unknown) {
      console.error('Failed to load contests:', err)
      push({ kind: 'error', message: 'Failed to load contests' })
    } finally {
      setLoading(false)
    }
  }

  const handleContestClick = (contest: Contest) => {
    // Navigate directly to contest editor
    navigate(`/courses/${courseId}/contests/${contest.id}/editor`)
  }

  const getContestStatus = (contest: Contest) => {
    const now = new Date()
    const start = new Date(contest.start_at)
    const end = new Date(contest.end_at)

    if (now < start) return { status: 'upcoming', label: 'Upcoming', color: '#ffc107' }
    if (now > end) return { status: 'ended', label: 'Ended', color: '#6c757d' }
    return { status: 'active', label: 'Active', color: '#28a745' }
  }

  if (loading) {
    return (
      <div className="assignments-section">
        <div className="section-header">
          <h2 className="section-title">Coding Contests</h2>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading contests...</p>
        </div>
      </div>
    )
  }

  return (
    <section className="assignments-section">
      <div className="section-header">
        <h2 className="section-title">Coding Contests</h2>
        <span className="assignment-count">{contests.length} contests</span>
      </div>

      {contests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <h3>No contests yet</h3>
          <p>Coding contests will appear here when available.</p>
        </div>
      ) : (
        <div className="assignments-grid">
          {contests.map((contest) => {
            const { status, label, color } = getContestStatus(contest)

            return (
              <div
                key={contest.id}
                className={`assignment-card ${status === 'active' ? 'clickable' : ''}`}
                onClick={() => status === 'active' && handleContestClick(contest)}
                style={{ cursor: status === 'active' ? 'pointer' : 'default' }}
              >
                <div className="assignment-header">
                  <div className="assignment-type">
                    🏆
                    <span>Coding Contest</span>
                  </div>
                  <div className="assignment-badges">
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        background: color,
                        color: 'white'
                      }}
                    >
                      {label}
                    </span>
                  </div>
                </div>

                <h3 className="assignment-title">{contest.title}</h3>

                {contest.description && (
                  <p className="assignment-description" style={{
                    margin: '8px 0',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {contest.description}
                  </p>
                )}

                <div className="assignment-due" style={{ marginTop: '12px' }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>Start: {new Date(contest.start_at).toLocaleDateString()}</span>
                    <span>End: {new Date(contest.end_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Max Score: {contest.max_score} points
                  {contest.allow_multiple_submissions && (
                    <span style={{ marginLeft: '8px', color: '#28a745' }}>• Multiple submissions allowed</span>
                  )}
                </div>

                {userRole === 'student' && status === 'active' && (
                  <div className="assignment-actions" style={{ marginTop: '16px' }}>
                    <button
                      className="btn-assignment submit-assignment"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleContestClick(contest)
                      }}
                    >
                      <span>Start Contest</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="9,18 15,12 9,6" />
                      </svg>
                    </button>
                  </div>
                )}

                {userRole === 'teacher' && (
                  <div className="assignment-actions" style={{ marginTop: '16px' }}>
                    <button
                      className="btn-assignment view-details"
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Navigate to contest management page
                        push({ kind: 'info', message: 'Contest management coming soon' })
                      }}
                    >
                      <span>Manage Contest</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
