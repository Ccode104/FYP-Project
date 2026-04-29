import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './StudentDashboardNew.css';
import Modal from '../../components/Modal';
import { enrollSelf } from '../../features/student/api/student';
import { unenrollStudent } from '../../features/courses/api/courses';
import { useToast } from '../../components/ToastProvider';
import { apiFetch } from '../../services/api';

type CourseCardData = {
  id: number;
  term?: string;
  section?: string;
  course_code?: string;
  course_title?: string;
  course_description?: string;
  faculty_name?: string;
  pending_assignments?: number;
  pending_quizzes?: number;
  overdue_assignments?: number;
  missed_quizzes?: number;
  completed_assignments?: number;
  completed_quizzes?: number;
  assignment_average?: number | null;
  quiz_average?: number | null;
  unread_notifications?: number;
};

type SuccessSummary = {
  pending_assignments: number;
  pending_quizzes: number;
  overdue_assignments: number;
  missed_quizzes: number;
  completed_assignments: number;
  completed_quizzes: number;
  unread_notifications: number;
  assignment_average: number | null;
  quiz_average: number | null;
  overall_average: number | null;
};

type DashboardEvent = {
  id: number;
  title: string;
  due_at?: string;
  event_type?: 'assignment' | 'quiz' | 'lecture';
  course_code?: string;
  course_title?: string;
  location?: string;
  course_offering_id?: number;
};

type AvailableOffering = {
  id: number;
  course_id?: number;
  course_code?: string;
  course_title?: string;
  term?: string;
  section?: string;
  available_seats?: number;
};

