import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { fetchPlannerTasks, type PlannerTask } from '../../features/planner/api/planner';
import { getCourseProgress, getMyProgress, type ProgressRow } from '../../features/progress/api/progress';
import './ProgressExperience.css';

type CourseCardData = {
  id: number;
  term?: string;
  section?: string;
  course_code?: string;
  course_title?: string;
  faculty_name?: string;
  pending_assignments?: number;
  pending_quizzes?: number;
  overdue_assignments?: number;
  missed_quizzes?: number;
  completed_assignments?: number;
  completed_quizzes?: number;
};

type StudentCourseDetails = {
  id: number;
  course_code?: string;
  title?: string;
  description?: string;
  faculty_name?: string;
  term?: string;
  section?: string;
};

function getStatusVariant(status?: string | null) {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('overdue') || normalized.includes('missed')) return 'overdue';
  if (normalized.includes('grade') || normalized.includes('complete')) return 'completed';
  if (normalized.includes('submit')) return 'submitted';
  if (normalized.includes('lock')) return 'locked';
  return 'pending';
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function groupBy<T, K extends string | number | symbol>(list: T[], getKey: (item: T) => K): Record<K, T[]> {
  return list.reduce((acc, item) => {
    const key = getKey(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

function TeacherCourseProgressTable({
  rows,
  offeringId,
}: {
  rows: ProgressRow[];
  offeringId?: string;
}) {
  const byStudent = useMemo(() => groupBy(rows, row => String(row.student_id || 'unknown')), [rows]);

  if (Object.keys(byStudent).length === 0) {
    return <div className="progress-page__empty">No course progress data available.</div>;
  }

  return (
    <div className="progress-page__panel">
      <div className="progress-page__section-head">
        <div>
          <p className="progress-page__eyebrow">Course Progress Analytics</p>
          <h2 className="progress-page__section-title">Offering #{offeringId}</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {Object.entries(byStudent).map(([studentId, items]) => {
          const total = items.length;
          const completed = items.filter(item => (item.score ?? null) !== null).length;
          const completion = total ? clampPercent((completed / total) * 100) : 0;
          return (
            <article key={studentId} className="progress-page__course-item">
              <div className="progress-page__course-item-head">
                <div>
                  <strong>{items[0]?.student_name || items[0]?.student_email || `Student #${studentId}`}</strong>
                  <div className="progress-page__muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {completed} of {total} tracked activities completed
                  </div>
                </div>
                <strong>{completion}%</strong>
              </div>
              <div className="progress-page__progress-track" style={{ marginTop: '0.75rem' }}>
                <div className="progress-page__progress-fill" style={{ width: `${completion}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function CourseProgress() {
  const { offeringId } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [courses, setCourses] = useState<CourseCardData[]>([]);
  const [courseDetails, setCourseDetails] = useState<StudentCourseDetails | null>(null);
  const [plannerTasks, setPlannerTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCourseProgressPage() {
      if (!offeringId) return;
      setLoading(true);
      setError(null);

      try {
        if (isStudent) {
          const [myProgress, courseResponse, details, planner] = await Promise.all([
            getMyProgress(),
            apiFetch<{ courses: CourseCardData[] }>('/api/courses/card-data'),
            apiFetch<StudentCourseDetails>(`/api/student/courses/${offeringId}`),
            fetchPlannerTasks({ course_offering_id: offeringId }),
          ]);

          if (cancelled) return;

          setRows((myProgress.rows || []).filter(row => String(row.course_offering_id) === offeringId));
          setCourses(courseResponse.courses || []);
          setCourseDetails(details);
          setPlannerTasks(planner.tasks || []);
        } else {
          const courseProgress = await getCourseProgress(offeringId);
          if (cancelled) return;
          setRows(courseProgress.rows || []);
        }
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : 'Failed to load course progress';
        if (!cancelled) {
          setError(message);
          push({ kind: 'error', message: 'Failed to load course progress' });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCourseProgressPage();
    return () => {
      cancelled = true;
    };
  }, [isStudent, offeringId, push]);

  const selectedCourse = useMemo(
    () => courses.find(course => String(course.id) === offeringId) || null,
    [courses, offeringId]
  );

  const completionSummary = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter(row => row.score !== null && row.score !== undefined).length;
    return {
      total,
      completed,
      completion: total ? clampPercent((completed / total) * 100) : 0,
    };
  }, [rows]);

  const plannerSummary = useMemo(() => {
    const completed = plannerTasks.filter(task => task.completed_at).length;
    const pending = plannerTasks.filter(task => !task.completed_at && task.status !== 'done').length;
    const overdue = plannerTasks.filter(
      task => !task.completed_at && !!task.due_at && new Date(task.due_at) < new Date()
    ).length;
    return { completed, pending, overdue };
  }, [plannerTasks]);

  const nextTask = useMemo(() => {
    return [...plannerTasks]
      .filter(task => !task.completed_at)
      .sort((a, b) => {
        const aTime = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })[0];
  }, [plannerTasks]);

  if (!isStudent) {
    return (
      <>
        {loading && <div className="progress-page__loading">Loading course progress...</div>}
        {!loading && error && <div className="progress-page__error">{error}</div>}
        {!loading && !error && <TeacherCourseProgressTable rows={rows} offeringId={offeringId} />}
      </>
    );
  }

  return (
    <div className="progress-experience">
      {loading && <div className="progress-page__loading">Loading course intelligence...</div>}
      {!loading && error && <div className="progress-page__error">{error}</div>}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <section className="progress-page__section-head">
            <div>
              <p className="progress-page__eyebrow">Academics • Progress Tracking</p>
              <h1 className="progress-page__section-title">Course Intelligence</h1>
            </div>
            <button className="progress-page__action-button" onClick={() => navigate('/progress')}>
              Return to Overview
            </button>
          </section>

          <section className="progress-page__grid">
            <article className="progress-page__panel" style={{ gridColumn: 'span 8' }}>
              <div className="progress-page__card-head" style={{ justifyContent: 'space-between' }}>
                <h2 className="progress-page__section-title" style={{ fontSize: '1.35rem' }}>
                  Enrolled Courses
                </h2>
                <span className="progress-page__eyebrow">{courses.length} active</span>
              </div>
              <div className="progress-page__course-grid" style={{ marginTop: '1rem' }}>
                {courses.map(course => {
                  const total =
                    (course.completed_assignments || 0) +
                    (course.completed_quizzes || 0) +
                    (course.pending_assignments || 0) +
                    (course.pending_quizzes || 0) +
                    (course.overdue_assignments || 0) +
                    (course.missed_quizzes || 0);
                  const completion = total
                    ? clampPercent(
                        (((course.completed_assignments || 0) + (course.completed_quizzes || 0)) / total) * 100
                      )
                    : 0;

                  return (
                    <article
                      key={course.id}
                      className={`progress-page__course-item${String(course.id) === offeringId ? ' is-selected' : ''}`}
                      onClick={() => navigate(`/progress/course/${course.id}`)}
                    >
                      <div className="progress-page__course-item-head">
                        <div>
                          <strong>
                            {course.course_code} • {course.course_title}
                          </strong>
                          <div className="progress-page__muted" style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                            {course.faculty_name ? `Instructor: ${course.faculty_name}` : 'Instructor unavailable'}
                          </div>
                        </div>
                        <strong>{completion}%</strong>
                      </div>
                      <div className="progress-page__progress-track" style={{ marginTop: '0.75rem' }}>
                        <div className="progress-page__progress-fill" style={{ width: `${completion}%` }} />
                      </div>
                      <div
                        className="progress-page__metric-row"
                        style={{ justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.8rem' }}
                      >
                        <span>
                          {(course.completed_assignments || 0) + (course.completed_quizzes || 0)} completed
                        </span>
                        <span>{(course.pending_assignments || 0) + (course.pending_quizzes || 0)} pending</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </article>

            <aside className="progress-page__panel" style={{ gridColumn: 'span 4' }}>
              <div className="progress-page__card-head">
                <span className="progress-page__icon-circle">
                  <span className="material-symbols-outlined">event_note</span>
                </span>
                <div>
                  <h3 style={{ margin: 0 }}>Planner Sync</h3>
                  <p className="progress-page__muted" style={{ marginTop: '0.35rem' }}>
                    Real tasks connected to this course offering.
                  </p>
                </div>
              </div>

              <div className="progress-page__task-list" style={{ marginTop: '1rem' }}>
                <div className="progress-page__task-item">
                  <div>
                    <strong>Completed</strong>
                    <div className="progress-page__muted" style={{ fontSize: '0.8rem' }}>
                      {plannerSummary.completed} tasks
                    </div>
                  </div>
                  <span className="progress-page__status-pill progress-page__status-pill--completed">Done</span>
                </div>
                <div className="progress-page__task-item">
                  <div>
                    <strong>Pending</strong>
                    <div className="progress-page__muted" style={{ fontSize: '0.8rem' }}>
                      {plannerSummary.pending} tasks
                    </div>
                  </div>
                  <span className="progress-page__status-pill progress-page__status-pill--pending">Open</span>
                </div>
                <div className="progress-page__task-item">
                  <div>
                    <strong>Overdue</strong>
                    <div className="progress-page__muted" style={{ fontSize: '0.8rem' }}>
                      {plannerSummary.overdue} tasks
                    </div>
                  </div>
                  <span className="progress-page__status-pill progress-page__status-pill--overdue">Attention</span>
                </div>
              </div>

              <div className="progress-page__mini-card" style={{ marginTop: '1rem' }}>
                <strong>Next scheduled task</strong>
                <div className="progress-page__muted" style={{ fontSize: '0.82rem', marginTop: '0.35rem' }}>
                  {nextTask
                    ? `${nextTask.title}${nextTask.due_at ? ` • due ${new Date(nextTask.due_at).toLocaleString()}` : ''}`
                    : 'No upcoming task for this course.'}
                </div>
              </div>
            </aside>
          </section>

          <section>
            <div className="progress-page__section-head">
              <div>
                <p className="progress-page__eyebrow">Selected Course</p>
                <h2 className="progress-page__section-title">
                  Module Drilldown: {courseDetails?.title || selectedCourse?.course_title || `Offering #${offeringId}`}
                </h2>
                <p className="progress-page__muted" style={{ marginTop: '0.5rem' }}>
                  {courseDetails?.faculty_name ? `Instructor: ${courseDetails.faculty_name}` : 'Tracked items in this course'}
                </p>
              </div>
              <div className="progress-page__filter-actions">
                <span className="progress-page__status-pill progress-page__status-pill--completed">
                  {completionSummary.completed}/{completionSummary.total} completed
                </span>
              </div>
            </div>

            <article className="progress-page__table-card">
              <div className="progress-page__table-wrapper">
                <table className="progress-page__table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Due</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="progress-page__empty">No tracked items for this course yet.</div>
                        </td>
                      </tr>
                    ) : (
                      rows.map(row => {
                        const statusVariant = getStatusVariant(row.status);
                        return (
                          <tr key={`${row.activity_type}-${row.activity_id}`}>
                            <td>
                              <strong>{row.activity_title || `#${row.activity_id}`}</strong>
                              <div className="progress-page__muted" style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
                                {row.submitted_at
                                  ? `Updated ${new Date(row.submitted_at).toLocaleString()}`
                                  : 'No submission yet'}
                              </div>
                            </td>
                            <td>{row.activity_type}</td>
                            <td>
                              <span className={`progress-page__status-pill progress-page__status-pill--${statusVariant}`}>
                                {row.status || 'Pending'}
                              </span>
                            </td>
                            <td>
                              {row.score !== null && row.score !== undefined
                                ? `${row.score}${row.max_score ? ` / ${row.max_score}` : ''}`
                                : 'Pending'}
                            </td>
                            <td>{row.due_at ? new Date(row.due_at).toLocaleString() : 'TBD'}</td>
                            <td>
                              <button className="progress-page__ghost-button" onClick={() => navigate('/planner')}>
                                {statusVariant === 'overdue' ? 'Resume now' : 'Open plan'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <section className="progress-page__actions-grid">
            <article className="progress-page__action-card">
              <span className="progress-page__icon-circle">
                <span className="material-symbols-outlined">school</span>
              </span>
              <div>
                <strong>Open Course Hub</strong>
                <div className="progress-page__muted" style={{ fontSize: '0.82rem', marginTop: '0.3rem' }}>
                  Jump back into the course workspace and continue from the latest item.
                </div>
              </div>
              <button className="progress-page__ghost-button" onClick={() => navigate(`/courses/${offeringId}`)}>
                Open
              </button>
            </article>

            <article className="progress-page__action-card">
              <span className="progress-page__icon-circle">
                <span className="material-symbols-outlined">auto_awesome</span>
              </span>
              <div>
                <strong>Review Planner Tasks</strong>
                <div className="progress-page__muted" style={{ fontSize: '0.82rem', marginTop: '0.3rem' }}>
                  Focus on pending and overdue tasks linked to this course.
                </div>
              </div>
              <button className="progress-page__ghost-button" onClick={() => navigate('/planner')}>
                Planner
              </button>
            </article>
          </section>
        </div>
      )}
    </div>
  );
}
