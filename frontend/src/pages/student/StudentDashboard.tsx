import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import './StudentDashboard.css'
import Modal from '../../components/Modal'
import { getEnrolledCourses, enrollSelf } from '../../services/student'
import { enrollStudent, unenrollStudent } from '../../services/courses'
import { useToast } from '../../components/ToastProvider'

function MenuButton({ onDelete, label }: { onDelete: () => void; label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'absolute', top: 8, right: 8 }}>
      <button className="btn" onClick={(e)=>{ e.stopPropagation(); setOpen((v)=>!v) }} aria-label="More">⋮</button>
      {open && (
        <div className="card" style={{ position: 'absolute', right: 0, marginTop: 4, zIndex: 10 }}>
          <button className="btn" onClick={(e)=>{ e.stopPropagation(); setOpen(false); onDelete() }}>{label}</button>
        </div>
      )}
    </div>
  )
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const { push } = useToast()
  const [offerings, setOfferings] = useState<any[]>([])
  const [err, setErr] = useState<string | null>(null)

  // UI state: search & sort
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'code'>('recent')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = offerings
    if (q) {
      list = list.filter((o:any) =>
        String(o.course_title || '').toLowerCase().includes(q) ||
        String(o.course_code || '').toLowerCase().includes(q) ||
        String(o.term || '').toLowerCase().includes(q) ||
        String(o.id).includes(q)
      )
    }
    if (sortBy === 'title') {
      list = [...list].sort((a:any,b:any)=> String(a.course_title||'').localeCompare(String(b.course_title||'')))
    } else if (sortBy === 'code') {
      list = [...list].sort((a:any,b:any)=> String(a.course_code||'').localeCompare(String(b.course_code||'')))
    } else {
      // recent = by id desc (already from API) but keep stable copy
      list = [...list]
    }
    return list
  }, [offerings, query, sortBy])

  useEffect(() => {
    (async () => {
      try {
        const list = await getEnrolledCourses()
        setOfferings(list)
      } catch (e: any) {
        setErr(e?.message || 'Failed to load courses')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const goToOffering = (id: number | string) => navigate(`/courses/${id}`)

  // TA/Teacher enroll form (optional)
  const [enrOpen, setEnrOpen] = useState(false)
  const [offId, setOffId] = useState('')
  const [stuId, setStuId] = useState('')
  const enrollNow = async () => {
    try {
      if (user?.role === 'student') {
        await enrollSelf(Number(offId))
      } else {
        await enrollStudent(Number(offId), Number(stuId || user?.id))
      }
      const list = await getEnrolledCourses()
      setOfferings(list)
      push({ kind: 'success', message: 'Enrolled' })
      setEnrOpen(false); setOffId(''); setStuId('')
    } catch (e: any) {
      push({ kind: 'error', message: e?.message || 'Enroll failed' })
    }
  }

  // Quick open by offering ID
  const [openId, setOpenId] = useState('')

  return (
    <div className="container container-wide dashboard-page student-theme">
      <header className="topbar">
        <h2>Welcome, {user?.name} ({user?.role.toUpperCase()})</h2>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setEnrOpen(true)}>{(user?.role === 'ta' || user?.role === 'teacher') ? ' Enroll Student' : ' Enroll Course '}</button>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>Home</button>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="dashboard-toolbar">
          <div className="dashboard-search">
            <input className="input" placeholder="Search by course code, title, term, or ID" value={query} onChange={(e)=> setQuery(e.target.value)} aria-label="Search courses" />
            <span className="muted" aria-live="polite" style={{ whiteSpace:'nowrap' }}>{filtered.length} result{filtered.length===1?'':'s'}</span>
          </div>
          <div className="dashboard-controls">
            <label className="field" style={{minWidth:160}}>
              <span className="label">Sort by</span>
              <select className="select" value={sortBy} onChange={(e)=> setSortBy(e.target.value as any)}>
                <option value="recent">Recent</option>
                <option value="title">Title</option>
                <option value="code">Course Code</option>
              </select>
            </label>
            <div className="divider-v" />
            <div className="quick-open">
              <input className="input" placeholder="Open by ID (e.g., 101)" value={openId} onChange={(e) => setOpenId(e.target.value)} />
              <button className="btn" onClick={() => openId && goToOffering(openId)}>Open</button>
            </div>
          </div>
        </div>
      </div>

      <h3 className="section-title">Your Enrolled Courses</h3>
      {err ? <div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{err}</div> : null}
      {loading ? (
        <div className="grid grid-cards">
          {Array.from({ length: 6 }).map((_,i)=> (
            <div className="card course-tile skeleton" key={i}>
              <div className="skeleton-line" style={{width:'60%'}} />
              <div className="skeleton-line" style={{width:'40%', marginTop:8}} />
              <div className="skeleton-chip-row">
                <span className="skeleton-chip" />
                <span className="skeleton-chip" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        filtered.length === 0 ? (
          <div className="card">
            <div className="muted">No courses found. Try clearing search or enroll in a course.</div>
          </div>
        ) : (
          <div className="grid grid-cards">
            {filtered.map((o) => (
              <div key={o.id} style={{ position: 'relative' }}>
                <section className="card card-hover course-tile" role="button" tabIndex={0} onClick={() => goToOffering(o.id)} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') goToOffering(o.id) }}>
                  <div className="course-tile__title">{o.course_code || 'COURSE'} — {o.course_title || `Offering #${o.id}`}</div>
                  <div className="course-tile__meta">
                    {o.term ? <span className="chip">{o.term}{o.section?`-${o.section}`:''}</span> : null}
                    <span className="chip chip-muted">ID: {o.id}</span>
                  </div>
                </section>
                <MenuButton onDelete={async () => {
                  try { await unenrollStudent(Number(o.id)); setOfferings((prev)=>prev.filter((x)=>x.id!==o.id)); push({ kind: 'success', message: 'Unenrolled' }) } catch(e:any){ push({ kind: 'error', message: e?.message || 'Failed' }) }
                }} label="Unenroll" />
              </div>
            ))}
          </div>
        )
      )}

      <Modal open={enrOpen} onClose={() => setEnrOpen(false)} title={(user?.role==='student')? 'Enroll in Offering' : 'Enroll Student'} actions={(
        <>
          <button className="btn" onClick={() => setEnrOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={enrollNow}>Enroll</button>
        </>
      )}>
        <div className="form">
          <label className="field">
            <span className="label"></span>
            <input className="input" value={offId} onChange={(e) => setOffId(e.target.value)} placeholder="e.g., 101 (Offering ID)" />
          </label>
          {(user?.role==='ta' || user?.role==='teacher') && (
            <label className="field">
              <span className="label">Student ID</span>
              <input className="input" value={stuId} onChange={(e) => setStuId(e.target.value)} placeholder="Enter student numeric id" />
            </label>
          )}
        </div>
      </Modal>
    </div>
  )
}
