import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './StudentDashboardNew.css'
import Modal from '../../components/Modal'
import DashboardHeader from '../../components/DashboardHeader'
import { enrollSelf } from '../../features/student/api/student'
import { unenrollStudent } from '../../features/courses/api/courses'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../services/api'

type CourseCardData = {
  id: number
  term?: string
  section?: string
  course_code?: string
  course_title?: string
  course_description?: string
  faculty_name?: string
  pending_assignments?: number
  pending_quizzes?: number
  overdue_assignments?: number
  missed_quizzes?: number
  completed_assignments?: number
  completed_quizzes?: number
  assignment_average?: number | null
  quiz_average?: number | null
  unread_notifications?: number
}

type SuccessSummary = {
  pending_assignments: number
  pending_quizzes: number
  overdue_assignments: number
  missed_quizzes: number
  completed_assignments: number
  completed_quizzes: number
  unread_notifications: number
  assignment_average: number | null
  quiz_average: number | null
  overall_average: number | null
}

type DashboardEvent = {
  id: number
  title: string
  due_at?: string
  event_type?: 'assignment' | 'quiz' | 'lecture'
  course_code?: string
  course_title?: string
  location?: string
  course_offering_id?: number
}

type AvailableOffering = {
  id: number
  course_id?: number
  course_code?: string
  course_title?: string
  term?: string
  section?: string
  available_seats?: number
}

type NavItem = {
  id: string
  label: string
  icon: ReactNode
  action: () => void
}

