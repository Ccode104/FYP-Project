import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getLiveLecturesByCourse } from '../../features/live-lecture/api/liveLectures';
import './CourseHub.css';

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
  progress?: number;
  instructor_name?: string;
  instructor_avatar?: string;
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

type ActivityItem = {
  id: string | number;
  type: 'submission' | 'comment' | 'video' | 'quiz';
  title: string;
  description: string;
  time: string;
  date: Date;
};

type Submission = {
  id: number;
  assignment_id: number;
  assignment_title: string;
  submitted_at: string;
  status: string;
};

type QuizAttempt = {
  id: number;
  quiz_id: number;
  quiz_title: string;
  finished_at: string;
  started_at: string;
  score: number;
};

type Grade = {
  assignment_title: string;
  score: number;
  feedback: string;
  graded_at: string;
};

type Video = {
  id: number;
  title: string;
  description?: string;
  created_at: string;
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

function timeAgo(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  const [activeNav, setActiveNav] = useState('courses');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);

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
          const [o, a, q, l, sub, gr, vid, attempts] = await Promise.all([
            apiFetch<OfferingSummary>(`/api/student/courses/${id}`),
            apiFetch<AssignmentSummary[]>(`/api/student/courses/${id}/assignments`).catch(() => []),
            apiFetch<QuizSummary[]>(`/api/student/courses/${id}/quizzes`).catch(() => []),
            getLiveLecturesByCourse(Number(id)).catch(() => ({ lectures: [] })),
            apiFetch<Submission[]>(`/api/student/courses/${id}/submissions`).catch(() => []),
            apiFetch<Grade[]>(`/api/student/courses/${id}/grades`).catch(() => []),
            apiFetch<Video[]>(`/api/videos/course/${id}`).catch(() => []),
            apiFetch<QuizAttempt[]>(`/api/student/${user?.id}/quiz-attempts`).catch(() => []),
          ]);
          if (!cancelled) {
            setOffering(o);
            setAssignments(Array.isArray(a) ? a : []);
            setQuizzes(Array.isArray(q) ? q : []);
            setLiveLectures(Array.isArray((l as any).lectures) ? (l as any).lectures : []);
            setSubmissions(Array.isArray(sub) ? sub : []);
            setGrades(Array.isArray(gr) ? gr : []);
            setVideos(Array.isArray(vid) ? vid : []);

            // Filter quiz attempts for THIS course
            const courseQuizIds = new Set(Array.isArray(q) ? q.map(quiz => Number(quiz.id)) : []);
            const filteredAttempts = Array.isArray(attempts)
              ? attempts.filter(att => courseQuizIds.has(Number(att.quiz_id)))
              : [];
            setQuizAttempts(filteredAttempts);
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

  const pendingAssignments = assignments.filter(
    a => a.due_at && new Date(a.due_at) > new Date()
  ).length;
  const nextQuiz = quizzes.find(q => q.status === 'scheduled');

  const recentActivity = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];

    // Add submissions
    submissions.forEach(s => {
      items.push({
        id: `sub-${s.id}`,
        type: 'submission',
        title: 'Assignment Submitted',
        description: `You submitted '${s.assignment_title}' successfully.`,
        time: timeAgo(s.submitted_at),
        date: new Date(s.submitted_at),
      });
    });

    // Add quiz attempts
    quizAttempts.forEach(qa => {
      items.push({
        id: `quiz-${qa.id}`,
        type: 'quiz',
        title: 'Quiz Attempted',
        description: `You completed '${qa.quiz_title}'.`,
        time: timeAgo(qa.finished_at || qa.started_at),
        date: new Date(qa.finished_at || qa.started_at),
      });
    });

    // Add feedback (grades)
    grades.forEach((g, idx) => {
      items.push({
        id: `grade-${idx}`,
        type: 'comment',
        title: 'Feedback Received',
        description: `Feedback received for '${g.assignment_title}': ${g.score} points.`,
        time: timeAgo(g.graded_at),
        date: new Date(g.graded_at),
      });
    });

    // Add videos
    videos.forEach(v => {
      items.push({
        id: `vid-${v.id}`,
        type: 'video',
        title: 'New Video Uploaded',
        description: `Lecture video '${v.title}' is now available.`,
        time: timeAgo(v.created_at),
        date: new Date(v.created_at),
      });
    });

    // Sort by date descending and take top 5
    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  }, [submissions, quizAttempts, grades, videos]);


  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'courses', label: 'My Courses', icon: 'school' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
    { id: 'assignments', label: 'Assignments', icon: 'assignment' },
    { id: 'grades', label: 'Grades', icon: 'grade' },
    { id: 'library', label: 'Library', icon: 'menu_book' },
  ];

  const actionCards = [
    {
      id: 'assignments',
      title: 'Assignments',
      desc: 'Review, manage, and submit your weekly coursework.',
      badge: `${pendingAssignments} Pending`,
      color: 'blue',
      icon: 'assignment',
    },
    {
      id: 'quizzes',
      title: 'Quizzes',
      desc: 'Take mid-term assessments and practice quizzes.',
      badge: nextQuiz ? `Next: ${fmtDateShort(nextQuiz.end_at)?.split(',')[0]}` : 'None',
      color: 'amber',
      icon: 'quiz',
    },
    {
      id: 'discussion',
      title: 'Discussion',
      desc: 'Engage with peers and instructors on course topics.',
      badge: '12 New Posts',
      color: 'purple',
      icon: 'forum',
    },
    {
      id: 'videos',
      title: 'Videos',
      desc: 'Catch up with previous lecture recordings anytime.',
      badge: '24 Modules',
      color: 'rose',
      icon: 'movie',
    },
    {
      id: 'live',
      title: 'Live Lectures',
      desc: 'Join active sessions or view upcoming schedules.',
      badge: 'Join Now',
      color: 'emerald',
      icon: 'live_tv',
    },
    {
      id: 'progress',
      title: 'Progress',
      desc: 'Detailed analytics of your academic performance.',
      badge: 'Top 5%',
      color: 'indigo',
      icon: 'analytics',
    },
  ];

  const handleActionClick = (cardId: string) => {
    switch (cardId) {
      case 'assignments':
        navigate(`/courses/${id}/assignments`);
        break;
      case 'quizzes':
        navigate(`/courses/${id}/quiz-management`);
        break;
      case 'discussion':
        navigate(`/courses/${id}/discussion`);
        break;
      case 'videos':
        if (user?.role === 'teacher' || user?.role === 'ta') {
          navigate(`/courses/${id}/videos`);
        } else {
          navigate(`/courses/${id}/library`);
        }
        break;
      case 'live':
        navigate(`/courses/${id}/live`);
        break;
      case 'progress':
        navigate(`/progress/course/${id}`);
        break;
    }
  };

  if (loading) {
    return (
      <div
        className="course-hub-page"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <p>Loading course hub...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="course-hub-page"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2>Couldn't load course hub</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="course-hub-page">
      {/* Main Content */}
      <main className="course-hub-content">
        {/* Course Hero */}
        <section className="course-hub-hero">
          <div className="course-hub-hero__content">
            <div className="course-hub-hero__badges">
              <span className="course-hub-hero__badge">{offering?.course_code || 'CS-402'}</span>
              <span className="course-hub-hero__badge course-hub-hero__badge--active">
                Active Semester
              </span>
            </div>
            <h2 className="course-hub-hero__title">
              {offering?.course_title || 'Advanced Algorithm Analysis'}
            </h2>
            <div className="course-hub-hero__meta">
              <div className="course-hub-hero__instructor">
                <img
                  className="course-hub-hero__instructor-img"
                  src="https://via.placeholder.com/48"
                  alt="Instructor"
                />
                <div className="course-hub-hero__instructor-info">
                  <p className="course-hub-hero__instructor-label">Instructor</p>
                  <p className="course-hub-hero__instructor-name">
                    {offering?.instructor_name || 'Dr. Sarah Mitchell'}
                  </p>
                </div>
              </div>
              <div className="course-hub-hero__divider"></div>
              <div className="course-hub-hero__progress">
                <div className="course-hub-hero__progress-label">
                  <span>Course Progress</span>
                  <span>{offering?.progress || 78}%</span>
                </div>
                <div className="course-hub-hero__progress-track">
                  <div
                    className="course-hub-hero__progress-fill"
                    style={{ width: `${offering?.progress || 78}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <div className="course-hub-hero__bg">
            <svg
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
              style={{ width: '100%', height: '100%' }}
            >
              <path d="M0 0 L100 100 L100 0 Z" fill="white"></path>
            </svg>
          </div>
        </section>

        {/* Quick Action Cards */}
        <section className="course-hub-actions">
          {actionCards.map(card => (
            <div
              key={card.id}
              className="course-hub-action-card"
              onClick={() => handleActionClick(card.id)}
            >
              <div
                className={`course-hub-action-card__icon course-hub-action-card__icon--${card.color}`}
              >
                <span className="material-symbols-outlined font-filled">{card.icon}</span>
              </div>
              <h3 className="course-hub-action-card__title">{card.title}</h3>
              <p className="course-hub-action-card__desc">{card.desc}</p>
              <div className="course-hub-action-card__footer">
                <span
                  className={`course-hub-action-card__badge course-hub-action-card__badge--${card.color}`}
                >
                  {card.badge}
                </span>
                <span className="material-symbols-outlined course-hub-action-card__arrow">
                  arrow_forward_ios
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* Recent Activity */}
        <section className="course-hub-activity">
          <div className="course-hub-activity__header">
            <h3 className="course-hub-activity__title">Recent Activity</h3>
            <button className="course-hub-activity__viewall">View All</button>
          </div>
          <div className="course-hub-activity__list">
            {recentActivity.map(item => (
              <div key={item.id} className="course-hub-activity__item">
                <div className="course-hub-activity__icon">
                  <span className="material-symbols-outlined">
                    {item.type === 'submission'
                      ? 'upload_file'
                      : item.type === 'comment'
                        ? 'comment'
                        : item.type === 'quiz'
                          ? 'quiz'
                          : 'play_circle'}
                  </span>
                </div>
                <div className="course-hub-activity__info">
                  <div className="course-hub-activity__item-header">
                    <h4 className="course-hub-activity__item-title">{item.title}</h4>
                    <span className="course-hub-activity__item-time">{item.time}</span>
                  </div>
                  <p className="course-hub-activity__item-desc">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
