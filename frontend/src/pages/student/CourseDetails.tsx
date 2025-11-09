import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, useRef } from 'react'
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
import QuizCreator from '../../components/QuizCreator'
import VideoUpload from '../../components/VideoUpload'
import InteractiveVideoPlayer from '../../components/InteractiveVideoPlayer'
import VideoQuestionManager from '../../components/VideoQuestionManager'
import VideoQuizResults from '../../components/VideoQuizResults'
import Modal from '../../components/Modal'

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
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'present' | 'past' | 'pyq' | 'notes' | 'quizzes' | 'manage' | 'submissions' | 'grading' | 'progress' | 'discussion' | 'videos'>('present')
  const [backendVideos, setBackendVideos] = useState<any[]>([])
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null)
  const [videoQuestions, setVideoQuestions] = useState<any[]>([])
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0)
  const videoRefForFaculty = useRef<HTMLVideoElement>(null)
  const [assignmentCreationType, setAssignmentCreationType] = useState<'selection' | 'code' | 'quiz' | 'pdf'>('selection')
  const [showVideoUpload, setShowVideoUpload] = useState(false)
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
  const [backendQuizzes, setBackendQuizzes] = useState<any[]>([])

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

  // Load backend data once per offering id
  useEffect(() => {
    let cancelled = false
    if (!isBackend || !courseId) return
    ;(async () => {
      try { const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`); if (!cancelled) setBackendAssignments(data) } catch {}
      try { const pyq = await apiFetch<any[]>(`/api/courses/${courseId}/pyqs`); if (!cancelled) setBackendPYQ(pyq) } catch {}
      try { const notes = await apiFetch<any[]>(`/api/courses/${courseId}/notes`); if (!cancelled) setBackendNotes(notes) } catch {}
        // quizzes list for offering
        const quizzes = await (await import('../../services/quizzes')).listCourseQuizzes(Number(courseId))
        setBackendQuizzes(quizzes)
      try { const { listDiscussionMessages } = await import('../../services/discussion'); const items = await listDiscussionMessages(courseId!); if (!cancelled) setDiscussion(items) } catch {}
      // Load videos for this course offering
      try {
        const { getVideosByCourseOffering } = await import('../../services/videos');
        const videosData = await getVideosByCourseOffering(courseId!);
        if (!cancelled) setBackendVideos(videosData.videos || []);
      } catch {}
    })()
    return () => { cancelled = true }
  }, [courseId, isBackend])

  // Load questions when video is selected
  useEffect(() => {
    if (!selectedVideo || user?.role !== 'teacher') return;
    (async () => {
      try {
        const { getVideoQuizQuestions } = await import('../../services/videos');
        const questionsData = await getVideoQuizQuestions(selectedVideo.id);
        setVideoQuestions(questionsData.questions || []);
      } catch {}
    })();
  }, [selectedVideo, user?.role])

  return (
    <div className="course-details-page">
    <div className="container">
      <div className="course-header">
        <div className="course-header-content">
          <button className="back-button" onClick={() => navigate(-1)} aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="course-title-section">
            <h1 className="course-title">{course.title}</h1>
            <p className="course-role">{user?.role.toUpperCase()}</p>
          </div>
        </div>
        {isBackend && (
          <button className="btn btn-primary" onClick={() => setTab('discussion')}>
            Discussion
          </button>
        )}
      </div>

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
            <button className={tab === 'quizzes' ? 'active' : ''} onClick={() => setTab('quizzes')} aria-pressed={tab === 'quizzes'}>
          Quizzes
        </button>
        {isBackend && (
          <button className={tab === 'videos' ? 'active' : ''} onClick={() => setTab('videos')} aria-pressed={tab === 'videos'}>
            Videos
          </button>
        )}
        {user?.role === 'teacher' && (
              <>
                <button className={tab === 'manage' ? 'active' : ''} onClick={() => setTab('manage')} aria-pressed={tab === 'manage'}>
                  Manage Assignment
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

      {tab === 'quizzes' && (
        <section className="card">
          <h3>Quizzes</h3>
          {isBackend ? (
            backendQuizzes.length === 0 ? <p className="muted">No quizzes available.</p> : (
              <ul className="list">
                {backendQuizzes.map((q:any) => (
                  <li key={q.id}>
                    {q.title} {q.start_at ? `(Opens: ${new Date(q.start_at).toLocaleString()})` : ''}
                    <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={() => location.assign(`/quizzes/${q.id}`)}>Start</button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="muted">Local course mode does not support quizzes.</p>
          )}
        </section>
      )}

      {user?.role === 'teacher' && tab === 'manage' && (
        <section className="card">
          {assignmentCreationType === 'selection' && (
            <>
              <h3>Create Assignment</h3>
              <p className="muted" style={{ marginBottom: 16 }}>Choose the type of assignment you want to create:</p>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 16, maxWidth: 800 }}>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: 24, fontSize: 16, height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                  onClick={() => setAssignmentCreationType('code')}
                >
                  <span style={{ fontSize: 32 }}>💻</span>
                  <span>Code-based</span>
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: 24, fontSize: 16, height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                  onClick={() => setAssignmentCreationType('quiz')}
                >
                  <span style={{ fontSize: 32 }}>📝</span>
                  <span>Quiz-based</span>
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: 24, fontSize: 16, height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                  onClick={() => setAssignmentCreationType('pdf')}
                >
                  <span style={{ fontSize: 32 }}>📄</span>
                  <span>PDF Submission</span>
                </button>
              </div>
            </>
          )}

          {assignmentCreationType === 'pdf' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <button className="btn" onClick={() => setAssignmentCreationType('selection')} style={{ marginRight: 8 }}>← Back</button>
                <h3 style={{ margin: 0 }}>Create PDF Submission Assignment</h3>
              </div>
              <div className="form" style={{ maxWidth: 640 }}>
                <label className="field">
                  <span className="label">Title</span>
                  <input className="input" value={newAssnTitle} onChange={(e) => setNewAssnTitle(e.target.value)} placeholder="Assignment title" />
                </label>
                <label className="field">
                  <span className="label">Description</span>
                  <input className="input" value={newAssnDesc} onChange={(e) => setNewAssnDesc(e.target.value)} placeholder="Optional details" />
                </label>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label className="field">
                    <span className="label">Release at</span>
                    <input className="input" value={newAssnRelease} onChange={(e) => setNewAssnRelease(e.target.value)} placeholder="YYYY-MM-DDTHH:mm" />
                  </label>
                  <label className="field">
                    <span className="label">Due at</span>
                    <input className="input" value={newAssnDue} onChange={(e) => setNewAssnDue(e.target.value)} placeholder="YYYY-MM-DDTHH:mm" />
                  </label>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label className="field">
                    <span className="label">Max score</span>
                    <input className="input" value={newAssnMax} onChange={(e) => setNewAssnMax(e.target.value)} placeholder="100" />
                  </label>
                  <label className="field" style={{ alignItems: 'center' }}>
                    <span className="label">Allow multiple submissions</span>
                    <input type="checkbox" checked={newAssnMulti} onChange={(e) => setNewAssnMulti(e.target.checked)} />
                  </label>
                </div>
                <div>
                  <button className="btn btn-primary" onClick={() => { setNewAssnType('file'); addAssn(); }}>Create PDF Assignment</button>
                </div>
              </div>
            </>
          )}

          {assignmentCreationType === 'code' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <button className="btn" onClick={() => setAssignmentCreationType('selection')} style={{ marginRight: 8 }}>← Back</button>
                <h3 style={{ margin: 0 }}>Create Code-based Assignment</h3>
              </div>
              <div className="form" style={{ maxWidth: 640 }}>
                <label className="field">
                  <span className="label">Title</span>
                  <input className="input" value={newAssnTitle} onChange={(e) => setNewAssnTitle(e.target.value)} placeholder="Assignment title" />
                </label>
                <label className="field">
                  <span className="label">Description</span>
                  <input className="input" value={newAssnDesc} onChange={(e) => setNewAssnDesc(e.target.value)} placeholder="Optional details" />
                </label>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label className="field">
                    <span className="label">Release at</span>
                    <input className="input" value={newAssnRelease} onChange={(e) => setNewAssnRelease(e.target.value)} placeholder="YYYY-MM-DDTHH:mm" />
                  </label>
                  <label className="field">
                    <span className="label">Due at</span>
                    <input className="input" value={newAssnDue} onChange={(e) => setNewAssnDue(e.target.value)} placeholder="YYYY-MM-DDTHH:mm" />
                  </label>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label className="field">
                    <span className="label">Max score</span>
                    <input className="input" value={newAssnMax} onChange={(e) => setNewAssnMax(e.target.value)} placeholder="100" />
                  </label>
                  <label className="field" style={{ alignItems: 'center' }}>
                    <span className="label">Allow multiple submissions</span>
                    <input type="checkbox" checked={newAssnMulti} onChange={(e) => setNewAssnMulti(e.target.checked)} />
                  </label>
                </div>
                <div>
                  <button className="btn btn-primary" onClick={() => { setNewAssnType('code'); addAssn(); }}>Create Code Assignment</button>
                </div>
              </div>
            </>
          )}

          {assignmentCreationType === 'quiz' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <button className="btn" onClick={() => setAssignmentCreationType('selection')} style={{ marginRight: 8 }}>← Back</button>
                <h3 style={{ margin: 0 }}>Create Quiz-based Assignment</h3>
              </div>
              <QuizCreator courseOfferingId={courseId!} onComplete={async () => { 
                setAssignmentCreationType('selection'); 
                setTab('present');
                // Refresh assignments list
                if (isBackend) {
                  try {
                    const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
                    setBackendAssignments(data)
                  } catch {}
                }
              }} />
            </>
          )}
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
          <div className="discussion-wrap">
            <h3>Discussion Forum</h3>
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
          }} className="discussion-new">
            <input className="input" placeholder="Start a new discussion" value={newTopMessage} onChange={(e) => setNewTopMessage(e.target.value)} />
            <button className="btn btn-primary" type="submit">Post</button>
          </form>

          {discussion.length === 0 ? <p className="muted">No messages yet.</p> : (
            <ul className="discussion-list">
              {discussion.filter((m:any)=>!m.parent_id).map((m:any)=> (
                <li key={m.id} className="discussion-thread">
                  <div className="discussion-meta"><strong>{m.author_name || 'User'}</strong> <span className="muted">• {new Date(m.created_at).toLocaleString()}</span></div>
                  <div className="discussion-content">{m.content}</div>
                  <div className="discussion-replies">
                    {discussion.filter((x:any)=>x.parent_id===m.id).map((r:any)=> (
                      <div key={r.id} className="discussion-reply">
                        <div className="discussion-meta"><strong>{r.author_name || 'User'}</strong> <span className="muted">• {new Date(r.created_at).toLocaleString()}</span></div>
                        <div className="discussion-content">{r.content}</div>
                      </div>
                    ))}
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
                    }} className="discussion-reply-form">
                      <input className="input" placeholder="Write a reply" value={replyDrafts[m.id]||''} onChange={(e)=> setReplyDrafts((d)=>({ ...d, [m.id]: e.target.value }))} />
                      <button className="btn" type="submit">Reply</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </div>
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

      {tab === 'videos' && isBackend && (
        <section className="card">
          {user?.role === 'teacher' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Video Lectures</h3>
              <button className="btn btn-primary" onClick={() => setShowVideoUpload(true)}>
                📹 Upload Video Lecture
              </button>
            </div>
          )}
          {user?.role !== 'teacher' && (
            <h3 style={{ marginBottom: 16 }}>Video Lectures</h3>
          )}

          {selectedVideo ? (
            <div>
              <button className="btn" onClick={() => setSelectedVideo(null)} style={{ marginBottom: 16 }}>
                ← Back to Videos
              </button>
              <div className="video-viewer">
                <h4>{selectedVideo.title}</h4>
                {selectedVideo.description && (
                  <p className="muted" style={{ marginBottom: 16 }}>{selectedVideo.description}</p>
                )}
                <div style={{ marginBottom: 8 }}>
                  <strong>Duration:</strong> {selectedVideo.duration 
                    ? (() => {
                        const totalSeconds = Math.floor(selectedVideo.duration);
                        const hours = Math.floor(totalSeconds / 3600);
                        const minutes = Math.floor((totalSeconds % 3600) / 60);
                        const seconds = totalSeconds % 60;
                        if (hours > 0) {
                          return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                        }
                        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                      })()
                    : 'N/A'}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <strong>Uploaded:</strong> {new Date(selectedVideo.upload_timestamp).toLocaleString()}
                </div>
                <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                  {user?.role === 'student' ? (
                    <InteractiveVideoPlayer
                      video={selectedVideo}
                      userRole={user?.role || 'student'}
                      onComplete={(score, maxScore) => {
                        push({
                          kind: 'success',
                          message: `Quiz completed! Score: ${score}/${maxScore}`,
                        });
                      }}
                    />
                  ) : (
                    <div className="faculty-video-container">
                      <div className="faculty-video-wrapper">
                        <video
                          ref={videoRefForFaculty}
                          src={selectedVideo.video_url}
                          controls
                          onTimeUpdate={(e) => {
                            setCurrentVideoTime(e.currentTarget.currentTime);
                          }}
                          className="faculty-video-player"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                      <VideoQuestionManager
                        videoId={selectedVideo.id}
                        videoDuration={selectedVideo.duration}
                        currentTime={currentVideoTime}
                        onTimeSelect={(time) => {
                          if (videoRefForFaculty.current) {
                            videoRefForFaculty.current.currentTime = time;
                          }
                        }}
                      />
                      <VideoQuizResults videoId={selectedVideo.id} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {backendVideos.length === 0 ? (
                <p className="muted">No videos available for this course.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        {user?.role === 'teacher' && <th>URL</th>}
                        <th>Duration</th>
                        <th>Uploaded</th>
                        {user?.role === 'teacher' && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {backendVideos.map((video: any) => (
                        <tr key={video.id}>
                          <td>
                            <button
                              className="btn"
                              style={{ textAlign: 'left', padding: 0, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => setSelectedVideo(video)}
                            >
                              {video.title}
                            </button>
                          </td>
                          {user?.role === 'teacher' && (
                            <td>
                              <a 
                                href={video.video_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}
                              >
                                {video.video_url.length > 50 ? video.video_url.substring(0, 50) + '...' : video.video_url}
                              </a>
                            </td>
                          )}
                          <td>
                            {video.duration
                              ? (() => {
                                  const totalSeconds = Math.floor(video.duration);
                                  const hours = Math.floor(totalSeconds / 3600);
                                  const minutes = Math.floor((totalSeconds % 3600) / 60);
                                  const seconds = totalSeconds % 60;
                                  if (hours > 0) {
                                    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                  }
                                  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                                })()
                              : 'N/A'}
                          </td>
                          <td>{new Date(video.upload_timestamp).toLocaleString()}</td>
                          {user?.role === 'teacher' && (
                            <td>
                              <button
                                className="btn btn-primary"
                                style={{ marginRight: 8 }}
                                onClick={() => setSelectedVideo(video)}
                              >
                                View
                              </button>
                              <button
                                className="btn"
                                onClick={async () => {
                                  if (confirm(`Delete "${video.title}"?`)) {
                                    try {
                                      const { deleteVideo } = await import('../../services/videos');
                                      await deleteVideo(video.id);
                                      push({ kind: 'success', message: 'Video deleted' });
                                      const { getVideosByCourseOffering } = await import('../../services/videos');
                                      const videosData = await getVideosByCourseOffering(courseId!);
                                      setBackendVideos(videosData.videos || []);
                                    } catch (e: any) {
                                      push({ kind: 'error', message: e?.message || 'Failed to delete video' });
                                    }
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Video Upload Modal */}
      {isBackend && courseId && (
        <Modal
          open={showVideoUpload}
          onClose={() => setShowVideoUpload(false)}
          title="Upload Video Lecture"
        >
          <VideoUpload
            courseOfferingId={courseId}
            onUploadSuccess={async (video) => {
              push({ kind: 'success', message: `Video "${video.title}" uploaded successfully!` })
              setShowVideoUpload(false)
              // Refresh videos list
              try {
                const { getVideosByCourseOffering } = await import('../../services/videos');
                const videosData = await getVideosByCourseOffering(courseId!);
                setBackendVideos(videosData.videos || []);
              } catch {}
            }}
            onClose={() => setShowVideoUpload(false)}
          />
        </Modal>
      )}
        </div>
      </div>
  )
}
