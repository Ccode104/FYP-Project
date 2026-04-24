import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../services/api'
import { respondToRequest, type AccessRequest } from '../../features/quiz-permissions/api/quizPermissions'
import { useToast } from '../../components/ToastProvider'

type UngradedSubmission = {
  submission_id: number
  assignment_id: number
  student_id: number
  submitted_at: string
  status: string
  final_score: number | null
  assignment_title: string
  course_offering_id: number
  student_name: string
  student_email: string
  course_code: string
  course_title: string
}

type ReviewQueueResponse = {
  quizAccessRequests: AccessRequest[]
  ungradedSubmissions: UngradedSubmission[]
}

function fmtDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

export default function ReviewQueue() {
  const navigate = useNavigate()
  const { push } = useToast()

  const [data, setData] = useState<ReviewQueueResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [actingRequestId, setActingRequestId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const response = await apiFetch<ReviewQueueResponse>('/api/staff/review-queue')
      setData(response)
    } catch (e) {
      console.error(e)
      setErr('Failed to load review queue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const quizRequests = data?.quizAccessRequests || []
  const ungradedSubmissions = data?.ungradedSubmissions || []

  const groupedSubmissions = useMemo(() => {
    const byCourse = new Map<number, UngradedSubmission[]>()
    for (const s of ungradedSubmissions) {
      const k = s.course_offering_id
      const arr = byCourse.get(k) || []
      arr.push(s)
      byCourse.set(k, arr)
    }
    return [...byCourse.entries()].map(([course_offering_id, submissions]) => ({
      course_offering_id,
      course_code: submissions[0]?.course_code,
      course_title: submissions[0]?.course_title,
      submissions,
    }))
  }, [ungradedSubmissions])

  const handleRespond = async (requestId: number, action: 'approve' | 'reject') => {
    setActingRequestId(requestId)
    try {
      await respondToRequest(requestId, action)
      push({ kind: 'success', message: `Request ${action}d` })
      await load()
    } catch (e) {
      console.error(e)
      push({ kind: 'error', message: 'Failed to respond to request' })
    } finally {
      setActingRequestId(null)
    }
  }

  return (
    <div className="container container-wide dashboard-page teacher-theme">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title h2 text-primary">Review queue</h1>
          <p className="dashboard-subtitle text-lg text-secondary leading-relaxed">
            Items that need staff attention across your courses
          </p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-outline" onClick={load} disabled={loading}>Refresh</button>
        </div>
      </div>

      {err && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div className="text-sm text-secondary">{err}</div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: 16 }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card list-card">
            <div className="card-header-mini" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="card-subtitle">Pending quiz access requests</h3>
              <span className="badge">{quizRequests.length}</span>
            </div>

            {quizRequests.length === 0 ? (
              <div style={{ padding: 16 }} className="text-sm text-secondary">No pending requests</div>
            ) : (
              <ul className="list list-modern">
                {quizRequests.map((r) => (
                  <li key={r.id} className="list-item">
                    <div className="list-item-content">
                      <span className="list-item-title">
                        {r.ta_name} → {r.quiz_title}
                      </span>
                      <span className="list-item-subtitle">
                        {r.course_code} — {r.course_title} • {r.request_type.toUpperCase()} • {fmtDate(r.requested_at)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-sm btn-success"
                        disabled={actingRequestId === r.id}
                        onClick={() => handleRespond(r.id, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={actingRequestId === r.id}
                        onClick={() => handleRespond(r.id, 'reject')}
                      >
                        Reject
                      </button>
                      {typeof (r as unknown as { course_offering_id?: number }).course_offering_id === 'number' && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => navigate(`/courses/${(r as unknown as { course_offering_id: number }).course_offering_id}/hub`)}
                        >
                          Course
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card list-card">
            <div className="card-header-mini" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="card-subtitle">Ungraded assignment submissions</h3>
              <span className="badge">{ungradedSubmissions.length}</span>
            </div>

            {ungradedSubmissions.length === 0 ? (
              <div style={{ padding: 16 }} className="text-sm text-secondary">No ungraded submissions</div>
            ) : (
              <div style={{ padding: 16, display: 'grid', gap: 14 }}>
                {groupedSubmissions.map((group) => (
                  <div key={group.course_offering_id} className="card" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <div>
                        <div className="h4" style={{ marginBottom: 4 }}>
                          {group.course_code} — {group.course_title}
                        </div>
                        <div className="text-sm text-secondary">{group.submissions.length} pending</div>
                      </div>
                      <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/courses/${group.course_offering_id}/grading`)}>
                        Open grading
                      </button>
                    </div>

                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                      {group.submissions.slice(0, 6).map((s) => (
                        <div key={s.submission_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div className="text-sm" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.assignment_title}
                            </div>
                            <div className="text-sm text-secondary">
                              {s.student_name} ({s.student_email}) • Submitted: {fmtDate(s.submitted_at)}
                            </div>
                          </div>
                          <button className="btn btn-sm btn-outline" onClick={() => navigate(`/courses/${s.course_offering_id}/grading`)}>
                            Review
                          </button>
                        </div>
                      ))}

                      {group.submissions.length > 6 && (
                        <div className="text-sm text-secondary">And {group.submissions.length - 6} more…</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

