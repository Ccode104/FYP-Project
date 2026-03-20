import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../services/api'

type CourseCardData = {
  id: number
  pending_assignments?: number
  pending_quizzes?: number
  overdue_assignments?: number
  missed_quizzes?: number
  completed_assignments?: number
  completed_quizzes?: number
  assignment_average?: number | null
  quiz_average?: number | null
  unread_notifications?: number
}

type SuccessSummary = {
  pending_assignments: number
  pending_quizzes: number
  overdue_assignments: number
  missed_quizzes: number
  completed_assignments: number
  completed_quizzes: number
  unread_notifications: number
  assignment_average: number | null
  quiz_average: number | null
  overall_average: number | null
}

export default function SuccessCenter() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<CourseCardData[]>([])
  const [summary, setSummary] = useState<SuccessSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const response = await apiFetch<{ courses: CourseCardData[]; summary?: SuccessSummary }>('/api/courses/card-data')
        if (!cancelled) setCourses(response.courses || [])
        if (!cancelled) setSummary(response.summary || null)
      } catch (e) {
        console.error(e)
        if (!cancelled) setCourses([])
        if (!cancelled) setSummary(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const totals = useMemo(() => {
    if (summary) {
      return {
        pendingAssignments: summary.pending_assignments,
        pendingQuizzes: summary.pending_quizzes,
        overdueAssignments: summary.overdue_assignments,
        missedQuizzes: summary.missed_quizzes,
        completedAssignments: summary.completed_assignments,
        completedQuizzes: summary.completed_quizzes,
        unreadNotifications: summary.unread_notifications,
        assignmentAverage: summary.assignment_average,
        quizAverage: summary.quiz_average,
        overallAverage: summary.overall_average,
      }
    }
    return courses.reduce(
      (acc, c) => {
        acc.pendingAssignments += c.pending_assignments || 0
        acc.pendingQuizzes += c.pending_quizzes || 0
        acc.overdueAssignments += c.overdue_assignments || 0
        acc.missedQuizzes += c.missed_quizzes || 0
        acc.completedAssignments += c.completed_assignments || 0
        acc.completedQuizzes += c.completed_quizzes || 0
        acc.unreadNotifications += c.unread_notifications || 0
        return acc
      },
      {
        pendingAssignments: 0,
        pendingQuizzes: 0,
        overdueAssignments: 0,
        missedQuizzes: 0,
        completedAssignments: 0,
        completedQuizzes: 0,
        unreadNotifications: 0,
        assignmentAverage: null as number | null,
        quizAverage: null as number | null,
        overallAverage: null as number | null,
      },
    )
  }, [courses, summary])

  return (
    <div className="container container-wide dashboard-page student-theme">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title h2 text-primary">Success center</h1>
          <p className="dashboard-subtitle text-lg text-secondary leading-relaxed">
            A focused place to plan, track progress, and close pending work
          </p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/planner')}>Planner</button>
          <button className="btn btn-outline" onClick={() => navigate('/progress')}>Progress</button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="card-header-mini" style={{ marginBottom: 10 }}>
            <h3 className="card-subtitle">Right now</h3>
          </div>
          {loading ? (
            <div className="text-sm text-secondary">Loading...</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div className="text-sm"><strong>{totals.pendingAssignments}</strong> pending assignments</div>
              <div className="text-sm"><strong>{totals.pendingQuizzes}</strong> pending quizzes</div>
              <div className="text-sm"><strong>{totals.overdueAssignments}</strong> overdue assignments</div>
              <div className="text-sm"><strong>{totals.missedQuizzes}</strong> missed quizzes</div>
              <div className="text-sm"><strong>{totals.unreadNotifications}</strong> unread notifications</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/planner')}>Plan today</button>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard/student')}>Back to dashboard</button>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="card-header-mini" style={{ marginBottom: 10 }}>
            <h3 className="card-subtitle">Performance snapshot</h3>
          </div>
          {loading ? (
            <div className="text-sm text-secondary">Loading...</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div className="text-sm">
                Overall average: <strong>{totals.overallAverage ?? 'N/A'}%</strong>
              </div>
              <div className="text-sm">
                Assignment average: <strong>{totals.assignmentAverage ?? 'N/A'}%</strong>
              </div>
              <div className="text-sm">
                Quiz average: <strong>{totals.quizAverage ?? 'N/A'}%</strong>
              </div>
              <div className="text-sm">
                Completed assignments: <strong>{totals.completedAssignments}</strong>
              </div>
              <div className="text-sm">
                Completed quizzes: <strong>{totals.completedQuizzes}</strong>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => navigate('/progress')}>View progress analytics</button>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="card-header-mini" style={{ marginBottom: 10 }}>
            <h3 className="card-subtitle">Quick links</h3>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => navigate('/progress')}>View progress analytics</button>
            <button className="btn btn-outline" onClick={() => navigate('/planner')}>Open planner</button>
            <button className="btn btn-outline" onClick={() => navigate('/profile')}>Profile</button>
          </div>
        </div>
      </div>
    </div>
  )
}
