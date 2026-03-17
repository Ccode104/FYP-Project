import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../services/api'

type CourseCardData = {
  id: number
  pending_assignments?: number
  pending_quizzes?: number
  unread_notifications?: number
}

export default function SuccessCenter() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<CourseCardData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const response = await apiFetch<{ courses: CourseCardData[] }>('/api/courses/card-data')
        if (!cancelled) setCourses(response.courses || [])
      } catch (e) {
        console.error(e)
        if (!cancelled) setCourses([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const totals = useMemo(() => {
    return courses.reduce(
      (acc, c) => {
        acc.pendingAssignments += c.pending_assignments || 0
        acc.pendingQuizzes += c.pending_quizzes || 0
        acc.unreadNotifications += c.unread_notifications || 0
        return acc
      },
      { pendingAssignments: 0, pendingQuizzes: 0, unreadNotifications: 0 },
    )
  }, [courses])

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
            <div className="text-sm text-secondary">Loading…</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div className="text-sm"><strong>{totals.pendingAssignments}</strong> pending assignments</div>
              <div className="text-sm"><strong>{totals.pendingQuizzes}</strong> pending quizzes</div>
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

