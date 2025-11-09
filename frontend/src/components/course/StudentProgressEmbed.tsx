import { useEffect, useState } from 'react'
import { apiFetch } from '../../services/api'
import { type ProgressRow } from '../../services/progress'

function groupBy<T, K extends keyof any>(list: T[], getKey: (item: T) => K): Record<K, T[]> {
  return list.reduce((acc, item) => {
    const k = getKey(item)
    ;(acc as any)[k] ||= []
    ;(acc as any)[k].push(item)
    return acc
  }, {} as Record<K, T[]>)
}

export default function StudentProgressEmbed({ offeringId, assignmentTotal }: { offeringId?: string; assignmentTotal?: number }) {
  const [rows, setRows] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch<{ rows: ProgressRow[] }>('/api/progress/me')
        const filtered = (r.rows || [])
          .filter(row => (!offeringId || String(row.course_offering_id) === String(offeringId)))
          .filter(row => row.submitted_at != null || row.score != null)
        setRows(filtered)
      } catch(e:any){ setError(e?.message||'Failed to load') }
      finally { setLoading(false) }
    })()
  }, [offeringId])
  const totalMax = rows.reduce((s, r)=> s + (r.max_score||0), 0)
  const totalScore = rows.reduce((s, r)=> s + (r.score||0), 0)
  const avgPct = totalMax>0 ? Math.round((totalScore/totalMax)*100) : 0
  const byType = groupBy(rows, (r)=> r.activity_type)
  const assignmentRows = rows.filter(r => r.activity_type === 'assignment')
  const completedCount = assignmentRows.filter(r => !!r.submitted_at).length
  const totalAssignments = assignmentTotal ?? completedCount
  const onTime = assignmentRows.filter(r => r.submitted_at && r.due_at && new Date(r.submitted_at) <= new Date(r.due_at)).length
  const late = assignmentRows.filter(r => r.submitted_at && r.due_at && new Date(r.submitted_at) > new Date(r.due_at)).length
  const onTimePct = (onTime+late)>0 ? Math.round((onTime/(onTime+late))*100) : 0
  return (
    <div>
      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{error}</div> : null}
      {!loading && rows.length===0 ? <p className="muted">No progress yet.</p> : (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 12 }}>
            <div className="card"><div className="muted">Total Assignments</div><div style={{ fontSize: 20, fontWeight: 600 }}>{totalAssignments}</div></div>
            <div className="card"><div className="muted">Completed</div><div style={{ fontSize: 20, fontWeight: 600 }}>{completedCount}</div></div>
            <div className="card"><div className="muted">Avg Score</div><div style={{ fontSize: 20, fontWeight: 600 }}>{avgPct}%</div></div>
            <div className="card"><div className="muted">On‑time Rate</div><div style={{ fontSize: 20, fontWeight: 600 }}>{onTimePct}%</div></div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 12, alignItems: 'stretch', marginBottom: 8 }}>
            <div className="card" style={{ padding: 12 }}>
              {(() => {
                const done = assignmentRows.filter(r => r.submitted_at)
                const buckets = new Map<string, number>()
                done.forEach(r => {
                  const d = new Date(r.submitted_at as string)
                  const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`
                  buckets.set(key, (buckets.get(key) || 0) + 1)
                })
                const series = Array.from(buckets.entries()).sort(([a],[b])=> a.localeCompare(b)).map(([k,v])=>({ date: k, inc: v }))
                let cum = 0
                const points = series.map(s => ({ date: s.date, value: (cum += s.inc) }))
                const W = 360, H = 140, m = { t: 18, r: 10, b: 26, l: 28 }
                const cw = W - m.l - m.r, ch = H - m.t - m.b
                const n = Math.max(points.length, 1)
                const maxY = Math.max(totalAssignments, points.reduce((mx,p)=> Math.max(mx, p.value), 0)) || 1
                const xs = (i:number) => (n===1 ? cw/2 : (i*(cw/(n-1))))
                const ys = (v:number) => ch - (v/maxY)*ch
                const path = points.map((p,i)=> `${i===0?'M':'L'} ${xs(i)} ${ys(p.value)}`).join(' ')
                const labels = points.length>0 ? [points[0].date, points[Math.floor((points.length-1)/2)].date, points[points.length-1].date] : []
                return (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Assignments completed</div>
                    <svg width={W} height={H}>
                      <g transform={`translate(${m.l},${m.t})`}>
                        {[0, Math.ceil(maxY/2), maxY].map((v,i)=> (
                          <g key={i}>
                            <line x1={0} y1={ys(v)} x2={cw} y2={ys(v)} stroke="#e5e7eb" strokeWidth="1" />
                            <text x={-6} y={ys(v)} textAnchor="end" dominantBaseline="middle" style={{ fill: '#6b7280', fontSize: 11 }}>{v}</text>
                          </g>
                        ))}
                        {points.length>0 && (
                          <>
                            <path d={path} fill="none" stroke="#0ea5e9" strokeWidth={2} />
                            {points.map((p,i)=> (<circle key={i} cx={xs(i)} cy={ys(p.value)} r={2.5} fill="#0284c7" />))}
                          </>
                        )}
                        {labels.length===3 && (
                          <>
                            <text x={0} y={ch+16} textAnchor="start" style={{ fill: '#6b7280', fontSize: 11 }}>{labels[0]}</text>
                            <text x={cw/2} y={ch+16} textAnchor="middle" style={{ fill: '#6b7280', fontSize: 11 }}>{labels[1]}</text>
                            <text x={cw} y={ch+16} textAnchor="end" style={{ fill: '#6b7280', fontSize: 11 }}>{labels[2]}</text>
                          </>
                        )}
                      </g>
                    </svg>
                  </div>
                )
              })()}
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>On‑time vs Late</div>
              {onTime+late === 0 ? (
                <div className="muted">No timed submissions yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 40px', gap: 8, alignItems: 'center' }}>
                    <div className="muted">On‑time</div>
                    <div style={{ height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${onTimePct}%`, height: '100%', background: '#10b981' }} />
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>{onTimePct}%</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 40px', gap: 8, alignItems: 'center' }}>
                    <div className="muted">Late</div>
                    <div style={{ height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${100-onTimePct}%`, height: '100%', background: '#ef4444' }} />
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>{100-onTimePct}%</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{minWidth:240}}>Title</th>
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
        </>
      )}
    </div>
  )
}
