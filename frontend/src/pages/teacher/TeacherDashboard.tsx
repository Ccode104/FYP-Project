import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './TeacherDashboard.css'
import { useEffect, useState } from 'react'
import { listMyOfferings } from '../../services/courses'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [offerings, setOfferings] = useState<any[]>([])

// load lists
  useEffect(() => { (async () => { try { setOfferings(await listMyOfferings()); } catch {} })() }, [])

  return (
    <div className="container container-wide dashboard-page teacher-theme">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title">Welcome, {user?.name}</h1>
          <p className="dashboard-subtitle">Your course offerings</p>
        </div>
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
          {offerings.length === 0 && (
            <li>No offerings yet.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
