import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './TeacherDashboard.css'
import { useEffect, useState } from 'react'
import { createCourse, createOffering, listCourses, listMyOfferings } from '../../services/courses'
import { useToast } from '../../components/ToastProvider'

export default function TeacherDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const [courseCode, setCourseCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDesc, setCourseDesc] = useState('')

  const [offerCourseId, setOfferCourseId] = useState('')
  const [term, setTerm] = useState('2025-SPR')
  const [section, setSection] = useState('A')

  const [courses, setCourses] = useState<any[]>([])
  const [offerings, setOfferings] = useState<any[]>([])

  const makeCourse = async () => {
    try {
      const res = await createCourse({ code: courseCode, title: courseTitle, description: courseDesc })
      push({ kind: 'success', message: `Course ${res.code || ''} created` })
      setOfferCourseId(String(res.id))
      const list = await listCourses(); setCourses(list)
    } catch (e: any) {
      push({ kind: 'error', message: e?.message || 'Create course failed' })
    }
  }

  const makeOffering = async () => {
    try {
      const res = await createOffering({ course_id: Number(offerCourseId), term, section, faculty_id: Number(user?.id) })
      push({ kind: 'success', message: `Offering #${res.id} created` })
      const mine = await listMyOfferings(); setOfferings(mine)
      navigate(`/courses/${res.id}`)
    } catch (e: any) {
      push({ kind: 'error', message: e?.message || 'Create offering failed' })
    }
  }

// load lists
  useEffect(() => { (async () => { try { setCourses(await listCourses()); setOfferings(await listMyOfferings()); } catch {} })() }, [])

  return (
    <div className="container container-wide dashboard-page teacher-theme">
      <header className="topbar">
        <h2>Welcome, {user?.name} (Teacher)</h2>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => navigate('/')}>Home</button>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 className="section-title">Create Course</h3>
          <div className="form">
            <label className="field"><span className="label">Code</span><input className="input" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="CS101" /></label>
            <label className="field"><span className="label">Title</span><input className="input" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="Intro to CS" /></label>
            <label className="field"><span className="label">Description</span><input className="input" value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} placeholder="Short description" /></label>
            <div><button className="btn btn-primary" onClick={makeCourse}>Create Course</button></div>
          </div>
        </div>
        <div className="card">
          <h3 className="section-title">Create Offering</h3>
          <div className="form">
            <label className="field"><span className="label">Course ID</span><input className="input" value={offerCourseId} onChange={(e) => setOfferCourseId(e.target.value)} placeholder="Created course id" /></label>
            <label className="field"><span className="label">Term</span><input className="input" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="2025-SPR" /></label>
            <label className="field"><span className="label">Section</span><input className="input" value={section} onChange={(e) => setSection(e.target.value)} placeholder="A" /></label>
            <div><button className="btn btn-primary" onClick={makeOffering}>Create Offering</button></div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 className="section-title">All Courses</h3>
          <ul className="list">
            {courses.map((c) => (
              <li key={c.id}>{c.code} — {c.title} (id: {c.id})</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3 className="section-title">My Offerings</h3>
          <ul className="list">
            {offerings.map((o) => (
              <li key={o.id}>
                {o.course_code} — {o.course_title} [{o.term}{o.section?'-'+o.section:''}] (#{o.id})
                <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={() => navigate(`/courses/${o.id}`)}>Manage</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
