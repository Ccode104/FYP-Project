import { useNavigate } from 'react-router-dom'
import CourseCard from '../../components/CourseCard'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import './StudentDashboard.css'
import Modal from '../../components/Modal'
import { getEnrolledCourses, enrollSelf } from '../../services/student'
import { enrollStudent, unenrollStudent } from '../../services/courses'
import { useToast } from '../../components/ToastProvider'

// Loading skeleton component
function CourseCardSkeleton({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="course-card-skeleton shimmer" style={style}>
      <div className="skeleton-header">
        <div className="skeleton-icon shimmer" />
        <div className="skeleton-badge shimmer" />
      </div>
      <div className="skeleton-content">
        <div className="skeleton-title shimmer" />
        <div className="skeleton-description shimmer" />
        <div className="skeleton-progress shimmer" />
        <div className="skeleton-stats shimmer" />
      </div>
      <div className="skeleton-footer shimmer" />
    </div>
  )
}

// Empty state component
function EmptyCoursesState({ onEnroll }: { onEnroll: () => void }) {
  return (
    <div className="empty-courses-state">
      <div className="empty-state-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 11H13L11 13L9 11H3M21 20H3C2.44772 20 2 19.5523 2 19V5C2 4.44772 2.44772 4 3 4H21C21.5523 4 22 4.44772 22 5V19C22 19.5523 21.5523 20 21 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 8V4M15 5L12 2L9 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="empty-state-title h4">No courses yet</h3>
      <p className="empty-state-description text-base leading-relaxed">Enroll in courses to start your learning journey</p>
      <button className="btn btn-primary empty-state-action text-base" onClick={onEnroll}>Browse Courses</button>
    </div>
  )
}

function MenuButton({ onDelete, label }: { onDelete: () => void; label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'absolute', top: 8, right: 8 }}>
      <button className="btn" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }} aria-label="More">⋮</button>
      {open && (
        <div className="card" style={{ position: 'absolute', right: 0, marginTop: 4, zIndex: 10 }}>
          <button className="btn" onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete() }}>{label}</button>
        </div>
      )}
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const { push } = useToast()
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


  return (
    <div className="container container-wide dashboard-page student-theme">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title h2 text-primary">Welcome back, {user?.name}!</h1>
          <p className="dashboard-subtitle text-lg text-secondary leading-relaxed">Manage your courses and track your progress</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={() => setEnrOpen(true)}>
            {(user?.role === 'ta' || user?.role === 'teacher') ? ' Enroll Student' : ' Enroll Course '}
          </button>
        </div>
      </div>


      <div className="courses-section">
        <div className="section-header">
          <h3 className="section-title h3">Your Courses</h3>
          <span className="courses-count text-sm font-medium text-secondary">{offerings.length} courses enrolled</span>
        </div>

        {err && (
          <div className="error-banner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-medium">{err}</span>
            <button className="btn btn-secondary text-sm" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cards">
            {[...Array(3)].map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : offerings.length === 0 ? (
          <EmptyCoursesState onEnroll={() => setEnrOpen(true)} />

        ) : (
          <div className="grid grid-cards courses-grid">
            {offerings.map((o) => (
              <div key={o.id} className="course-item">
                <CourseCard
                  course={{
                    id: String(o.id),
                    title: o.course_title || `Offering #${o.id}`,
                    description: o.course_code || o.term || '',
                    assignmentsPast: [],
                    assignmentsPresent: [],
                    pyq: [],
                    notes: []
                  }}
                  onClick={() => goToOffering(o.id)}
                />
                <MenuButton
                  onDelete={async () => {
                    try {
                      await unenrollStudent(Number(o.id));
                      setOfferings((prev) => prev.filter((x) => x.id !== o.id));
                      push({ kind: 'success', message: 'Unenrolled' })
                    } catch (e: any) {
                      push({ kind: 'error', message: e?.message || 'Failed' })
                    }
                  }}
                  label="Unenroll"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={enrOpen} onClose={() => setEnrOpen(false)} title={(user?.role === 'student') ? 'Enroll in Offering' : 'Enroll Student'} actions={(
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
          {(user?.role === 'ta' || user?.role === 'teacher') && (
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