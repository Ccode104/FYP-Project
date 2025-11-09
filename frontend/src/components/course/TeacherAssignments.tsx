import { useState } from 'react'
import { apiFetch } from '../../services/api'

export default function TeacherAssignments({
  assignments,
  onViewCode,
}: {
  assignments: any[]
  onViewCode?: (submission: any) => void
}) {
  const [selectedId, setSelectedId] = useState<string>('')
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [submissions, setSubmissions] = useState<any[]>([])

  const load = async (id: string) => {
    if (!id) { setSubmissions([]); setSelected(null); return }
    setLoading(true)
    try {
      const data = await apiFetch<{ submissions: any[] }>(`/api/assignments/${id}/submissions`)
      setSubmissions(data.submissions || [])
      const assn = assignments.find((a: any) => String(a.id) === String(id))
      setSelected(assn)
    } catch {
      setSubmissions([])
      setSelected(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card">
      <h3>Assignments</h3>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 320 }}>
          <select
            className="select"
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); void load(e.target.value) }}
            style={{ width: '100%' }}
          >
            <option value="">Select assignment</option>
            {assignments.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.title} {a.due_at ? `(Due: ${new Date(a.due_at).toLocaleString()})` : ''}
              </option>
            ))}
          </select>
          {selected && (
            <div style={{ marginTop: 12, fontSize: 14, color: '#6b7280' }}>
              <div>Type: {selected.assignment_type || 'file'}</div>
              {selected.release_at && <div>Release: {new Date(selected.release_at).toLocaleString()}</div>}
              {selected.due_at && <div>Due: {new Date(selected.due_at).toLocaleString()}</div>}
            </div>
          )}
        </div>

        {/* Right: submissions table */}
        <div style={{ flex: 1 }}>
          {!selectedId ? (
            <p className="muted">Select an assignment to view student progress.</p>
          ) : loading ? (
            <p className="muted">Loading...</p>
          ) : submissions.length === 0 ? (
            <p className="muted">No submissions yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', minWidth: 640 }}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Submitted At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s: any) => {
                    const status = typeof s.score === 'number' ? 'graded' : 'submitted'
                    return (
                      <tr key={s.id}>
                        <td>{s.student_name || s.student_email || 'Student'}</td>
                        <td>{status}</td>
                        <td>{typeof s.score === 'number' ? s.score : '-'}</td>
                        <td>{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '-'}</td>
                        <td>
                          {selected?.assignment_type === 'code' && onViewCode && (
                            <button
                              className="btn btn-primary"
                              onClick={async () => {
                                const detail = await apiFetch<{ submission: any }>(`/api/submissions/${s.id}`)
                                onViewCode(detail.submission)
                              }}
                            >
                              View Code
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
