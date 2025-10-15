import { courses } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import CourseCard from '../../components/CourseCard'
import './TeacherDashboard.css'

export default function TeacherDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="container container-wide dashboard-page teacher-theme">
      <header className="topbar">
        <h2>Welcome, {user?.name} (Teacher)</h2>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => navigate('/')}>Home</button>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </header>
      <h3 className="section-title">Courses</h3>
      <div className="grid grid-cards">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} onClick={() => navigate(`/courses/${c.id}`)} />
        ))}
      </div>
    </div>
  )
}
