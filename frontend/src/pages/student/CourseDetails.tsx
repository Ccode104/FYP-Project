import { useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { courses } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'
import { getUserCourses } from '../../data/userCourses'
import { getCustomAssignments, addCustomAssignment } from '../../data/courseOverlays'
import { addSubmission, getSubmissions, setSubmissionGrade } from '../../data/submissions'
import { apiFetch, apiForm } from '../../services/api'
import './CourseDetails.css'
import { useToast } from '../../components/ToastProvider'

function BackendSubmissions({ assignments }: { assignments: any[] }) {
  const [assignmentId, setAssignmentId] = useState<string>('')
  const [items, setItems] = useState<any[]>([])
  const load = async (id: string) => {
    if (!id) { setItems([]); return }
    const data = await apiFetch<{ submissions: any[] }>(`/api/assignments/${id}/submissions`)
    setItems(data.submissions || [])
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select className="select" value={assignmentId} onChange={(e) => { setAssignmentId(e.target.value); void load(e.target.value) }}>
          <option value="">Select assignment</option>
          {assignments.map((a: any) => (<option key={a.id} value={a.id}>{a.title}</option>))}
        </select>
      </div>
      {items.length === 0 ? <p className="muted">No submissions yet.</p> : (
        <ul className="list">
          {items.map((s) => (
            <li key={s.id}>
              {s.files?.[0]?.filename || 'file'} — {s.student_name || s.student_email}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BackendGrading({ assignments, onSave }: { assignments: any[]; onSave: (sid: string, letter: string) => void }) {
  const [assignmentId, setAssignmentId] = useState<string>('')
  const [items, setItems] = useState<any[]>([])
  const [grades, setGrades] = useState<Record<string, string>>({})
  const load = async (id: string) => {
    if (!id) { setItems([]); return }
    const data = await apiFetch<{ submissions: any[] }>(`/api/assignments/${id}/submissions`)
    setItems(data.submissions || [])
  }
  const save = async (sid: string) => {
    const letter = grades[sid]
    if (!letter) return
    const map: Record<string, number> = { A: 95, B: 85, C: 75, D: 65, E: 55, F: 45 }
    await apiFetch('/api/submissions/grade', { method: 'POST', body: { submission_id: Number(sid), score: map[letter] ?? 0, feedback: null } })
    onSave(sid, letter)
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select className="select" value={assignmentId} onChange={(e) => { setAssignmentId(e.target.value); void load(e.target.value) }}>
          <option value="">Select assignment</option>
          {assignments.map((a: any) => (<option key={a.id} value={a.id}>{a.title}</option>))}
        </select>
      </div>
      {items.length === 0 ? <p className="muted">No submissions to grade.</p> : (
        <ul className="list">
          {items.map((s) => (
            <li key={s.id}>
              {s.files?.[0]?.filename || 'file'} — {s.student_name || s.student_email}
              <select className="select" style={{ marginLeft: 8 }} value={grades[s.id] ?? ''} onChange={(e) => setGrades((m) => ({ ...m, [s.id]: e.target.value }))}>
                <option value="">Select grade</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
              </select>
              <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={() => void save(s.id)}>Save</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function CourseDetails() {
  const { courseId } = useParams()
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<'present' | 'past' | 'pyq' | 'notes' | 'manage' | 'submissions' | 'grading'>('present')
  const isBackend = !!courseId && /^\d+$/.test(courseId)
  const { push } = useToast()

  const course = useMemo(() => {
    if (!courseId) return undefined
    if (/^\d+$/.test(courseId)) {
      // backend mode uses offeringId; we won’t have local course meta
      return { id: courseId, title: `Offering #${courseId}`, description: 'Backend course offering', assignmentsPast: [], assignmentsPresent: [], pyq: [], notes: [] }
    }
    const fromDefault = courses.find((c) => c.id === courseId)
    if (fromDefault) return fromDefault
    if (!user) return undefined
    const mine = getUserCourses(user.id)
    return mine.find((c) => c.id === courseId)
  }, [courseId, user])

  const [file, setFile] = useState<File | null>(null)
  const submitAssignment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !courseId) return alert('Please choose a file to upload!')
    // Record submission for teacher/TA views
    addSubmission(courseId, user?.name ?? 'Student', file.name)
    setTimeout(() => {
      alert(`Submitted ${file.name} for ${course?.title}`)
      setFile(null)
    }, 200)
  }

  if (!course) return <div style={{ padding: 24 }}>Course not found</div>

  const customPresent = courseId ? getCustomAssignments(courseId) : []
  const [backendAssignments, setBackendAssignments] = useState<any[]>([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('')
  const presentAssignments = isBackend ? backendAssignments : [...customPresent, ...course!.assignmentsPresent]
  const submissions = courseId && !isBackend ? getSubmissions(courseId) : []
  const [backendPYQ, setBackendPYQ] = useState<any[]>([])
  const [backendNotes, setBackendNotes] = useState<any[]>([])

  const [newAssnTitle, setNewAssnTitle] = useState('')
  const [newAssnDue, setNewAssnDue] = useState('')
  const addAssn = async () => {
    if (!courseId) return
    const title = newAssnTitle.trim()
    if (!title) return
    if (isBackend) {
      // create real assignment
      await apiFetch('/api/assignments', {
        method: 'POST',
        body: { course_offering_id: Number(courseId), title, description: '', assignment_type: 'file', due_at: newAssnDue || null },
      })
      const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
      setBackendAssignments(data)
      push({ kind: 'success', message: 'Assignment added' })
    } else {
      addCustomAssignment(courseId, title, newAssnDue.trim() || undefined)
    }
    setNewAssnTitle('')
    setNewAssnDue('')
    setTab('present')
  }

  const [gradeMap, setGradeMap] = useState<Record<string, string>>({})
  const saveGrade = (sid: string) => {
    if (!courseId) return
    const g = gradeMap[sid]
    if (!g) return
    if (isBackend) {
      // Map letter to score roughly
      const map: Record<string, number> = { A: 95, B: 85, C: 75, D: 65, E: 55, F: 45 }
      apiFetch('/api/submissions/grade', { method: 'POST', body: { submission_id: Number(sid), score: map[g] ?? 0, feedback: null } }).then(() => push({ kind: 'success', message: 'Grade saved' })).catch(() => push({ kind: 'error', message: 'Grade failed' }))
    } else {
      setSubmissionGrade(courseId, sid, g)
    }
  }

  // Load backend assignments if in backend mode
  if (isBackend) {
    // fire-and-forget fetch
    void (async () => {
      try {
        const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
        setBackendAssignments(data)
        const pyq = await apiFetch<any[]>(`/api/courses/${courseId}/pyqs`)
        setBackendPYQ(pyq)
        const notes = await apiFetch<any[]>(`/api/courses/${courseId}/notes`)
        setBackendNotes(notes)
      } catch {}
    })()
  }

  return (
    <div className="container">
      <header className="topbar">
        <h2>
          {course.title} — {user?.role.toUpperCase()}
        </h2>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => history.back()}>Back</button>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === 'present' ? 'active' : ''} onClick={() => setTab('present')} aria-pressed={tab === 'present'}>
          Assignments (Present)
        </button>
        <button className={tab === 'past' ? 'active' : ''} onClick={() => setTab('past')} aria-pressed={tab === 'past'}>
          Assignments (Past)
        </button>
        <button className={tab === 'pyq' ? 'active' : ''} onClick={() => setTab('pyq')} aria-pressed={tab === 'pyq'}>
          PYQ
        </button>
        <button className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')} aria-pressed={tab === 'notes'}>
          Notes
        </button>
        {user?.role === 'teacher' && (
          <>
            <button className={tab === 'manage' ? 'active' : ''} onClick={() => setTab('manage')} aria-pressed={tab === 'manage'}>
              Upload Assignment
            </button>
            <button className={tab === 'submissions' ? 'active' : ''} onClick={() => setTab('submissions')} aria-pressed={tab === 'submissions'}>
              Submissions
            </button>
          </>
        )}
        {user?.role === 'ta' && (
          <button className={tab === 'grading' ? 'active' : ''} onClick={() => setTab('grading')} aria-pressed={tab === 'grading'}>
            Grading
          </button>
        )}
      </nav>

      {tab === 'present' && (
        <section className="card">
          <h3>Open Assignments</h3>
          <ul className="list">
            {presentAssignments.map((a) => (
              <li key={a.id}>
                {a.title} {a.dueDate ? `(Due: ${a.dueDate})` : ''}
              </li>
            ))}
          </ul>
          {user?.role === 'student' && (
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (isBackend) {
                if (!file || !selectedAssignmentId) return alert('Choose a file and assignment')
                const form = new FormData()
                form.append('assignment_id', selectedAssignmentId)
                form.append('files', file)
                try {
                  await apiForm('/api/submissions/submit/files', form)
                  push({ kind: 'success', message: 'Submission uploaded' })
                  setFile(null)
                } catch (err: any) {
                  push({ kind: 'error', message: 'Submission failed' })
                }
              } else {
                submitAssignment(e)
              }
            }} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
              {isBackend && (
                <select className="select" value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)}>
                  <option value="">Select assignment</option>
                  {presentAssignments.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              )}
              <input className="input" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <button className="btn btn-primary" type="submit">Upload & Submit</button>
            </form>
          )}
        </section>
      )}

      {tab === 'past' && (
        <section className="card">
          <h3>Past Assignments</h3>
          <ul className="list">
            {course.assignmentsPast.map((a) => (
              <li key={a.id}>
                {a.title} {a.submitted ? '✓ Submitted' : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {user?.role === 'teacher' && tab === 'manage' && (
        <section className="card">
          <h3>Upload Assignment</h3>
          <div className="form" style={{ maxWidth: 520 }}>
            <label className="field">
              <span className="label">Title</span>
              <input className="input" value={newAssnTitle} onChange={(e) => setNewAssnTitle(e.target.value)} placeholder="Assignment title" />
            </label>
            <label className="field">
              <span className="label">Due date</span>
              <input className="input" value={newAssnDue} onChange={(e) => setNewAssnDue(e.target.value)} placeholder="YYYY-MM-DD (optional)" />
            </label>
            <div>
              <button className="btn btn-primary" onClick={addAssn}>Add assignment</button>
            </div>
          </div>
        </section>
      )}

      {user?.role === 'teacher' && tab === 'submissions' && (
        <section className="card">
          <h3>Student Submissions</h3>
          {!isBackend ? (
            submissions.length === 0 ? (
              <p className="muted">No submissions yet.</p>
            ) : (
              <ul className="list">
                {submissions.map((s) => (
                  <li key={s.id}>
                    {s.fileName} — {s.student} <span className="muted">({new Date(s.submittedAt).toLocaleString()})</span>
                    {s.grade ? ` — Grade: ${s.grade}` : ''}
                  </li>
                ))}
              </ul>
            )
          ) : (
            <BackendSubmissions assignments={presentAssignments} />
          )}
        </section>
      )}

      {user?.role === 'ta' && tab === 'grading' && (
        <section className="card">
          <h3>Grade Submissions</h3>
          {!isBackend ? (
            submissions.length === 0 ? (
              <p className="muted">No submissions to grade.</p>
            ) : (
              <ul className="list">
                {submissions.map((s) => (
                  <li key={s.id}>
                    {s.fileName} — {s.student}
                    <select
                      className="select"
                      style={{ marginLeft: 8 }}
                      value={gradeMap[s.id] ?? s.grade ?? ''}
                      onChange={(e) => setGradeMap((m) => ({ ...m, [s.id]: e.target.value }))}
                    >
                      <option value="">Select grade</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                      <option value="F">F</option>
                    </select>
                    <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={() => saveGrade(s.id)}>Save</button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <BackendGrading assignments={presentAssignments} onSave={(sid, letter) => setGradeMap((m) => ({ ...m, [sid]: letter }))} />
          )}
        </section>
      )}

      {tab === 'pyq' && (
        <section className="card">
          <h3>Previous Year Questions</h3>
          <ul className="list">
            {(isBackend ? backendPYQ : course.pyq).map((p: any) => (
              <li key={p.id}>
                <a href={p.url || p.storage_path || '#'} target="_blank">{p.title || p.filename || 'PYQ'}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'notes' && (
        <section className="card">
          <h3>Notes</h3>
          <ul className="list">
            {(isBackend ? backendNotes : course.notes).map((n: any) => (
              <li key={n.id}>
                <a href={n.url || n.storage_path || '#'} target="_blank">{n.title || n.filename || 'Note'}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
