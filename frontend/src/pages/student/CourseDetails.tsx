import { useParams } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { courses } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'
import { getUserCourses } from '../../data/userCourses'
import { getCustomAssignments, addCustomAssignment } from '../../data/courseOverlays'
import { addSubmission, getSubmissions, setSubmissionGrade } from '../../data/submissions'
// ...existing code...
import './CourseDetails.css'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../services/api'
import { type ProgressRow } from '../../services/progress'

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

function MenuTiny({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn" onClick={(e)=>{ e.stopPropagation(); setOpen((v)=>!v) }} aria-label="More">⋮</button>
      {open && (
        <div className="card" style={{ position: 'absolute', right: 0, marginTop: 4, zIndex: 10 }}>
          <button className="btn" onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete() }}>Delete</button>
        </div>
      )}
    </div>
  )
}

function groupBy<T, K extends keyof any>(list: T[], getKey: (item: T) => K): Record<K, T[]> {
  return list.reduce((acc, item) => {
    const k = getKey(item)
    ;(acc as any)[k] ||= []
    ;(acc as any)[k].push(item)
    return acc
  }, {} as Record<K, T[]>)
}

function StudentProgressEmbed() {
  const [rows, setRows] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      try {
        // Student progress: call /api/progress/me
        const r = await apiFetch<{ rows: ProgressRow[] }>('/api/progress/me')
        setRows(r.rows || [])
      } catch(e:any){ setError(e?.message||'Failed to load') }
      finally { setLoading(false) }
    })()
  }, [])
  const totalMax = rows.reduce((s, r)=> s + (r.max_score||0), 0)
  const totalScore = rows.reduce((s, r)=> s + (r.score||0), 0)
  const pct = totalMax>0 ? Math.round((totalScore/totalMax)*100) : 0
  const byType = groupBy(rows, (r)=> r.activity_type)
  return (
    <div>
      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{error}</div> : null}
      {!loading && rows.length===0 ? <p className="muted">No progress yet.</p> : (
        <>
          <div className="muted" style={{ marginBottom: 8 }}>Overall: {totalScore} / {totalMax} ({pct}%)</div>
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

function CourseProgressEmbed({ offeringId }: { offeringId: string }) {
  const [rows, setRows] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      try {
        // Staff progress: call /api/progress/course/:offeringId
        const r = await apiFetch<{ rows: ProgressRow[] }>(`/api/progress/course/${offeringId}`)
        setRows(r.rows || [])
      } catch(e:any){ setError(e?.message||'Failed to load') }
      finally { setLoading(false) }
    })()
  }, [offeringId])
  const byStudent = useMemo(() => groupBy(rows, (r)=> String(r.student_id||'unknown')), [rows])
  return (
    <div>
      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{error}</div> : null}
      {Object.keys(byStudent).length===0 && !loading ? <p className="muted">No data.</p> : (
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
          {Object.entries(byStudent).map(([sid, items]) => {
            const name = items[0]?.student_name || items[0]?.student_email || `Student #${sid}`
            const totalMax = items.reduce((s, r) => s + (r.max_score || 0), 0)
            const totalScore = items.reduce((s, r) => s + (r.score || 0), 0)
            const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
            const byType = groupBy(items, (r)=> r.activity_type)
            return (
              <section key={sid} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ margin: 0 }}>{name}</h4>
                  <div className="muted">{totalScore} / {totalMax} ({pct}%)</div>
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

export default function CourseDetails() {
  const { courseId } = useParams()
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<'present' | 'past' | 'pyq' | 'notes' | 'manage' | 'submissions' | 'grading' | 'progress' | 'discussion'>('present')
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
  const [linkUrl, setLinkUrl] = useState('')
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
  const [discussion, setDiscussion] = useState<any[]>([])
  const [newTopMessage, setNewTopMessage] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})

  const [newAssnTitle, setNewAssnTitle] = useState('')
  const [newAssnDesc, setNewAssnDesc] = useState('')
  const [newAssnType, setNewAssnType] = useState<'file' | 'code' | 'link'>('file')
  const [newAssnRelease, setNewAssnRelease] = useState('')
  const [newAssnDue, setNewAssnDue] = useState('')
  const [newAssnMax, setNewAssnMax] = useState('100')
  const [newAssnMulti, setNewAssnMulti] = useState(false)
  const addAssn = async () => {
    if (!courseId) return
    const title = newAssnTitle.trim()
    if (!title) return
    if (isBackend) {
      // create real assignment with extended fields
      await apiFetch('/api/assignments', {
        method: 'POST',
        body: {
          course_offering_id: Number(courseId),
          title,
          description: newAssnDesc,
          assignment_type: newAssnType,
          release_at: newAssnRelease || null,
          due_at: newAssnDue || null,
          max_score: Number(newAssnMax) || 100,
          allow_multiple_submissions: newAssnMulti,
        },
      })
      const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
      setBackendAssignments(data)
      push({ kind: 'success', message: 'Assignment added' })
    } else {
      addCustomAssignment(courseId, title, newAssnDue.trim() || undefined)
    }
    setNewAssnTitle('')
    setNewAssnDesc('')
    setNewAssnType('file')
    setNewAssnRelease('')
    setNewAssnDue('')
    setNewAssnMax('100')
    setNewAssnMulti(false)
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

  // Load backend assignments, pyqs, notes and discussion when in backend mode
  useEffect(() => {
    if (!isBackend) return;
    let mounted = true;

    (async () => {
      try {
        const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
        const pyq = await apiFetch<any[]>(`/api/courses/${courseId}/pyqs`)
        const notes = await apiFetch<any[]>(`/api/courses/${courseId}/notes`)
        if (!mounted) return;
        setBackendAssignments(data)
        setBackendPYQ(pyq)
        setBackendNotes(notes)
      } catch (err) {
        // ignore transient errors for now
      }
    })();

    (async () => {
      try {
        const { listDiscussionMessages } = await import('../../services/discussion')
        const items = await listDiscussionMessages(courseId!)
        if (!mounted) return;
        setDiscussion(items)
      } catch (err) {
        // ignore
      }
    })();

    return () => { mounted = false }
  }, [isBackend, courseId])

  return (
    <div className="course-details-page">
    <div className="container">
      <header className="topbar">
        <h2>
          {course.title} - {user?.role.toUpperCase()}
        </h2>
        <div className="actions">
          {isBackend && (
            <button className="btn" onClick={() => setTab('discussion')}>Discussion</button>
          )}
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
        {isBackend && (
          <button className={tab === 'progress' ? 'active' : ''} onClick={() => setTab('progress')} aria-pressed={tab === 'progress'}>
            Progress
          </button>
        )}
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
            {isBackend && (
          <button className={tab === 'discussion' ? 'active' : ''} onClick={() => setTab('discussion')} aria-pressed={tab === 'discussion'}>
            Discussion
          </button>
        )}
      </nav>

          {tab === 'present' && (
            <section className="card">
              <h3>Open Assignments</h3>
              <ul className="list">
                {presentAssignments.map((a: any) => (
                  <li key={a.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ flex: 1 }}>{a.title} {a.dueDate ? `(Due: ${a.dueDate})` : ''}</span>
                    {isBackend && user?.role === 'teacher' && (
                      <MenuTiny onDelete={async () => { try { await (await import('../../services/assignments')).deleteAssignmentApi(Number(a.id)); push({ kind: 'success', message: 'Assignment deleted' }); const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`); setBackendAssignments(data) } catch (e: any) { push({ kind: 'error', message: e?.message || 'Failed' }) } }} />
                    )}
                  </li>
                ))}
              </ul>
              {user?.role === 'student' && (
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  if (isBackend) {
                    if (!selectedAssignmentId || !linkUrl.trim()) return push({ kind: 'error', message: 'Add assignment and URL' })
                    try {
                      await apiFetch('/api/submissions/submit/link', { method: 'POST', body: { assignment_id: Number(selectedAssignmentId), url: linkUrl.trim() } })
                      push({ kind: 'success', message: 'Link submitted' })
                      setLinkUrl('')
                    } catch (err: any) {
                      push({ kind: 'error', message: err?.message || 'Submission failed' })
                    }
                  } else {
                    submitAssignment(e)
                  }
                }} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                  {isBackend && (
                    <>
                      <select className="select" value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)}>
                        <option value="">Select assignment</option>
                        {presentAssignments.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.title}</option>
                        ))}
                      </select>
                      <input className="input" style={{ flex: 1, minWidth: 260 }} placeholder="Submission URL (e.g., Google Drive link)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                    </>
                  )}
                  {!isBackend && (
                    <input className="input" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  )}
                  <button className="btn btn-primary" type="submit">Submit</button>
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
          <h3>Create Assignment</h3>
          <div className="form" style={{ maxWidth: 640 }}>
            <label className="field">
              <span className="label"></span>
              <input className="input" value={newAssnTitle} onChange={(e) => setNewAssnTitle(e.target.value)} placeholder="Assignment title" />
            </label>
            <label className="field">
              <span className="label"></span>
              <input className="input" value={newAssnDesc} onChange={(e) => setNewAssnDesc(e.target.value)} placeholder="Optional details" />
            </label>
            <label className="field">
              <span className="label"></span>
              <select className="select" value={newAssnType} onChange={(e) => setNewAssnType(e.target.value as any)}>
                <option value="file">File</option>
                <option value="code">Code</option>
                <option value="link">Link</option>
              </select>
            </label>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label className="field">
                <span className="label"></span>
                <input className="input" value={newAssnRelease} onChange={(e) => setNewAssnRelease(e.target.value)} placeholder="Release at (YYYY-MM-DDTHH:mm)" />
              </label>
              <label className="field">
                <span className="label"></span>
                <input className="input" value={newAssnDue} onChange={(e) => setNewAssnDue(e.target.value)} placeholder="Due at (YYYY-MM-DDTHH:mm)" />
              </label>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label className="field">
                <span className="label"></span>
                <input className="input" value={newAssnMax} onChange={(e) => setNewAssnMax(e.target.value)} placeholder="Max score (e.g 100)" />
              </label>
              <label className="field" style={{ alignItems: 'center' }}>
                <span className="label">Allow multiple submissions</span>
                <input type="checkbox" checked={newAssnMulti} onChange={(e) => setNewAssnMulti(e.target.checked)} />
              </label>
            </div>
            <div>
              <button className="btn btn-primary" onClick={addAssn}>Create assignment</button>
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

      {isBackend && tab === 'discussion' && (
        <section className="card">
          <h3>Discussion Forum</h3>
          {(user?.role === 'teacher' || user?.role === 'ta') && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const msg = newTopMessage.trim();
              if (!msg) return;
              try {
                const { postDiscussionMessage, listDiscussionMessages } = await import('../../services/discussion')
                await postDiscussionMessage(courseId!, msg)
                setNewTopMessage('')
                const items = await listDiscussionMessages(courseId!)
                setDiscussion(items)
                push({ kind: 'success', message: 'Posted' })
              } catch (err:any) {
                push({ kind: 'error', message: err?.message || 'Failed to post' })
              }
            }} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="input" placeholder="New announcement" value={newTopMessage} onChange={(e) => setNewTopMessage(e.target.value)} />
              <button className="btn btn-primary" type="submit">Post</button>
            </form>
          )}

          {discussion.length === 0 ? <p className="muted">No messages yet.</p> : (
            <ul className="list">
              {discussion.filter((m:any)=>!m.parent_id).map((m:any)=> (
                <li key={m.id}>
                  <div><strong>{m.author_name || 'User'}</strong> <span className="muted">• {new Date(m.created_at).toLocaleString()}</span></div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  <div style={{ marginTop: 6, paddingLeft: 12, borderLeft: '2px solid #e5e7eb' }}>
                    {discussion.filter((x:any)=>x.parent_id===m.id).map((r:any)=> (
                      <div key={r.id} style={{ margin: '6px 0' }}>
                        <strong>{r.author_name || 'User'}</strong> <span className="muted">• {new Date(r.created_at).toLocaleString()}</span>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{r.content}</div>
                      </div>
                    ))}
                    {user?.role === 'student' && (
                      <form onSubmit={async (e)=>{
                        e.preventDefault();
                        const text = (replyDrafts[m.id]||'').trim();
                        if (!text) return;
                        try {
                          const { postDiscussionMessage, listDiscussionMessages } = await import('../../services/discussion')
                          await postDiscussionMessage(courseId!, text, m.id)
                          setReplyDrafts((d)=>({ ...d, [m.id]: '' }))
                          const items = await listDiscussionMessages(courseId!)
                          setDiscussion(items)
                          push({ kind: 'success', message: 'Replied' })
                        } catch (err:any) {
                          push({ kind: 'error', message: err?.message || 'Reply failed' })
                        }
                      }} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input className="input" placeholder="Reply" value={replyDrafts[m.id]||''} onChange={(e)=> setReplyDrafts((d)=>({ ...d, [m.id]: e.target.value }))} />
                        <button className="btn" type="submit">Reply</button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'progress' && isBackend && (
        <section className="card">
          <h3>Progress</h3>
          {user?.role === 'student' ? (
            <StudentProgressEmbed />
          ) : (
            <CourseProgressEmbed offeringId={courseId!} />
          )}
        </section>
      )}
        </div>
      </div>
  )
}