function getCourseProgress(course: CourseCardData) {
  const averages = [course.assignment_average, course.quiz_average].filter((value): value is number => value !== null && value !== undefined)
  if (averages.length > 0) {
    return Math.round(averages.reduce((sum, value) => sum + value, 0) / averages.length)
  }

  const completed = (course.completed_assignments || 0) + (course.completed_quizzes || 0)
  const pending = (course.pending_assignments || 0) + (course.pending_quizzes || 0)
  const total = completed + pending
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

function formatEventTime(dateString?: string) {
  if (!dateString) return 'TBD'
  return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatEventRange(event: DashboardEvent) {
  if (!event.due_at) return 'Schedule pending'
  const start = new Date(event.due_at)
  const end = new Date(start.getTime() + 90 * 60 * 1000)
  return `${formatEventTime(event.due_at)} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
}

function isSameDay(date: Date, comparison: Date) {
  return (
    date.getFullYear() === comparison.getFullYear() &&
    date.getMonth() === comparison.getMonth() &&
    date.getDate() === comparison.getDate()
  )
}

function CourseCard({
  course,
  onOpen,
  onUnenroll,
}: {
  course: CourseCardData
  onOpen: () => void
  onUnenroll: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const progress = getCourseProgress(course)
  const iconLabel = (course.course_code || course.course_title || 'C').trim().charAt(0).toUpperCase()
  const accentClass = progress >= 70 ? 'course-card--blue' : 'course-card--violet'

  return (
    <article className={`course-card ${accentClass}`} onClick={onOpen}>
      <div className="course-card__head">
        <div className="course-card__icon">{iconLabel}</div>
        <div className="course-card__head-actions">
          {(course.unread_notifications || 0) > 0 && (
            <span className="course-card__alert">{course.unread_notifications}</span>
          )}
          <div className="course-card__menu-wrap">
            <button
              className="course-card__menu-btn"
              onClick={(event) => {
                event.stopPropagation()
                setMenuOpen((open) => !open)
              }}
              aria-label={`Open menu for ${course.course_title || 'course'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {menuOpen && (
              <div className="course-card__menu">
                <button
                  className="course-card__menu-item"
                  onClick={(event) => {
                    event.stopPropagation()
                    setMenuOpen(false)
                    onUnenroll()
                  }}
                >
                  Unenroll
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <h3 className="course-card__title">{course.course_code || 'Course'}</h3>
      <p className="course-card__subtitle">{course.course_title || 'Untitled course'}</p>
      <div className="course-card__meta">
        <span>{course.term || 'Current term'}</span>
        {course.faculty_name && <span>{`Prof. ${course.faculty_name}`}</span>}
      </div>

      <div className="course-card__progress-label">
        <span>Course Progress</span>
        <strong>{progress}%</strong>
      </div>
      <div className="course-card__progress-track">
        <div className="course-card__progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="course-card__footer">
        <div className="course-card__stat">{course.pending_assignments || 0} Pending</div>
        <div className="course-card__stat">{course.pending_quizzes || 0} Quiz</div>
        <button
          className="course-card__view"
          onClick={(event) => {
            event.stopPropagation()
            onOpen()
          }}
        >
          View
        </button>
      </div>
    </article>
  )
}

function CalendarPanel({
  events,
  searchValue,
}: {
  events: DashboardEvent[]
  searchValue: string
}) {
  const [visibleMonth, setVisibleMonth] = useState(new Date())

  const matchingEvents = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) return events
    return events.filter((event) => {
      const haystack = [
        event.title,
        event.course_code,
        event.course_title,
        event.location,
        event.event_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [events, searchValue])

  const today = new Date()
  const initialSelected = matchingEvents.find((event) => event.due_at && new Date(event.due_at) >= today)
  const [selectedDate, setSelectedDate] = useState<Date>(initialSelected?.due_at ? new Date(initialSelected.due_at) : today)

  useEffect(() => {
    const now = new Date()
    const nextEvent = matchingEvents.find((event) => event.due_at && new Date(event.due_at) >= now)
    if (nextEvent?.due_at) {
      setSelectedDate(new Date(nextEvent.due_at))
    }
  }, [matchingEvents])

  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate()
  const leadingSpaces = monthStart.getDay()
  const eventDates = matchingEvents
    .filter((event) => event.due_at)
    .map((event) => new Date(event.due_at as string))

  const selectedEvents = matchingEvents
    .filter((event) => event.due_at && isSameDay(new Date(event.due_at), selectedDate))
    .sort((a, b) => new Date(a.due_at || '').getTime() - new Date(b.due_at || '').getTime())

  const days = Array.from({ length: leadingSpaces + daysInMonth }, (_, index) => {
    const dayNumber = index - leadingSpaces + 1
    if (dayNumber <= 0) {
      return null
    }
    return new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), dayNumber)
  })

  return (
    <aside className="schedule-card">
      <div className="schedule-card__calendar-header">
        <h3>{visibleMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
        <div className="schedule-card__calendar-actions">
          <button onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} aria-label="Previous month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} aria-label="Next month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="schedule-card__weekdays">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="schedule-card__days">
        {days.map((date, index) => {
          if (!date) {
            return <span key={`empty-${index}`} className="schedule-card__day schedule-card__day--empty" />
          }

          const hasEvent = eventDates.some((eventDate) => isSameDay(eventDate, date))
          const isSelected = isSameDay(date, selectedDate)
          const isToday = isSameDay(date, today)

          return (
            <button
              key={date.toISOString()}
              className={`schedule-card__day${hasEvent ? ' schedule-card__day--event' : ''}${isSelected ? ' schedule-card__day--selected' : ''}${isToday ? ' schedule-card__day--today' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      <div className="schedule-card__agenda">
        <h4>Schedule for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h4>
        {selectedEvents.length === 0 ? (
          <p className="schedule-card__empty">No scheduled items for this day.</p>
        ) : (
          <div className="schedule-card__agenda-list">
            {selectedEvents.slice(0, 3).map((event) => (
              <div key={`${event.event_type}-${event.id}`} className="schedule-card__agenda-item">
                <div className="schedule-card__agenda-time">{formatEventRange(event)}</div>
                <div className="schedule-card__agenda-title">{event.title}</div>
                <div className="schedule-card__agenda-meta">
                  <span>{event.course_code || event.course_title || 'Course'}</span>
                  {event.location && <span>{event.location}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

export default function StudentDashboardNew() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()
  const coursesSectionRef = useRef<HTMLElement | null>(null)
  const scheduleSectionRef = useRef<HTMLElement | null>(null)

  const [courses, setCourses] = useState<CourseCardData[]>([])
  const [summary, setSummary] = useState<SuccessSummary | null>(null)
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [activePanel, setActivePanel] = useState<'notifications' | 'actions' | null>(null)

  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [selectedOfferingId, setSelectedOfferingId] = useState('')
  const [availableOfferings, setAvailableOfferings] = useState<AvailableOffering[]>([])
  const [loadingOfferings, setLoadingOfferings] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      setError(null)
      try {
        const courseResponse = await apiFetch<{ courses: CourseCardData[]; summary?: SuccessSummary }>('/api/courses/card-data')

        let eventResponse: { events: DashboardEvent[] } = { events: [] }
        try {
          eventResponse = await apiFetch<{ events: DashboardEvent[] }>('/api/student/upcoming-events')
        } catch (eventError) {
          console.warn('Failed to load upcoming events:', eventError)
        }

        if (!cancelled) {
          setCourses(courseResponse.courses || [])
          setSummary(courseResponse.summary || null)
          setEvents(eventResponse.events || [])
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err)
        if (!cancelled) {
          setError('Failed to load your dashboard')
          setCourses([])
          setSummary(null)
          setEvents([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (user?.role === 'student') {
      void loadDashboard()
    }

    return () => {
      cancelled = true
    }
  }, [user?.role])

  useEffect(() => {
    async function loadOfferings() {
      setLoadingOfferings(true)
      try {
        const data = await apiFetch<AvailableOffering[]>('/api/courses/available-offerings')
        setAvailableOfferings(data || [])
      } catch (err) {
        console.error('Failed to load offerings:', err)
        setAvailableOfferings([])
      } finally {
        setLoadingOfferings(false)
      }
    }

    if (enrollModalOpen) {
      void loadOfferings()
    }
  }, [enrollModalOpen])

  const filteredCourses = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) {
      return courses
    }

    return courses.filter((course) => {
      const haystack = [
        course.course_code,
        course.course_title,
        course.course_description,
        course.faculty_name,
        course.term,
        course.section,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [courses, searchValue])

  const pendingNotificationCount = useMemo(() => {
    const overdueItems = (summary?.overdue_assignments || 0) + (summary?.missed_quizzes || 0)
    const discussionItems = summary?.unread_notifications || 0
    return overdueItems + discussionItems
  }, [summary])

  const quickStats = [
    { label: 'Pending assignments', value: summary?.pending_assignments ?? 0 },
    { label: 'Pending quizzes', value: summary?.pending_quizzes ?? 0 },
    { label: 'Average score', value: summary?.overall_average !== null && summary?.overall_average !== undefined ? `${summary.overall_average}%` : 'N/A' },
  ]

  const notificationItems = useMemo(() => {
    const upcoming = events
      .filter((event) => event.due_at)
      .sort((a, b) => new Date(a.due_at || '').getTime() - new Date(b.due_at || '').getTime())
      .slice(0, 4)

    return [
      ...(summary && summary.overdue_assignments > 0 ? [`${summary.overdue_assignments} assignment${summary.overdue_assignments === 1 ? '' : 's'} overdue`] : []),
      ...(summary && summary.missed_quizzes > 0 ? [`${summary.missed_quizzes} quiz${summary.missed_quizzes === 1 ? '' : 'es'} missed`] : []),
      ...(summary && summary.unread_notifications > 0 ? [`${summary.unread_notifications} unread discussion update${summary.unread_notifications === 1 ? '' : 's'}`] : []),
      ...upcoming.map((event) => `${event.course_code || 'Course'}: ${event.title}`),
    ]
  }, [events, summary])

  const handleUnenroll = async (offeringId: number) => {
    try {
      await unenrollStudent(offeringId)
      const refreshed = await apiFetch<{ courses: CourseCardData[]; summary?: SuccessSummary }>('/api/courses/card-data')
      setCourses(refreshed.courses || [])
      setSummary(refreshed.summary || null)
      push({ kind: 'success', message: 'Unenrolled successfully' })
    } catch (err) {
      const message = (err as { message?: string })?.message || 'Failed to unenroll'
      push({ kind: 'error', message })
    }
  }

  const handleEnroll = async () => {
    try {
      await enrollSelf(Number(selectedOfferingId))
      const courseResponse = await apiFetch<{ courses: CourseCardData[]; summary?: SuccessSummary }>('/api/courses/card-data')
      let eventResponse: { events: DashboardEvent[] } = { events: [] }
      try {
        eventResponse = await apiFetch<{ events: DashboardEvent[] }>('/api/student/upcoming-events')
      } catch (eventError) {
        console.warn('Failed to refresh upcoming events:', eventError)
      }
      setCourses(courseResponse.courses || [])
      setSummary(courseResponse.summary || null)
      setEvents(eventResponse.events || [])
      setEnrollModalOpen(false)
      setSelectedOfferingId('')
      push({ kind: 'success', message: 'Course enrolled successfully' })
    } catch (err) {
      const message = (err as { message?: string })?.message || 'Enrollment failed'
      push({ kind: 'error', message })
    }
  }

  const scrollToSection = (ref: { current: HTMLElement | null }) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>,
      action: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    },
    {
      id: 'courses',
      label: 'My Courses',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>,
      action: () => scrollToSection(coursesSectionRef),
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
      action: () => scrollToSection(scheduleSectionRef),
    },
    {
      id: 'assignments',
      label: 'Assignments',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
      action: () => navigate('/success-center'),
    },
    {
      id: 'grades',
      label: 'Grades',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-6" /></svg>,
      action: () => navigate('/progress'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>,
      action: () => navigate('/profile'),
    },
  ]

  return (
    <>
      <DashboardHeader
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        notificationCount={pendingNotificationCount}
        onNotificationsClick={() => setActivePanel((current) => (current === 'notifications' ? null : 'notifications'))}
        onQuickActionsClick={() => setActivePanel((current) => (current === 'actions' ? null : 'actions'))}
      />

      <div className="student-shell">
        <aside className="student-sidebar">
          <nav className="student-sidebar__nav" aria-label="Student dashboard navigation">
            {navItems.map((item, index) => (
              <button
                key={item.id}
                className={`student-sidebar__link${index === 0 ? ' student-sidebar__link--active' : ''}`}
                onClick={item.action}
              >
                <span className="student-sidebar__icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="student-shell__content">
          {activePanel && (
            <div className="student-shell-panel">
              <div className="student-shell-panel__header">
                <h2>{activePanel === 'notifications' ? 'Notifications' : 'Quick actions'}</h2>
                <button onClick={() => setActivePanel(null)} aria-label="Close panel">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {activePanel === 'notifications' ? (
                <div className="student-shell-panel__list">
                  {notificationItems.length === 0 ? (
                    <p className="student-shell-panel__empty">No urgent updates right now.</p>
                  ) : (
                    notificationItems.map((item) => (
                      <div key={item} className="student-shell-panel__item">{item}</div>
                    ))
                  )}
                </div>
              ) : (
                <div className="student-shell-panel__actions">
                  <button className="student-shell-panel__action" onClick={() => navigate('/planner')}>Open Planner</button>
                  <button className="student-shell-panel__action" onClick={() => navigate('/success-center')}>Success Center</button>
                  <button className="student-shell-panel__action" onClick={() => navigate('/progress')}>View Grades</button>
                  <button className="student-shell-panel__action" onClick={() => navigate('/profile')}>Profile</button>
                </div>
              )}
            </div>
          )}

          <section className="student-hero">
            <div className="student-hero__text">
              <p className="student-hero__eyebrow">Welcome</p>
              <h1>
                back, <span>{user?.name || 'Student'}!</span>
              </h1>
              <p className="student-hero__subtitle">
                Manage your courses and track your progress with live course, quiz, and planner data.
              </p>
            </div>

            <div className="student-hero__actions">
              <button className="student-hero__button student-hero__button--ghost" onClick={() => navigate('/planner')}>
                Open Planner
              </button>
              <button className="student-hero__button student-hero__button--ghost" onClick={() => navigate('/success-center')}>
                Success Center
              </button>
              <button className="student-hero__button student-hero__button--primary" onClick={() => setEnrollModalOpen(true)}>
                Enroll Course
              </button>
            </div>
          </section>

          <div className="student-shell__grid">
            <section className="student-shell__main" ref={coursesSectionRef}>
              <div className="student-stats">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="student-stat">
                    <span className="student-stat__label">{stat.label}</span>
                    <strong className="student-stat__value">{stat.value}</strong>
                  </div>
                ))}
              </div>

              <section className="student-courses">
                <div className="student-courses__header">
                  <div>
                    <h2>Your Courses</h2>
                    <p>{filteredCourses.length} courses enrolled</p>
                  </div>
                </div>

                {error && (
                  <div className="student-courses__error">
                    <span>{error}</span>
                    <button onClick={() => window.location.reload()}>Retry</button>
                  </div>
                )}

                {loading ? (
                  <div className="student-courses__grid">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div key={index} className="course-card course-card--skeleton" />
                    ))}
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <div className="student-courses__empty">
                    <h3>No matching courses</h3>
                    <p>{courses.length === 0 ? 'Enroll in a course to get started.' : 'Try a different search term.'}</p>
                    <button className="student-hero__button student-hero__button--primary" onClick={() => setEnrollModalOpen(true)}>
                      Browse Courses
                    </button>
                  </div>
                ) : (
                  <div className="student-courses__grid">
                    {filteredCourses.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        onOpen={() => navigate(`/courses/${course.id}/hub`)}
                        onUnenroll={() => void handleUnenroll(course.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </section>

            <section className="student-shell__side" ref={scheduleSectionRef}>
              <CalendarPanel events={events} searchValue={searchValue} />
            </section>
          </div>
        </main>
      </div>

      <Modal
        open={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        title="Enroll in Course"
        actions={
          <>
            <button className="btn" onClick={() => setEnrollModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleEnroll} disabled={!selectedOfferingId || loadingOfferings}>
              Enroll
            </button>
          </>
        }
      >
        <div className="form">
          <label className="field">
            <span className="label">Select Course</span>
            {loadingOfferings ? (
              <div className="student-shell__modal-status">Loading courses...</div>
            ) : availableOfferings.length === 0 ? (
              <div className="student-shell__modal-status">No courses available to enroll right now.</div>
            ) : (
              <select className="input" value={selectedOfferingId} onChange={(event) => setSelectedOfferingId(event.target.value)}>
                <option value="">-- Select a course --</option>
                {availableOfferings.map((offering) => (
                  <option key={offering.id} value={offering.id}>
                    {offering.course_code || `Course ${offering.course_id}`} - {offering.course_title} ({offering.term} {offering.section || ''})
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>
      </Modal>
    </>
  )
}
