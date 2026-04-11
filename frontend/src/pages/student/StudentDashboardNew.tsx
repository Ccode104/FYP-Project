import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import './StudentDashboardNew.css'
import Modal from '../../components/Modal'
import { enrollSelf } from '../../features/student/api/student'
import { enrollStudent, unenrollStudent } from '../../features/courses/api/courses'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../services/api'

// Course Progress Card Component
interface CourseCardProps {
  course: {
    id: number
    course_code?: string
    course_title?: string
    term?: string
    faculty_name?: string
    progress?: number
    pendingAssignments?: number
    pendingQuizzes?: number
  }
  onUnenroll: () => void
}

function CourseProgressCard({ course, onUnenroll }: CourseCardProps) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="course-progress-card" onClick={() => navigate(`/courses/${course.id}/hub`)}>
      <div className="course-header">
        <div className="course-icon">
          {course.course_code?.charAt(0).toUpperCase() || '📚'}
        </div>
        <button
          className="course-menu-btn"
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
        >
          ⋮
        </button>
        {showMenu && (
          <div className="course-menu">
            <button onClick={(e) => { e.stopPropagation(); onUnenroll(); setShowMenu(false); }} className="menu-item">
              Unenroll
            </button>
          </div>
        )}
      </div>
      
      <h3 className="course-title">{course.course_code || 'Course'}</h3>
      <p className="course-subtitle">{course.course_title || 'Untitled'}</p>
      
      <div className="course-meta">
        <span className="course-term">{course.term || 'Fall 2024'}</span>
        {course.faculty_name && <span className="course-faculty">• Prof. {course.faculty_name}</span>}
      </div>

      <div className="course-progress-section">
        <div className="progress-label">
          <span>Course Progress</span>
          <span className="progress-percent">{course.progress || 0}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${course.progress || 0}%` }}></div>
        </div>
      </div>

      <div className="course-stats">
        <div className="stat">
          <span className="stat-number">{course.pendingAssignments || 0}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat">
          <span className="stat-number">{course.pendingQuizzes || 0}</span>
          <span className="stat-label">Quiz</span>
        </div>
        <div className="stat view-link">
          <a href="#" onClick={(e) => { e.preventDefault(); }}>View →</a>
        </div>
      </div>
    </div>
  )
}

// Calendar Widget Component
interface CalendarEvent {
  time?: string
  title: string
  location?: string
}

function CalendarWidget({ events }: { events: CalendarEvent[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDay = getFirstDayOfMonth(currentMonth)
  const days = []

  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const todayDate = new Date()
  const isCurrentMonth = 
    todayDate.getMonth() === currentMonth.getMonth() && 
    todayDate.getFullYear() === currentMonth.getFullYear()

  return (
    <div className="calendar-widget">
      <div className="calendar-header">
        <h3>{monthName}</h3>
        <div className="calendar-nav">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
            ←
          </button>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
            →
          </button>
        </div>
      </div>

      <div className="calendar-weekdays">
        <div className="weekday">Su</div>
        <div className="weekday">Mo</div>
        <div className="weekday">Tu</div>
        <div className="weekday">We</div>
        <div className="weekday">Th</div>
        <div className="weekday">Fr</div>
        <div className="weekday">Sa</div>
      </div>

      <div className="calendar-days">
        {days.map((day, idx) => (
          <div
            key={idx}
            className={`calendar-day ${day === null ? 'empty' : ''} ${isCurrentMonth && day === todayDate.getDate() ? 'today' : ''}`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="schedule-section">
        <h4>Schedule for Nov 11</h4>
        <div className="schedule-items">
          {events.length > 0 ? (
            events.slice(0, 2).map((event, idx) => (
              <div key={idx} className="schedule-item">
                <div className="schedule-time">{event.time || '09:00 AM'}</div>
                <div className="schedule-details">
                  <div className="schedule-title">{event.title}</div>
                  <div className="schedule-location">{event.location || 'Room 402'}</div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#999', fontSize: '14px' }}>No events scheduled</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Sidebar Navigation Component
function SidebarNav({ currentPage = 'dashboard' }: { currentPage?: string }) {
  const navigate = useNavigate()

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'courses', label: 'My Courses', icon: '📚' },
    { id: 'schedule', label: 'Schedule', icon: '📅' },
    { id: 'assignments', label: 'Assignments', icon: '✓' },
    { id: 'grades', label: 'Grades', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <aside className="sidebar-nav">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">📱</span>
          <span className="logo-text">EduDash</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => {
              if (item.id === 'dashboard') navigate('/dashboard/student')
              else if (item.id === 'courses') navigate('/dashboard/student')
              else if (item.id === 'schedule') navigate('/planner')
              else if (item.id === 'assignments') navigate('/dashboard/student')
              else if (item.id === 'grades') navigate('/progress')
              else if (item.id === 'settings') navigate('/profile')
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {currentPage === item.id && <span className="nav-dot"></span>}
          </button>
        ))}
      </nav>
    </aside>
  )
}

// Main Component
export default function StudentDashboardNew() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const [offerings, setOfferings] = useState<CourseCardProps['course'][]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // Enrollment modal state
  const [enrOpen, setEnrOpen] = useState(false)
  const [offId, setOffId] = useState('')
  const [availableOfferings, setAvailableOfferings] = useState<Array<{ id: number; course_id?: number; course_code?: string; course_title?: string; term?: string; section?: string; available_seats?: number }>>([])
  const [loadingOfferings, setLoadingOfferings] = useState(false)

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)
        const response = await apiFetch<{ courses: CourseCardProps['course'][] }>('/api/courses/card-data')
        setOfferings(response.courses)
      } catch (e) {
        console.error('Failed to load courses:', e)
        setErr('Failed to load your courses')
      } finally {
        setLoading(false)
      }
    }

    if (user?.role === 'student') {
      loadInitialData()
    }
  }, [user?.role])

  useEffect(() => {
    if (enrOpen && user?.role === 'student') {
      loadAvailableOfferings()
    }
  }, [enrOpen, user?.role])

  const loadAvailableOfferings = async () => {
    try {
      setLoadingOfferings(true)
      const data = await apiFetch<Array<{ id: number; course_id?: number; course_code?: string; course_title?: string; term?: string; section?: string; available_seats?: number }>>('/api/courses/available-offerings')
      setAvailableOfferings(data)
    } catch (e) {
      console.error('Failed to load available offerings:', e)
      setAvailableOfferings([])
    } finally {
      setLoadingOfferings(false)
    }
  }

  const enrollNow = async () => {
    try {
      if (user?.role === 'student') {
        await enrollSelf(Number(offId))
      } else {
        await enrollStudent(Number(offId), Number(user?.id))
      }
      // Reload courses
      const response = await apiFetch<{ courses: CourseCardProps['course'][] }>('/api/courses/card-data')
      setOfferings(response.courses)
      push({ kind: 'success', message: 'Enrolled successfully!' })
      setEnrOpen(false)
      setOffId('')
    } catch (e) {
      const errorMessage = (e as { message?: string })?.message || 'Enrollment failed'
      push({ kind: 'error', message: errorMessage })
    }
  }

  const handleUnenroll = (courseId: number) => async () => {
    try {
      await unenrollStudent(courseId)
      setOfferings(offerings.filter(o => o.id !== courseId))
      push({ kind: 'success', message: 'Unenrolled' })
    } catch (e) {
      const errorMessage = (e as { message?: string })?.message || 'Failed to unenroll'
      push({ kind: 'error', message: errorMessage })
    }
  }

  return (
    <div className="student-dashboard-layout">
      <SidebarNav currentPage="dashboard" />

      <div className="dashboard-main">
        {/* Welcome Section */}
        <div className="welcome-banner">
          <div className="welcome-content">
            <h1 className="welcome-title">Welcome<br />back, {user?.name}!</h1>
            <p className="welcome-subtitle">Manage your courses and track your progress</p>
          </div>

          <div className="welcome-actions">
            <button className="btn btn-outline" onClick={() => navigate('/planner')}>
              📅 Open Planner
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/success-center')}>
              🎯 Success Center
            </button>
            <button className="btn btn-primary" onClick={() => setEnrOpen(true)}>
              ➕ Enroll Course
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Courses Section */}
          <div className="courses-main">
            <div className="courses-header">
              <h2 className="courses-title">Your Courses</h2>
              <span className="courses-count">{offerings.length} courses enrolled</span>
            </div>

            {err && (
              <div className="error-banner">
                <span>{err}</span>
                <button className="btn btn-sm" onClick={() => window.location.reload()}>Retry</button>
              </div>
            )}

            {loading ? (
              <div className="courses-grid">
                {[1, 2, 3].map(i => (
                  <div key={i} className="course-skeleton"></div>
                ))}
              </div>
            ) : offerings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <h3>No courses yet</h3>
                <p>Enroll in courses to start your learning journey</p>
                <button className="btn btn-primary" onClick={() => setEnrOpen(true)}>
                  Browse Courses
                </button>
              </div>
            ) : (
              <div className="courses-grid">
                {offerings.map(course => (
                  <CourseProgressCard
                    key={course.id}
                    course={course}
                    onUnenroll={handleUnenroll(course.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Calendar Sidebar */}
          <div className="calendar-sidebar">
            <CalendarWidget events={[]} />
          </div>
        </div>
      </div>

      {/* Enrollment Modal */}
      <Modal
        open={enrOpen}
        onClose={() => setEnrOpen(false)}
        title="Enroll in Course"
        actions={
          <>
            <button className="btn" onClick={() => setEnrOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={enrollNow} disabled={!offId || loadingOfferings}>
              Enroll
            </button>
          </>
        }
      >
        <div className="form">
          <label className="field">
            <span className="label">Select Course</span>
            {loadingOfferings ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#666' }}>Loading courses...</div>
            ) : availableOfferings.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#999' }}>No courses available</div>
            ) : (
              <select
                className="input"
                value={offId}
                onChange={(e) => setOffId(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="">-- Select a course --</option>
                {availableOfferings.map(offering => (
                  <option key={offering.id} value={offering.id}>
                    {offering.course_code || `Course ${offering.course_id}`} - {offering.course_title} ({offering.term} {offering.section || ''}) 
                    {offering.available_seats !== null ? ` - ${offering.available_seats} seats` : ''}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>
      </Modal>
    </div>
  )
}
