import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getCourseProgress, type ProgressRow } from '../../services/progress'
import { useToast } from '../../components/ToastProvider'

function groupBy<T, K extends keyof any>(list: T[], getKey: (item: T) => K): Record<K, T[]> {
  return list.reduce((acc, item) => {
    const k = getKey(item)
    ;(acc as any)[k] ||= []
    ;(acc as any)[k].push(item)
    return acc
  }, {} as Record<K, T[]>)
}

export default function CourseProgress() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { offeringId } = useParams()
  const { push } = useToast()

  const [rows, setRows] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!offeringId) return
    ;(async () => {
      try {
        const data = await getCourseProgress(offeringId)
        setRows(data.rows || [])
      } catch (e: any) {
        setError(e?.message || 'Failed to load course progress')
        push({ kind: 'error', message: 'Failed to load progress' })
      } finally {
        setLoading(false)
      }
    })()
  }, [offeringId])

  const byStudent = useMemo(() => groupBy(rows, (r) => String(r.student_id || 'unknown')), [rows])

  return (
    <div className="container container-wide dashboard-page teacher-theme">
      <header className="topbar">
        <h2>Course Progress — Offering #{offeringId}</h2>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>Back</button>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{error}</div> : null}

      {Object.keys(byStudent).length === 0 && !loading ? (
        <p className="muted">No data.</p>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
          {Object.entries(byStudent).map(([sid, items]) => {
            const name = items[0]?.student_name || items[0]?.student_email || `Student #${sid}`
            const totalMax = items.reduce((s, r) => s + (r.max_score || 0), 0)
            const totalScore = items.reduce((s, r) => s + (r.score || 0), 0)
            const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
            const byType = groupBy(items, (r) => r.activity_type)
            return (
              <section key={sid} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <h3>{name}</h3>
                  <div style={{ minWidth: 220 }}>
                    <div className="muted">Overall: {totalScore} / {totalMax} ({pct}%)</div>
                    <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginTop: 6, minWidth: 160 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#10b981' }} />
                    </div>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{minWidth: 240}}>Title</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Max</th>
                        <th>Due</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(byType).map(([type, list]) => (
                        list.map((r) => (
                          <tr key={`${sid}-${type}-${r.activity_id}`}>
                            <td>{r.activity_title || `#${r.activity_id}`}</td>
                            <td>{type}</td>
                            <td>{r.status || (r.score!=null ? 'Submitted' : 'Pending')}</td>
                            <td>{r.score ?? '-'}</td>
                            <td>{r.max_score ?? '-'}</td>
                            <td>{r.due_at ? new Date(r.due_at).toLocaleString() : '-'}</td>
                            <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '-'}</td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}