import { useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { courses } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'
import { getUserCourses } from '../../data/userCourses'
import { getCustomAssignments, addCustomAssignment } from '../../data/courseOverlays'
import { addSubmission, getSubmissions, setSubmissionGrade } from '../../data/submissions'
import './CourseDetails.css'

export default function CourseDetails() {
  const { courseId } = useParams()
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<'present' | 'past' | 'pyq' | 'notes' | 'manage' | 'submissions' | 'grading'>('present')

  const course = useMemo(() => {
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
  const presentAssignments = [...customPresent, ...course.assignmentsPresent]
  const submissions = courseId ? getSubmissions(courseId) : []

  const [newAssnTitle, setNewAssnTitle] = useState('')
  const [newAssnDue, setNewAssnDue] = useState('')
  const addAssn = () => {
    if (!courseId) return
    const title = newAssnTitle.trim()
    if (!title) return
    addCustomAssignment(courseId, title, newAssnDue.trim() || undefined)
    setNewAssnTitle('')
    setNewAssnDue('')
    setTab('present')
  }

  const [gradeMap, setGradeMap] = useState<Record<string, string>>({})
  const saveGrade = (sid: string) => {
    if (!courseId) return
    const g = gradeMap[sid]
    if (!g) return
    setSubmissionGrade(courseId, sid, g)
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
            <form onSubmit={submitAssignment} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
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
          {submissions.length === 0 ? (
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
          )}
        </section>
      )}

      {user?.role === 'ta' && tab === 'grading' && (
        <section className="card">
          <h3>Grade Submissions</h3>
          {submissions.length === 0 ? (
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
          )}
        </section>
      )}

      {tab === 'pyq' && (
        <section className="card">
          <h3>Previous Year Questions</h3>
          <ul className="list">
            {course.pyq.map((p) => (
              <li key={p.id}>
                <a href={p.url} target="_blank">{p.title}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'notes' && (
        <section className="card">
          <h3>Notes</h3>
          <ul className="list">
            {course.notes.map((n) => (
              <li key={n.id}>
                <a href={n.url} target="_blank">{n.title}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
