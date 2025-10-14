import { useNavigate } from 'react-router-dom'
import { courses } from '../../data/mock'
import CourseCard from '../../components/CourseCard'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { addUserCourse, getUserCourses } from '../../data/userCourses'
import './StudentDashboard.css'
import Modal from '../../components/Modal'

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [mine, setMine] = useState(() => (user ? getUserCourses(user.id) : []))

  useEffect(() => {
    if (user) setMine(getUserCourses(user.id))
  }, [user])

  const allCourses = useMemo(() => [...mine, ...courses], [mine])

  const goToCourse = (id: string) => navigate(`/courses/${id}`)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const openDialog = () => setDialogOpen(true)
  const closeDialog = () => { setDialogOpen(false); setNewTitle(''); setNewDesc('') }
  const submitDialog = () => {
    if (!user) return
    const title = newTitle.trim()
    if (!title) return
    const description = newDesc.trim() || 'Newly added course'
    const added = addUserCourse(user.id, { title, description })
    setMine((prev) => [added, ...prev])
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
            <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g., Discrete Mathematics" />
          </label>
          <label className="field">
            <span className="label">Description</span>
            <input className="input" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Short description" />
          </label>
        </div>
      </Modal>
    </div>
  )
}
