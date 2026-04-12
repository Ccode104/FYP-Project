import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getLiveLecturesByCourse } from '../../features/live-lecture/api/liveLectures';

type LiveLectureSummary = {
  id: number | string;
  status?: 'scheduled' | 'live' | 'ended';
};

type OfferingSummary = {
  id: number | string;
  course_code?: string;
  course_title?: string;
  term?: string;
  section?: string;
};

type AssignmentSummary = {
  id: number | string;
  title?: string;
  due_at?: string | null;
  submission_count?: number;
  max_score?: number;
};

type QuizSummary = {
  id: number | string;
  title?: string;
  end_at?: string | null;
  start_at?: string | null;
  status?: 'scheduled' | 'draft' | 'active';
};

function fmtDateShort(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CourseHub() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [offering, setOffering] = useState<OfferingSummary | null>(null);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [liveLectures, setLiveLectures] = useState<LiveLectureSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = courseId || '';
  const isBackendOfferingId = useMemo(() => /^\d+$/.test(id), [id]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        if (isBackendOfferingId) {
          const [o, a, q, l] = await Promise.all([
            apiFetch<OfferingSummary>(`/api/student/courses/${id}`),
            apiFetch<AssignmentSummary[]>(`/api/student/courses/${id}/assignments`).catch(() => []),
            apiFetch<QuizSummary[]>(`/api/student/courses/${id}/quizzes`).catch(() => []),
            getLiveLecturesByCourse(Number(id)).catch(() => ({ lectures: [] })),
          ]);
          if (!cancelled) {
            setOffering(o);
            setAssignments(Array.isArray(a) ? a : []);
            setQuizzes(Array.isArray(q) ? q : []);
            setLiveLectures(Array.isArray((l as any).lectures) ? (l as any).lectures : []);
          }
        } else {
          navigate(`/courses/${id}`);
          return;
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('Failed to load course hub');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, isBackendOfferingId, navigate]);

  const upcomingAssignments = useMemo(() => {
    const items = [...assignments];
    items.sort(
      (x, y) => (new Date(x.due_at || 0).getTime() || 0) - (new Date(y.due_at || 0).getTime() || 0)
    );
    return items.slice(0, 3);
  }, [assignments]);

  const upcomingQuizzes = useMemo(() => {
    const items = [...quizzes];
    items.sort(
      (x, y) => (new Date(x.end_at || 0).getTime() || 0) - (new Date(y.end_at || 0).getTime() || 0)
    );
    return items.slice(0, 3);
  }, [quizzes]);

  const userRole =
    user?.role === 'teacher' || user?.role === 'ta'
      ? 'Teacher'
      : user?.role === 'student'
        ? 'Student'
        : '';

  return (
    <div className="course-hub-page">
      {/* Header Section */}
      <header className="course-hub-header">
        <div className="course-hub-header-meta">
          <span className="course-hub-role-badge">{userRole}</span>
          <span className="course-hub-divider">•</span>
          <span className="course-hub-term">{offering?.term || 'Spring 2024 Semester'}</span>
        </div>
        <h1 className="course-hub-title">
          {offering?.course_code ? `Course Hub: ${offering.course_code}` : `Course Hub`}{' '}
          {offering?.course_title ? `— ${offering.course_title}` : ''}
        </h1>
        <p className="course-hub-description">
          Central command for lecture management, student tracking, and curriculum deployment for
          advanced algorithmic theory.
        </p>
      </header>

      {error && (
        <div className="course-hub-error">
          <div className="course-hub-error-content">
            <div className="course-hub-error-title">Couldn't load course hub</div>
            <div className="course-hub-error-message">{error}</div>
          </div>
          <button className="course-hub-error-btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {/* Quick Actions Bento Grid */}
      <section className="course-hub-quick-actions">
        <div className="course-hub-action-card" onClick={() => navigate(`/courses/${id}/present`)}>
          <div className="course-hub-action-bg">
            <span className="material-symbols-outlined">assignment</span>
          </div>
          <span className="material-symbols-outlined course-hub-action-icon">assignment</span>
          <h3 className="course-hub-action-title">Assignments</h3>
          <p className="course-hub-action-desc">Review submissions and publish new problem sets.</p>
        </div>

        <div className="course-hub-action-card" onClick={() => navigate(`/courses/${id}/quizzes`)}>
          <div className="course-hub-action-bg">
            <span className="material-symbols-outlined">quiz</span>
          </div>
          <span className="material-symbols-outlined course-hub-action-icon secondary">quiz</span>
          <h3 className="course-hub-action-title">Quizzes</h3>
          <p className="course-hub-action-desc">
            Configure automated assessments and exam schedules.
          </p>
        </div>

        <div
          className="course-hub-action-card"
          onClick={() => navigate(`/courses/${id}/discussion`)}
        >
          <div className="course-hub-action-bg">
            <span className="material-symbols-outlined">forum</span>
          </div>
          <span className="material-symbols-outlined course-hub-action-icon tertiary">forum</span>
          <h3 className="course-hub-action-title">Discussion</h3>
          <p className="course-hub-action-desc">
            Engage with students on theoretical clarifications.
          </p>
        </div>

        <div className="course-hub-action-card" onClick={() => navigate(`/courses/${id}/videos`)}>
          <div className="course-hub-action-bg">
            <span className="material-symbols-outlined">video_library</span>
          </div>
          <span className="material-symbols-outlined course-hub-action-icon error">
            video_library
          </span>
          <h3 className="course-hub-action-title">Videos</h3>
          <p className="course-hub-action-desc">
            Upload recorded lectures and supplementary media.
          </p>
        </div>

        <div
          className="course-hub-action-card course-hub-action-card-primary"
          onClick={() => {
            const activeLecture = liveLectures.find((lecture) => lecture.status === 'live');
            const nextLecture = liveLectures.find((lecture) => lecture.status === 'scheduled');
            if (activeLecture) {
              navigate(`/courses/${id}/live-lectures/${activeLecture.id}`);
            } else if (nextLecture) {
              navigate(`/courses/${id}/live-lectures/${nextLecture.id}`);
            } else {
              navigate(`/courses/${id}/live-lectures`);
            }
          }}
        >
          <div className="course-hub-action-bg">
            <span className="material-symbols-outlined">sensors</span>
          </div>
          <span className="material-symbols-outlined course-hub-action-icon white">sensors</span>
          <h3 className="course-hub-action-title white">Live Lectures</h3>
          <p className="course-hub-action-desc white">
            Start session or schedule a future virtual classroom.
          </p>
        </div>

        <div className="course-hub-action-card" onClick={() => navigate(`/courses/${id}/progress`)}>
          <div className="course-hub-action-bg">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <span className="material-symbols-outlined course-hub-action-icon">trending_up</span>
          <h3 className="course-hub-action-title">Progress</h3>
          <p className="course-hub-action-desc">Analyze class performance and retention metrics.</p>
        </div>
      </section>

      {/* Upcoming Section */}
      <section className="course-hub-upcoming">
        {/* Left Column: Upcoming Assignments */}
        <div className="course-hub-upcoming-col">
          <div className="course-hub-upcoming-header">
            <h2 className="course-hub-upcoming-title">Upcoming Assignments</h2>
            <span className="material-symbols-outlined course-hub-more-icon">more_horiz</span>
          </div>
          <div className="course-hub-upcoming-list">
            {loading ? (
              <div className="course-hub-upcoming-loading">Loading assignments...</div>
            ) : upcomingAssignments.length === 0 ? (
              <div className="course-hub-upcoming-empty">No upcoming assignments</div>
            ) : (
              upcomingAssignments.map(a => (
                <div
                  key={String(a.id)}
                  className="course-hub-upcoming-item"
                  onClick={() => navigate(`/courses/${id}/assignments/${a.id}`)}
                >
                  <div className="course-hub-upcoming-icon">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: 'FILL 1' }}
                    >
                      description
                    </span>
                  </div>
                  <div className="course-hub-upcoming-info">
                    <h4 className="course-hub-upcoming-item-title">
                      {a.title || `Assignment #${a.id}`}
                    </h4>
                    <p className="course-hub-upcoming-item-date">Due: {fmtDateShort(a.due_at)}</p>
                  </div>
                  <div className="course-hub-upcoming-badge">
                    {a.submission_count !== undefined && a.submission_count > 0 ? (
                      <span className="course-hub-upcoming-badge-primary">
                        {a.submission_count} Submissions
                      </span>
                    ) : (
                      <span className="course-hub-upcoming-badge-muted">0 Submissions</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Quizzes */}
        <div className="course-hub-upcoming-col">
          <div className="course-hub-upcoming-header">
            <h2 className="course-hub-upcoming-title">Upcoming Quizzes</h2>
            <span className="material-symbols-outlined course-hub-more-icon">more_horiz</span>
          </div>
          <div className="course-hub-upcoming-list">
            {loading ? (
              <div className="course-hub-upcoming-loading">Loading quizzes...</div>
            ) : upcomingQuizzes.length === 0 ? (
              <div className="course-hub-upcoming-empty">No upcoming quizzes</div>
            ) : (
              upcomingQuizzes.map(q => (
                <div
                  key={String(q.id)}
                  className="course-hub-upcoming-item"
                  onClick={() => navigate(`/quizzes/${q.id}`)}
                >
                  <div className="course-hub-upcoming-icon quiz">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: 'FILL 1' }}
                    >
                      timer
                    </span>
                  </div>
                  <div className="course-hub-upcoming-info">
                    <h4 className="course-hub-upcoming-item-title">{q.title || `Quiz #${q.id}`}</h4>
                    <p className="course-hub-upcoming-item-date">
                      Starts: {fmtDateShort(q.start_at || q.end_at)}
                    </p>
                  </div>
                  <div className="course-hub-upcoming-badge">
                    <span className={`course-hub-upcoming-badge-quiz ${q.status || 'scheduled'}`}>
                      {q.status === 'draft' ? 'Draft' : 'Scheduled'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
