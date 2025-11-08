import { courses } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import CourseCard from '../../components/CourseCard'
import './AdminDashboard.css'

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="container container-wide dashboard-page admin-theme">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title">Welcome, {user?.name}</h1>
          <p className="dashboard-subtitle">Manage courses and assist with grading</p>
        </div>
      </div>
      <h3 className="section-title">Courses</h3>
      <div className="grid grid-cards">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} onClick={() => navigate(`/courses/${c.id}`)} />
        ))}
      </div>
    </div>
  )
}
