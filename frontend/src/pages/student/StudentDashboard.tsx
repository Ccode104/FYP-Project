import { useNavigate } from 'react-router-dom'
import CourseCard from '../../components/CourseCard'
import Calendar from '../../components/Calendar'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import './StudentDashboard.css'
import Modal from '../../components/Modal'
import { enrollSelf, getLiveLecturesForCourses } from '../../features/student/api/student'
import { enrollStudent, unenrollStudent } from '../../features/courses/api/courses'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../services/api'

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
    <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 2 }}>
      <button className="btn" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }} aria-label="More">⋮</button>
      {open && (
        <div className="card" style={{ position: 'absolute', right: 0, bottom: '100%', marginBottom: 4, zIndex: 10 }}>
          <button className="btn" onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete() }}>{label}</button>
        </div>
      )}
    </div>
  )
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const { push } = useToast()
  const [offerings, setOfferings] = useState<unknown[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [courseCounts, setCourseCounts] = useState<Record<number, { pendingAssignments: number; pendingQuizzes: number; unreadNotifications: number }>>({})
  const [assignments, setAssignments] = useState<unknown[]>([])
  const [events, setEvents] = useState<unknown[]>([])
  const [lectures, setLectures] = useState<unknown[]>([])

  // Cache for course data to prevent unnecessary API calls
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)
  const CACHE_DURATION = 30000 // 30 seconds cache

  // Cache for assignments
  const [lastAssignmentFetchTime, setLastAssignmentFetchTime] = useState<number>(0)
  const ASSIGNMENT_CACHE_DURATION = 60000 // 1 minute cache for assignments

  // Function to refresh counts using optimized API with caching
  const refreshCourseCounts = async (forceRefresh = false) => {
    if (user?.role === 'student') {
      const now = Date.now()

      // Check cache unless force refresh is requested
      if (!forceRefresh && (now - lastFetchTime) < CACHE_DURATION && Object.keys(courseCounts).length > 0) {
        console.log('Using cached course data')
        return
      }

      try {
        const response = await apiFetch<{ courses: unknown[] }>('/api/courses/card-data')

        // Transform the data to match the expected format
        const counts: Record<number, unknown> = {}
        const transformedOfferings = response.courses.map(course => ({
          id: course.id,
          term: course.term,
          section: course.section,
          course_code: course.course_code,
          course_title: course.course_title,
          course_description: course.course_description,
          faculty_name: course.faculty_name,
          faculty_email: course.faculty_email
        }))

        // Update offerings if we got new data
        if (transformedOfferings.length > 0) {
          setOfferings(transformedOfferings)
        }

        // Set counts from the optimized API response
        response.courses.forEach(course => {
          counts[course.id] = {
            pendingAssignments: course.pending_assignments,
            pendingQuizzes: course.pending_quizzes,
            unreadNotifications: course.unread_notifications
          }
        })

        setCourseCounts(counts as Record<number, { pendingAssignments: number; pendingQuizzes: number; unreadNotifications: number }>)
        setLastFetchTime(now)

        // Fetch live lectures for all enrolled courses
        const courseIds = response.courses.map((course: unknown) => course.id)
        let lecturesWithTitles: unknown[] = []
        if (courseIds.length > 0) {
          try {
            const allLectures = await getLiveLecturesForCourses(courseIds)
            // Add course title to each lecture
            lecturesWithTitles = allLectures.map((lecture: unknown) => ({
              ...lecture,
              course_title: response.courses.find((c: unknown) => c.id === lecture.course_offering_id)?.course_title
            }))
            setLectures(lecturesWithTitles)
          } catch (error) {
            console.error('Failed to fetch lectures:', error)
            setLectures([])
          }
        } else {
          setLectures([])
        }

        // Fetch assignments and contests for calendar deadlines
        const now2 = Date.now()
        let currentAssignments = assignments
        if (!forceRefresh && (now2 - lastAssignmentFetchTime) < ASSIGNMENT_CACHE_DURATION && assignments.length > 0) {
          console.log('Using cached assignments and contests')
        } else {
          try {
            const allAssignments: unknown[] = []
            console.log('Fetching assignments and contests for courseIds:', courseIds)
            for (const courseId of courseIds) {
              try {
                console.log(`Fetching assignments for course ${courseId}`)
                const courseAssignments = await apiFetch<unknown[]>(`/api/student/courses/${courseId}/assignments`)
                console.log(`Received assignments for course ${courseId}:`, courseAssignments)
                // Transform assignments to calendar events
                const assignmentDeadlineEvents = courseAssignments
                  .filter((assignment: unknown) => assignment.due_at) // Only assignments with due dates
                  .map((assignment: unknown) => ({
                    id: `assignment_${assignment.id}`,
                    title: `Assignment Due: ${assignment.title}`,
                    scheduled_at: assignment.due_at,
                    course_offering_id: courseId,
                    course_title: response.courses.find((c: unknown) => c.id === courseId)?.course_title,
                    type: 'deadline' as const
                  }))
                console.log(`Created assignment deadline events for course ${courseId}:`, assignmentDeadlineEvents)
                allAssignments.push(...assignmentDeadlineEvents)

                // Fetch contests for this course
                console.log(`Fetching contests for course ${courseId}`)
                try {
                  const courseContests = await apiFetch<unknown[]>(`/api/course-offerings/${courseId}/contests`)
                  console.log(`Received contests for course ${courseId}:`, courseContests)
                  // Transform contests to calendar events (end_at as deadline)
                  const contestDeadlineEvents = courseContests
                    .filter((contest: unknown) => contest.end_at) // Only contests with end dates
                    .map((contest: unknown) => ({
                      id: `contest_${contest.id}`,
                      title: `Contest Deadline: ${contest.title}`,
                      scheduled_at: contest.end_at,
                      course_offering_id: courseId,
                      course_title: response.courses.find((c: unknown) => c.id === courseId)?.course_title,
                      type: 'deadline' as const
                    }))
                  console.log(`Created contest deadline events for course ${courseId}:`, contestDeadlineEvents)
                  allAssignments.push(...contestDeadlineEvents)
                } catch (contestErr) {
                  // Contests endpoint might not be available, skip silently
                  console.log(`No contests available for course ${courseId}`)
                }
              } catch (err) {
                console.warn(`Failed to fetch assignments/contests for course ${courseId}:`, err)
              }
            }
            console.log('Final allAssignments (including contests):', allAssignments)
            currentAssignments = allAssignments
            setAssignments(allAssignments)
            setLastAssignmentFetchTime(now2)
          } catch (error) {
            console.error('Failed to fetch assignments and contests:', error)
            currentAssignments = []
            setAssignments([])
          }
        }

        // Merge lectures and assignments into events
        const lectureEvents = lecturesWithTitles.map((lecture: unknown) => ({ ...lecture, type: 'lecture' as const }))
        const allEvents = [
          ...lectureEvents,
          ...currentAssignments
        ]
        console.log('Merging events:', {
          lectureEvents: lectureEvents.length,
          assignmentEvents: currentAssignments.length,
          totalEvents: allEvents.length,
          assignments: currentAssignments,
          allEvents
        })
        setEvents(allEvents)

        console.log('Course card data loaded:', {
          totalCourses: response.courses.length,
          counts,
          cached: false
        })

      } catch (e: unknown) {
        console.error('Failed to fetch course card data:', e)
        if (e instanceof Error && e.message === 'Invalid token') {
          logout()
          return
        }
        // Fallback to empty counts
        setCourseCounts({})
      }
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await refreshCourseCounts()
      } catch (e: unknown) {
        setErr(e?.message || 'Failed to load courses')
      } finally {
        setLoading(false)
      }
    })()
  }, [user?.role])

  // Listen for visibility changes to refresh counts when returning to this tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, refreshing course counts...')
        void refreshCourseCounts()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  const goToOffering = (id: number | string) => navigate(`/courses/${id}/hub`)

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
      // Refresh course data after enrollment (force refresh to bypass cache)
      await refreshCourseCounts(true)
      push({ kind: 'success', message: 'Enrolled' })
      setEnrOpen(false); setOffId(''); setStuId('')
    } catch (e: unknown) {
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
          <button className="btn btn-secondary" onClick={() => navigate('/planner')}>
            Open Planner
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/success-center')}>
            Success Center
          </button>
          <button className="btn btn-primary" onClick={() => setEnrOpen(true)}>
            {(user?.role === 'ta' || user?.role === 'teacher') ? ' Enroll Student' : ' Enroll Course '}
          </button>
        </div>
      </div>


      <div className="dashboard-grid">
        <div className="calendar-section">
          <div className="section-header">
            <h3 className="section-title h3">Schedule</h3>
          </div>
          <Calendar events={events} />
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
            {offerings.map((o) => {
              const counts = courseCounts[o.id] || { pendingAssignments: 0, pendingQuizzes: 0, unreadNotifications: 0 }
              return (
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
                    pendingAssignments={counts.pendingAssignments}
                    pendingQuizzes={counts.pendingQuizzes}
                    unreadNotifications={counts.unreadNotifications}
                  />
                  <MenuButton
                    onDelete={async () => {
                      try {
                        await unenrollStudent(Number(o.id));
                        // Refresh course data after unenrollment (force refresh to bypass cache)
                        await refreshCourseCounts(true);
                        push({ kind: 'success', message: 'Unenrolled' })
                      } catch (e: unknown) {
                        push({ kind: 'error', message: e?.message || 'Failed' })
                      }
                    }}
                    label="Unenroll"
                  />
                </div>
              )
            })}
          </div>
        )}
        </div>

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
