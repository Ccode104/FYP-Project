import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyProgress, type ProgressRow } from '../../services/progress'
import { useToast } from '../../components/ToastProvider'

function groupBy<T, K extends keyof any>(list: T[], getKey: (item: T) => K): Record<K, T[]> {
  return list.reduce((acc, item) => {
    const k = getKey(item)
    ;(acc as any)[k] ||= []
    ;(acc as any)[k].push(item)
    return acc
  }, {} as Record<K, T[]>)
}

export default function StudentProgress() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const [rows, setRows] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const data = await getMyProgress()
        setRows(data.rows || [])
      } catch (e: any) {
        setError(e?.message || 'Failed to load progress')
        push({ kind: 'error', message: 'Failed to load progress' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const grouped = useMemo(() => groupBy(rows, (r) => r.course_offering_id), [rows])

  return (
    <div className="container container-wide dashboard-page student-theme">
      <header className="topbar">
        <h2>My Progress — {user?.name}</h2>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard/student')}>Dashboard</button>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{error}</div> : null}

      {Object.entries(grouped).length === 0 && !loading ? (
        <p className="muted">No progress yet.</p>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
          {Object.entries(grouped).map(([offId, items]) => {
            const byType = groupBy(items, (r) => r.activity_type)
            const totalMax = items.reduce((s, r) => s + (r.max_score || 0), 0)
            const totalScore = items.reduce((s, r) => s + (r.score || 0), 0)
            const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
            return (
              <section key={offId} className="card">
                <h3>Offering #{offId}</h3>
                <div className="muted" style={{ marginBottom: 8 }}>Overall: {totalScore} / {totalMax} ({pct}%)</div>
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
                          <tr key={`${type}-${r.activity_id}`}>
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