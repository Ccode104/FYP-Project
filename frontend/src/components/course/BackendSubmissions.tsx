import { useState } from 'react'
import { apiFetch } from '../../services/api'

function BackendSubmissions({ assignments, onViewCode }: { assignments: any[]; onViewCode?: (submission: any) => void }) {
  const [assignmentId, setAssignmentId] = useState<string>('')
  const [items, setItems] = useState<any[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const load = async (id: string) => {
    if (!id) { setItems([]); setSelectedAssignment(null); return }
    const data = await apiFetch<{ submissions: any[] }>(`/api/assignments/${id}/submissions`)
    setItems(data.submissions || [])
    const assn = assignments.find((a: any) => String(a.id) === String(id))
    setSelectedAssignment(assn)
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select className="select" value={assignmentId} onChange={(e) => { setAssignmentId(e.target.value); void load(e.target.value) }}>
          <option value="">Select assignment</option>
          {assignments.map((a: any) => (<option key={a.id} value={a.id}>{a.title} ({a.assignment_type || 'file'})</option>))}
        </select>
      </div>
      {items.length === 0 ? <p className="muted">No submissions yet.</p> : (
        <ul className="list">
          {items.map((s) => (
            <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1 }}>
                {selectedAssignment?.assignment_type === 'code' ? '💻 Code submission' : (s.files?.[0]?.filename || 'file')} — {s.student_name || s.student_email}
              </span>
              {selectedAssignment?.assignment_type === 'code' && onViewCode && (
                <button className="btn btn-primary" onClick={async () => {
                  const detail = await apiFetch<{ submission: any }>(`/api/submissions/${s.id}`)
                  onViewCode(detail.submission)
                }}>View Code</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default BackendSubmissions
