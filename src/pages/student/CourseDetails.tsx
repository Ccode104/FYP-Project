import { useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { courses } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'
import './CourseDetails.css'

export default function CourseDetails() {
  const { courseId } = useParams()
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<'present' | 'past' | 'pyq' | 'notes'>('present')

  const course = useMemo(() => courses.find((c) => c.id === courseId), [courseId])

  const [file, setFile] = useState<File | null>(null)
  const submitAssignment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return alert('Please choose a file to upload!')
    // Mock submission
    setTimeout(() => {
      alert(`Submitted ${file.name} for ${course?.title}`)
      setFile(null)
    }, 300)
  }

  if (!course) return <div style={{ padding: 24 }}>Course not found</div>

  return (
    <div className="container container-wide course-details-page">
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
      </nav>

      {tab === 'present' && (
        <section className="card">
          <h3>Open Assignments</h3>
          <ul className="list">
            {course.assignmentsPresent.map((a) => (
              <li key={a.id}>
                {a.title} {a.dueDate ? `(Due: ${a.dueDate})` : ''}
              </li>
            ))}
          </ul>
          <form onSubmit={submitAssignment} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
            <input className="input" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button className="btn btn-primary" type="submit">Upload & Submit</button>
          </form>
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
