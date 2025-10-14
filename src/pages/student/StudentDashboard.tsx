import { useNavigate } from 'react-router-dom'
import { courses } from '../../data/mock'
import CourseCard from '../../components/CourseCard'
import { useAuth } from '../../context/AuthContext'
import './StudentDashboard.css'

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const goToCourse = (id: string) => navigate(`/courses/${id}`)

  return (
    <div className="container container-wide dashboard-page student-theme">
      <header className="topbar">
        <h2>Welcome, {user?.name} (Student)</h2>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => navigate('/')}>Home</button>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </header>
      <h3 className="section-title">Your Enrolled Courses</h3>
      <div className="grid grid-cards">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} onClick={() => goToCourse(c.id)} />
        ))}
      </div>
    </div>
  )
}
