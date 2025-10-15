import { useNavigate } from 'react-router-dom'
import CourseCard from '../../components/CourseCard'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import './StudentDashboard.css'
import Modal from '../../components/Modal'
import { getEnrolledCourses } from '../../services/student'
import { enrollStudent } from '../../services/courses'

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [offerings, setOfferings] = useState<any[]>([])
  const [err, setErr] = useState<string | null>(null)

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
      await enrollStudent(Number(offId), Number(stuId || user?.id))
      setEnrOpen(false); setOffId(''); setStuId('')
    } catch (e: any) {
      alert(e?.message || 'Enroll failed')
    }
  }

  // Quick open by offering ID
  const [openId, setOpenId] = useState('')

  return (
    <div className="container container-wide dashboard-page student-theme">
      <header className="topbar">
        <h2>Welcome, {user?.name} ({user?.role.toUpperCase()})</h2>
        <div className="actions">
          {(user?.role === 'ta' || user?.role === 'teacher') && (
            <button className="btn btn-primary" onClick={() => setEnrOpen(true)}>+ Enroll student</button>
          )}
          <button className="btn btn-ghost" onClick={() => navigate('/')}>Home</button>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="input" placeholder="Open offering by ID (e.g., 101)" value={openId} onChange={(e) => setOpenId(e.target.value)} />
          <button className="btn btn-primary" onClick={() => openId && goToOffering(openId)}>Open</button>
        </div>
      </div>

      <h3 className="section-title">Your Enrolled Courses</h3>
      {err ? <div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{err}</div> : null}
      {loading ? <p className="muted">Loading…</p> : (
        <div className="grid grid-cards">
          {offerings.map((o) => (
            <CourseCard key={o.id} course={{ id: String(o.id), title: o.course_title || `Offering #${o.id}`, description: o.course_code || o.term || '' , assignmentsPast:[], assignmentsPresent:[], pyq:[], notes:[] }} onClick={() => goToOffering(o.id)} />
          ))}
        </div>
      )}

      <Modal open={enrOpen} onClose={() => setEnrOpen(false)} title="Enroll Student" actions={(
        <>
          <button className="btn" onClick={() => setEnrOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={enrollNow}>Enroll</button>
        </>
      )}>
        <div className="form">
          <label className="field">
            <span className="label">Offering ID</span>
            <input className="input" value={offId} onChange={(e) => setOffId(e.target.value)} placeholder="e.g., 101" />
          </label>
          <label className="field">
            <span className="label">Student ID</span>
            <input className="input" value={stuId} onChange={(e) => setStuId(e.target.value)} placeholder="Defaults to current user" />
          </label>
        </div>
      </Modal>
    </div>
  )
}