function getCourseProgress(course: CourseCardData) {
  const averages = [course.assignment_average, course.quiz_average].filter(
    (value): value is number => value !== null && value !== undefined
  );
  if (averages.length > 0) {
    return Math.round(averages.reduce((sum, value) => sum + value, 0) / averages.length);
  }

  const completed = (course.completed_assignments || 0) + (course.completed_quizzes || 0);
  const pending = (course.pending_assignments || 0) + (course.pending_quizzes || 0);
  const total = completed + pending;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function formatEventDate(dateString?: string) {
  if (!dateString) return { month: 'TBD', day: 'TBD' };
  const date = new Date(dateString);
  return {
    month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate(),
  };
}

function isSameDay(date: Date, comparison: Date) {
  return (
    date.getFullYear() === comparison.getFullYear() &&
    date.getMonth() === comparison.getMonth() &&
    date.getDate() === comparison.getDate()
  );
}

function CourseCard({ course, onOpen }: { course: CourseCardData; onOpen: () => void }) {
  const progress = getCourseProgress(course);
  const courseCode = course.course_code || 'Course';
  const courseTitle = course.course_title || 'Untitled Course';
  const instructor = course.faculty_name
    ? `Instructor: Prof. ${course.faculty_name}`
    : 'Instructor: TBD';

  const colorVariants = ['blue', 'purple', 'emerald', 'amber', 'rose', 'cyan'];
  const colorIndex = course.id % colorVariants.length;
  const colorVariant = colorVariants[colorIndex];

  return (
    <div className={`course-card course-card--${colorVariant}`} onClick={onOpen}>
      <div className="course-card__head">
        <div className="course-card__icon">{courseCode.charAt(0)}</div>
      </div>
      <h3 className="course-card__title">{courseCode}</h3>
      <p className="course-card__subtitle">{courseTitle}</p>
      <div className="course-card__meta">
        <span>{course.term || 'Current term'}</span>
        <span>{instructor}</span>
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
          onClick={e => {
            e.stopPropagation();
            onOpen();
          }}
        >
          View
        </button>
      </div>
    </div>
  );
}

function CalendarPanel({ events }: { events: DashboardEvent[] }) {
  const [visibleMonth, setVisibleMonth] = useState(new Date());

  const today = new Date();
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0
  ).getDate();
  const leadingSpaces = monthStart.getDay();

  const eventDates = useMemo(() => {
    return events.filter(event => event.due_at).map(event => new Date(event.due_at as string));
  }, [events]);

  const days = Array.from({ length: leadingSpaces + daysInMonth }, (_, index) => {
    const dayNumber = index - leadingSpaces + 1;
    if (dayNumber <= 0) {
      return null;
    }
    return new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), dayNumber);
  });

  const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const upcomingDeadlines = useMemo(() => {
    return events
      .filter(event => event.due_at && event.event_type)
      .sort((a, b) => new Date(a.due_at || '').getTime() - new Date(b.due_at || '').getTime())
      .slice(0, 5);
  }, [events]);

  return (
    <div className="schedule-card">
      <div className="schedule-card__calendar-header">
        <h3>{visibleMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
        <div className="schedule-card__calendar-actions">
          <button
            onClick={() =>
              setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() =>
              setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="schedule-card__weekdays">
        {weekdayLabels.map(day => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="schedule-card__days">
        {days.map((date, index) => {
          if (!date) {
            return (
              <div
                key={`empty-${index}`}
                className="schedule-card__day schedule-card__day--empty"
              />
            );
          }

          const hasEvent = eventDates.some(eventDate => isSameDay(eventDate, date));
          const isToday = isSameDay(date, today);

          return (
            <div
              key={date.toISOString()}
              className={`schedule-card__day${hasEvent ? ' schedule-card__day--event' : ''}${isToday ? ' schedule-card__day--today' : ''}`}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

      <div className="schedule-card__agenda">
        <h4>Upcoming Deadlines</h4>
        {upcomingDeadlines.length === 0 ? (
          <p className="schedule-card__empty">No upcoming deadlines</p>
        ) : (
          <div className="schedule-card__agenda-list">
            {upcomingDeadlines.map(event => {
              const { month, day } = formatEventDate(event.due_at);
              const time = event.due_at
                ? new Date(event.due_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'TBD';

              return (
                <div key={event.id} className="schedule-card__agenda-item">
                  <div className="schedule-card__agenda-date">
                    <span className="schedule-card__agenda-month">{month}</span>
                    <span className="schedule-card__agenda-day">{day}</span>
                  </div>
                  <div className="schedule-card__agenda-info">
                    <h5>{event.title}</h5>
                    <p>
                      {event.course_code || 'Course'} • {time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboardNew() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();

  const [courses, setCourses] = useState<CourseCardData[]>([]);
  const [summary, setSummary] = useState<SuccessSummary | null>(null);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [activeNav, setActiveNav] = useState('dashboard');

  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedOfferingId, setSelectedOfferingId] = useState('');
  const [availableOfferings, setAvailableOfferings] = useState<AvailableOffering[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const courseResponse = await apiFetch<{
          courses: CourseCardData[];
          summary?: SuccessSummary;
        }>('/api/courses/card-data');

        let eventResponse: { events: DashboardEvent[] } = { events: [] };
        try {
          eventResponse = await apiFetch<{ events: DashboardEvent[] }>(
            '/api/student/upcoming-events'
          );
        } catch (eventError) {
          console.warn('Failed to load upcoming events:', eventError);
        }

        if (!cancelled) {
          setCourses(courseResponse.courses || []);
          setSummary(courseResponse.summary || null);
          setEvents(eventResponse.events || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'We couldn\'t load your dashboard right now. Please try refreshing the page.');
          setCourses([]);
          setSummary(null);
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (user?.role === 'student') {
      void loadDashboard();
    }

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  useEffect(() => {
    async function loadOfferings() {
      setLoadingOfferings(true);
      try {
        const data = await apiFetch<AvailableOffering[]>('/api/courses/available-offerings');
        setAvailableOfferings(data || []);
      } catch (err) {
        console.error('Failed to load offerings:', err);
        setAvailableOfferings([]);
      } finally {
        setLoadingOfferings(false);
      }
    }

    if (enrollModalOpen) {
      void loadOfferings();
    }
  }, [enrollModalOpen]);

  const filteredCourses = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) {
      return courses;
    }

    return courses.filter(course => {
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
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [courses, searchValue]);

  const handleUnenroll = async (offeringId: number) => {
    try {
      await unenrollStudent(offeringId);
      const refreshed = await apiFetch<{ courses: CourseCardData[]; summary?: SuccessSummary }>(
        '/api/courses/card-data'
      );
      setCourses(refreshed.courses || []);
      setSummary(refreshed.summary || null);
      push({ kind: 'success', message: 'Unenrolled successfully' });
    } catch (err) {
      const message = (err as { message?: string })?.message || 'Failed to unenroll';
      push({ kind: 'error', message });
    }
  };

  const handleEnroll = async () => {
    try {
      await enrollSelf(Number(selectedOfferingId));
      const courseResponse = await apiFetch<{
        courses: CourseCardData[];
        summary?: SuccessSummary;
      }>('/api/courses/card-data');
      let eventResponse: { events: DashboardEvent[] } = { events: [] };
      try {
        eventResponse = await apiFetch<{ events: DashboardEvent[] }>(
          '/api/student/upcoming-events'
        );
      } catch (eventError) {
        console.warn('Failed to refresh upcoming events:', eventError);
      }
      setCourses(courseResponse.courses || []);
      setSummary(courseResponse.summary || null);
      setEvents(eventResponse.events || []);
      setEnrollModalOpen(false);
      setSelectedOfferingId('');
      push({ kind: 'success', message: 'Course enrolled successfully' });
    } catch (err) {
      const message = (err as { message?: string })?.message || 'Enrollment failed';
      push({ kind: 'error', message });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'courses', label: 'My Courses', icon: 'menu_book' },
    { id: 'assignments', label: 'Assignments', icon: 'assignment' },
    { id: 'grades', label: 'Grades', icon: 'grade' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar_today' },
  ];

  return (
    <>
      <div className="app-content">
        <section className="student-main">
          <div className="student-hero">
            <div className="student-hero__text">
              <span className="student-hero__badge">Student</span>
              <h2>Welcome back, {user?.name || 'Student'}!</h2>
              <p>Track your academic progress and upcoming deadlines.</p>
            </div>
          </div>

          <div className="student-stats">
            <div className="student-stat">
              <div className="student-stat__header">
                <span className="material-symbols-outlined student-stat__icon student-stat__icon--indigo">
                  assignment_late
                </span>
                <span className="student-stat__badge student-stat__badge--green">
                  -{summary?.overdue_assignments || 0} this week
                </span>
              </div>
              <span className="student-stat__value">{summary?.pending_assignments ?? 0}</span>
              <span className="student-stat__label">Pending Assignments</span>
            </div>
            <div className="student-stat">
              <div className="student-stat__header">
                <span className="material-symbols-outlined student-stat__icon student-stat__icon--amber">
                  quiz
                </span>
                <span className="student-stat__badge">
                  Active: {summary?.pending_quizzes ?? 0}
                </span>
              </div>
              <span className="student-stat__value">{summary?.pending_quizzes ?? 0}</span>
              <span className="student-stat__label">Pending Quizzes</span>
            </div>
            <div className="student-stat">
              <div className="student-stat__header">
                <span className="material-symbols-outlined student-stat__icon student-stat__icon--emerald">
                  star_half
                </span>
                <span className="student-stat__badge student-stat__badge--emerald">Top 10%</span>
              </div>
              <span className="student-stat__value">
                {summary?.overall_average ? `${summary.overall_average}%` : 'N/A'}
              </span>
              <span className="student-stat__label">Current GPA</span>
            </div>
          </div>

          <div className="student-courses__header">
            <h3>My Enrolled Courses</h3>
            <button onClick={() => setEnrollModalOpen(true)}>Browse Courses</button>
          </div>

          {error && (
            <div className="student-error">
              <span>{error}</span>
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}

          {loading ? (
            <div className="student-courses__grid">
              {[1, 2].map(i => (
                <div key={i} className="course-card course-card--skeleton" />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="student-courses__empty">
              <h4>No courses enrolled</h4>
              <p>
                {courses.length === 0
                  ? 'Enroll in a course to get started.'
                  : 'Try a different search term.'}
              </p>
              <button onClick={() => setEnrollModalOpen(true)}>Browse Courses</button>
            </div>
          ) : (
            <div className="student-courses__grid">
              {filteredCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onOpen={() => navigate(`/courses/${course.id}/hub`)}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="student-sidebar__right">
          <CalendarPanel events={events} />
        </aside>
      </div>

      <Modal
        open={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        title="Enroll in Course"
        actions={
          <>
            <button className="btn" onClick={() => setEnrollModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleEnroll}
              disabled={!selectedOfferingId || loadingOfferings}
            >
              Enroll
            </button>
          </>
        }
      >
        <div className="form">
          {loadingOfferings ? (
            <p className="student-modal__status">Loading courses...</p>
          ) : availableOfferings.length === 0 ? (
            <p className="student-modal__status">No courses available to enroll right now.</p>
          ) : (
            <label className="field">
              <span className="label">Select Course</span>
              <select
                className="input"
                value={selectedOfferingId}
                onChange={e => setSelectedOfferingId(e.target.value)}
              >
                <option value="">-- Select a course --</option>
                {availableOfferings.map(offering => (
                  <option key={offering.id} value={offering.id}>
                    {offering.course_code || `Course ${offering.course_id}`} -{' '}
                    {offering.course_title} ({offering.term} {offering.section || ''})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </Modal>
    </>
  );
}
