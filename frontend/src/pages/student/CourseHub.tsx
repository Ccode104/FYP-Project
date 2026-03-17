import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../services/api'

type OfferingSummary = {
  id: number | string
  course_code?: string
  course_title?: string
  term?: string
  section?: string
}

type AssignmentSummary = {
  id: number | string
  title?: string
  due_at?: string | null
}

type QuizSummary = {
  id: number | string
  title?: string
  end_at?: string | null
}

function fmtDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

export default function CourseHub() {
  const { courseId } = useParams()
  const navigate = useNavigate()

  const [offering, setOffering] = useState<OfferingSummary | null>(null)
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([])
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const id = courseId || ''
  const isBackendOfferingId = useMemo(() => /^\d+$/.test(id), [id])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) return
      setLoading(true)
      setError(null)

      try {
        // Backend offering mode (numeric IDs) is the common case for dashboards.
        if (isBackendOfferingId) {
          const [o, a, q] = await Promise.all([
            apiFetch<OfferingSummary>(`/api/student/courses/${id}`),
            apiFetch<AssignmentSummary[]>(`/api/student/courses/${id}/assignments`).catch(() => []),
            apiFetch<QuizSummary[]>(`/api/student/courses/${id}/quizzes`).catch(() => []),
          ])
          if (!cancelled) {
            setOffering(o)
            setAssignments(Array.isArray(a) ? a : [])
            setQuizzes(Array.isArray(q) ? q : [])
          }
        } else {
          // Local/mock course mode fallback: just forward to the existing page.
          navigate(`/courses/${id}`)
          return
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) setError('Failed to load course hub')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, isBackendOfferingId, navigate])

  const upcomingAssignments = useMemo(() => {
    const items = [...assignments]
    items.sort((x, y) => (new Date(x.due_at || 0).getTime() || 0) - (new Date(y.due_at || 0).getTime() || 0))
    return items.slice(0, 3)
  }, [assignments])

  const upcomingQuizzes = useMemo(() => {
    const items = [...quizzes]
    items.sort((x, y) => (new Date(x.end_at || 0).getTime() || 0) - (new Date(y.end_at || 0).getTime() || 0))
    return items.slice(0, 3)
  }, [quizzes])

  return (
    <div className="container container-wide dashboard-page student-theme">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title h2 text-primary">
            {offering?.course_code ? `${offering.course_code} — ` : ''}{offering?.course_title || `Course #${id}`}
          </h1>
          <p className="dashboard-subtitle text-lg text-secondary leading-relaxed">
            {offering?.term ? offering.term : 'Course hub'}{offering?.section ? ` • ${offering.section}` : ''} • Offering #{id}
          </p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-secondary" onClick={() => navigate(`/courses/${id}`)}>Open full course</button>
          <button className="btn btn-outline" onClick={() => navigate('/planner')}>Planner</button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <div className="h4" style={{ marginBottom: 6 }}>Couldn’t load course hub</div>
              <div className="text-sm text-secondary">{error}</div>
            </div>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="card-header-mini" style={{ marginBottom: 12 }}>
            <h3 className="card-subtitle">Quick actions</h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => navigate(`/courses/${id}/present`)}>Assignments</button>
            <button className="btn btn-secondary" onClick={() => navigate(`/courses/${id}/quizzes`)}>Quizzes</button>
            <button className="btn btn-secondary" onClick={() => navigate(`/courses/${id}/discussion`)}>Discussion</button>
            <button className="btn btn-secondary" onClick={() => navigate(`/courses/${id}/videos`)}>Videos</button>
            <button className="btn btn-secondary" onClick={() => navigate(`/courses/${id}/live-lectures`)}>Live lectures</button>
            <button className="btn btn-outline" onClick={() => navigate(`/courses/${id}/progress`)}>Progress</button>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="card-header-mini" style={{ marginBottom: 12 }}>
            <h3 className="card-subtitle">Upcoming</h3>
          </div>

          {loading ? (
            <div className="text-sm text-secondary">Loading…</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div className="text-sm" style={{ fontWeight: 600, marginBottom: 6 }}>Assignments</div>
                {upcomingAssignments.length === 0 ? (
                  <div className="text-sm text-secondary">No upcoming assignments</div>
                ) : (
                  <ul className="list" style={{ margin: 0, paddingLeft: 16 }}>
                    {upcomingAssignments.map((a) => (
                      <li key={String(a.id)}>
                        <button
                          className="btn btn-link"
                          onClick={() => navigate(`/courses/${id}/assignments/${a.id}`)}
                          style={{ padding: 0, height: 'auto' as unknown as number }}
                        >
                          {a.title || `Assignment #${a.id}`}
                        </button>
                        <div className="text-sm text-secondary">Due: {fmtDate(a.due_at)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="text-sm" style={{ fontWeight: 600, marginBottom: 6 }}>Quizzes</div>
                {upcomingQuizzes.length === 0 ? (
                  <div className="text-sm text-secondary">No upcoming quizzes</div>
                ) : (
                  <ul className="list" style={{ margin: 0, paddingLeft: 16 }}>
                    {upcomingQuizzes.map((q) => (
                      <li key={String(q.id)}>
                        <button className="btn btn-link" onClick={() => navigate(`/quizzes/${q.id}`)} style={{ padding: 0, height: 'auto' as unknown as number }}>
                          {q.title || `Quiz #${q.id}`}
                        </button>
                        <div className="text-sm text-secondary">Ends: {fmtDate(q.end_at)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

