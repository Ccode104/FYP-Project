import { useNavigate } from 'react-router-dom'
import type { Course } from '../../data/mock'
import CourseCard from '../../components/CourseCard'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import {getEnrolledCourses,addUserCourse} from './api'
import './StudentDashboard.css'
import Modal from '../../components/Modal'

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    getEnrolledCourses()
      .then((data) => setCourses(data))
      .catch((err) => console.error(err))
  }, []);

  
  const allCourses = [...courses]
  console.log(allCourses)
  const goToCourse = (id: string) => navigate(`/courses/${id}`)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [offeringId, setofferingId] = useState('')

  const openDialog = () => setDialogOpen(true)
  const closeDialog = () => { setDialogOpen(false); setofferingId('');}
  const submitDialog = () => {
    if (!user) return
    if (!offeringId) return
    const added = addUserCourse(parseInt(offeringId,10))
    closeDialog()
  }

  return (
    <div className="container container-wide dashboard-page student-theme">
      <header className="topbar">
        <h2>Welcome, {user?.name} (Student)</h2>
        <div className="actions">
          <button className="btn btn-primary" onClick={openDialog}>+ Add course</button>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>Home</button>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </header>
      <h3 className="section-title">Your Enrolled Courses</h3>
      <div className="grid grid-cards">
        {allCourses.map((c) => (
          <CourseCard key={c.id} course={c} onClick={() => goToCourse(c.id)} />
        ))}
      </div>

      <Modal
        open={dialogOpen}
        onClose={closeDialog}
        title="Add a new course"
        actions={(
          <>
            <button className="btn" onClick={closeDialog}>Cancel</button>
            <button className="btn btn-primary" onClick={submitDialog}>Add course</button>
          </>
        )}
      >
        <div className="form">
          <label className="field">
            <span className="label">Course title</span>
            <input className="input" value={offeringId} onChange={(e) => setofferingId(e.target.value)} placeholder="e.g. 1" />
          </label>
        </div>
      </Modal>
    </div>
  )
}
