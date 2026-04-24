import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './QuizManagement.css';

interface Quiz {
  id: number;
  title: string;
  description?: string;
  start_at?: string;
  end_at?: string;
  time_limit?: number;
  max_score?: number;
  status?: 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';
  total_submissions?: number;
  average_score?: number;
  google_form_url?: string;
  google_form_id?: string;
}

function getQuizStatus(quiz: Quiz): 'scheduled' | 'active' | 'completed' {
  const now = new Date();
  const start = quiz.start_at ? new Date(quiz.start_at) : null;
  const end = quiz.end_at ? new Date(quiz.end_at) : null;

  if (!start || !end) return 'scheduled';
  if (now < start) return 'scheduled';
  if (now >= start && now <= end) return 'active';
  return 'completed';
}

interface CourseInfo {
  id: number;
  course_code: string;
  course_title: string;
  term?: string;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'TBD';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function QuizManagement() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lockCourseEnabled, setLockCourseEnabled] = useState(false);
  const [autoGradeEnabled, setAutoGradeEnabled] = useState(true);
  const [proctoringEnabled, setProctoringEnabled] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    course_offering_id: courseId ? Number(courseId) : 0,
    start_at: '',
    end_at: '',
    max_score: 100,
    time_limit: 60,
    is_proctored: false,
    allow_suspension_resume: false,
    google_form_url: '',
  });
  const [creating, setCreating] = useState(false);
  const [deletingQuizId, setDeletingQuizId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const reloadQuizzes = () => setReloadKey(prev => prev + 1);

  const isTeacher =
    user?.role === 'teacher' ||
    user?.role === 'ta' ||
    user?.role === 'faculty' ||
    user?.role === 'admin';

  const handleDeleteClick = (quiz: Quiz) => {
    setQuizToDelete(quiz);
    setShowDeleteConfirm(true);
  };

  const deleteQuiz = async (quizId: number) => {
    setDeletingQuizId(quizId);
    try {
      await apiFetch(`/api/quiz-builder/quizzes/${quizId}`, { method: 'DELETE' });
      reloadQuizzes();
      setShowDeleteConfirm(false);
      setQuizToDelete(null);
      // Simple toast
      setError(`Quiz "${quizzes.find(q => q.id === quizId)?.title}" deleted successfully`);
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete quiz');
    } finally {
      setDeletingQuizId(null);
    }
  };

  const extractGoogleFormId = (url: string): string => {
    const match = url.match(/\/forms(?:\/u\/\d+)?\/d(?:\/e)?\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
  };

  const getGoogleFormEditUrl = (quiz: Quiz): string => {
    console.debug('QuizManagement: resolving edit URL', {
      quizId: quiz.id,
      google_form_url: quiz.google_form_url,
      google_form_id: quiz.google_form_id,
    });

    if (quiz.google_form_url?.includes('/edit')) {
      return quiz.google_form_url;
    }

    const formId = quiz.google_form_id || extractGoogleFormId(quiz.google_form_url || '');
    const resolvedUrl = formId ? `https://docs.google.com/forms/d/${formId}/edit` : '';

    console.debug('QuizManagement: resolved edit URL', {
      quizId: quiz.id,
      resolvedUrl,
    });

    return resolvedUrl;
  };

  const openGoogleFormEditor = (quiz: Quiz) => {
    const editUrl = getGoogleFormEditUrl(quiz);
    if (!editUrl) {
      setError('This quiz does not have a linked Google Form editor URL');
      return;
    }
    const opened = window.open(editUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.assign(editUrl);
    }
  };

  const handleCreateQuiz = async () => {
    if (!newQuiz.title || !newQuiz.start_at || !newQuiz.end_at || !courseId) return;

    if (!newQuiz.google_form_url) {
      setError('Please provide a Google Form URL');
      return;
    }

    const googleFormId = extractGoogleFormId(newQuiz.google_form_url);
    if (!googleFormId) {
      setError('Invalid Google Form URL. Please provide a valid Google Form link.');
      return;
    }

    setCreating(true);
    try {
        const created = await apiFetch<{ quiz: Quiz }>(`/api/quizzes/`, {
        method: 'POST',
        body: {
          course_offering_id: Number(courseId),
          title: newQuiz.title,
          description: newQuiz.description || '',
          start_at: newQuiz.start_at,
          end_at: newQuiz.end_at,
          max_score: newQuiz.max_score,
          time_limit: newQuiz.time_limit,
          is_proctored: newQuiz.is_proctored,
          allow_suspension_resume: newQuiz.allow_suspension_resume,
          google_form_url: newQuiz.google_form_url,
          google_form_id: googleFormId,
        },
      });
      setQuizzes(prev => [...prev, created.quiz]);
      setShowCreateModal(false);
      setNewQuiz({
        title: '',
        course_offering_id: Number(courseId),
        start_at: '',
        end_at: '',
        max_score: 100,
        time_limit: 60,
        is_proctored: false,
        allow_suspension_resume: false,
        google_form_url: '',
      });
    } catch (err) {
      console.error('Failed to create quiz:', err);
      setError('Failed to create quiz');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (!courseId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch course data
        const course = await apiFetch<CourseInfo>(`/api/student/courses/${courseId}`);
        setCourse(course);

        // Fetch quizzes
        const quizzesData = await apiFetch<Quiz[]>(`/api/quiz-builder/courses/${courseId}/quizzes`);
        console.debug('QuizManagement: loaded quizzes', quizzesData);
        setQuizzes(quizzesData);
      } catch (err) {
        console.error('Failed to load quizzes:', err);
        setError('Failed to load course data');
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, reloadKey]);

  const upcomingQuizzes = quizzes.filter(q => getQuizStatus(q) === 'scheduled');
  const completedQuizzes = quizzes.filter(q => getQuizStatus(q) === 'completed');

  const curriculumProgress = 72;
  const quizCompletion = completedQuizzes.length > 0 ? 94 : 75;

  if (loading) {
    return (
      <div className="quiz-management-page">
        <div className="quiz-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading quizzes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-management-page">
      <div className="quiz-container">
        <div className="quiz-container-inner">
          {/* Top Nav Bar */}
          <header className="quiz-topbar">
            <div className="quiz-topbar-left">
              <div className="quiz-course-info">
                <span className="quiz-course-label">Course Management</span>
                <h2 className="quiz-course-title">
                  {course?.course_code}: {course?.course_title}
                </h2>
              </div>
            </div>
            <div className="quiz-topbar-right">
              <div className="quiz-search-box">
                <span className="material-symbols-outlined">search</span>
                <input type="text" placeholder="Search quizzes..." />
              </div>
              <div className="quiz-topbar-actions">
                <button className="icon-btn" title="Dark Mode">
                  <span className="material-symbols-outlined">dark_mode</span>
                </button>
                <button className="icon-btn relative" title="Notifications">
                  <span className="material-symbols-outlined">notifications</span>
                  <span className="notification-dot"></span>
                </button>
                <div className="user-avatar"></div>
              </div>
            </div>
          </header>

          {/* Hero Header / Action Bar */}
          <div className="quiz-hero">
            <div className="quiz-hero-content">
              <h3 className="quiz-hero-title">Quiz Management</h3>
              <p className="quiz-hero-subtitle">
                Manage assessments, schedule new evaluations, and analyze student performance across
                the {course?.course_code} curriculum.
              </p>
            </div>
            <button
              className="btn btn-primary quiz-create-btn"
              onClick={() => setShowCreateModal(true)}
            >
              <span className="material-symbols-outlined">add</span>
              <span>Link Google Form Quiz</span>
            </button>
          </div>

          {/* Bento Grid Layout */}
          <div className="quiz-bento-grid">
            {/* Main Activity Panel (Left Column) */}
            <div className="quiz-main-panel">
              {/* Upcoming Quizzes */}
              <section className="quiz-section">
                <div className="quiz-section-header">
                  <div className="quiz-section-title">
                    <span className="material-symbols-outlined">pending_actions</span>
                    <h4>Upcoming Assessments</h4>
                  </div>
                  <span className="quiz-badge">{upcomingQuizzes.length} SCHEDULED</span>
                </div>
                <div className="quiz-list">
                  {upcomingQuizzes.length === 0 ? (
                    <div className="quiz-empty-card">
                      <p>No upcoming quizzes scheduled</p>
                    </div>
                  ) : (
                    upcomingQuizzes.slice(0, 2).map(quiz => (
                      <div key={quiz.id} className="quiz-card">
                        <div className="quiz-card-content">
                          <div className="quiz-card-icon google-form-badge">
                            <svg viewBox="0 0 24 24" width="20" height="20">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.96 21.07 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.96 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              />
                            </svg>
                          </div>
                          <div className="quiz-card-details">
                            <h5 className="quiz-card-title">{quiz.title}</h5>
                            <div className="quiz-card-meta">
                              <span>
                                <span className="material-symbols-outlined">calendar_today</span>{' '}
                                {formatDate(quiz.start_at)}
                              </span>
                              <span>
                                <span className="material-symbols-outlined">schedule</span>{' '}
                                {formatTime(quiz.start_at)} ({quiz.time_limit || 60} min)
                              </span>
                            </div>
                            {quiz.google_form_url && (
                              <a
                                href={getGoogleFormEditUrl(quiz)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="quiz-google-link"
                              >
                                <span className="material-symbols-outlined">open_in_new</span>
                                Open Google Form
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="quiz-card-actions">
                          <button
                            className="action-btn"
                            title="View Results"
                            onClick={() => navigate(`/quizzes/${quiz.id}/results`)}
                          >
                            <span className="material-symbols-outlined">analytics</span>
                          </button>
                          <a
                            className="action-btn"
                            title="Edit in Google Forms"
                            href={getGoogleFormEditUrl(quiz) || quiz.google_form_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => {
                              if (!getGoogleFormEditUrl(quiz) && !quiz.google_form_url) {
                                e.preventDefault();
                                setError('This quiz does not have a linked Google Form editor URL');
                              }
                            }}
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </a>
                          {isTeacher && (
                            <button
                              className="action-btn delete"
                              title="Delete Quiz"
                              onClick={() => handleDeleteClick(quiz)}
                              disabled={deletingQuizId === quiz.id}
                            >
                              <span className="material-symbols-outlined">
                                {deletingQuizId === quiz.id ? 'hourglass_empty' : 'delete'}
                              </span>
                            </button>
                          )}
                          <div className="action-divider"></div>
                          <button className="btn-schedule">Schedule</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Past Quizzes */}
              <section className="quiz-past-section">
                <div className="quiz-past-header">
                  <span className="material-symbols-outlined">history</span>
                  <h4>Completed Quizzes</h4>
                </div>
                <div className="quiz-past-grid">
                  {completedQuizzes.length === 0 ? (
                    <div className="quiz-past-empty">No completed quizzes yet</div>
                  ) : (
                    completedQuizzes.slice(0, 4).map(quiz => (
                      <div key={quiz.id} className="quiz-history-card">
                        <div className="quiz-history-header">
                          <span className={`quiz-status-badge ${getQuizStatus(quiz)}`}>
                            {getQuizStatus(quiz) === 'completed' ? 'TEACHER REVIEW' : 'ARCHIVED'}
                          </span>
                          <span className="quiz-date">{formatDate(quiz.start_at)}</span>
                        </div>
                        <h6 className="quiz-history-title">{quiz.title}</h6>
                        <p className="quiz-history-avg">Class Avg: {quiz.average_score || 0}%</p>
                        {quiz.google_form_url && (
                          <a
                            href={getGoogleFormEditUrl(quiz)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="quiz-history-google-link"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.96 21.07 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.96 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              />
                            </svg>
                            Edit Form
                          </a>
                        )}
                        <div className="quiz-history-footer">
                          <div className="quiz-avatar-stack">
                            <div className="quiz-avatar"></div>
                            <div className="quiz-avatar"></div>
                            <div className="quiz-avatar-more">+{quiz.total_submissions || 0}</div>
                          </div>
                          <div className="quiz-history-actions">
                            <button
                              className="action-btn"
                              title="View Results"
                              onClick={() => navigate(`/quizzes/${quiz.id}/results`)}
                            >
                              <span className="material-symbols-outlined">analytics</span>
                            </button>
                            <a
                              className="action-btn"
                              title="Edit in Google Forms"
                              href={getGoogleFormEditUrl(quiz) || quiz.google_form_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => {
                                if (!getGoogleFormEditUrl(quiz) && !quiz.google_form_url) {
                                  e.preventDefault();
                                  setError(
                                    'This quiz does not have a linked Google Form editor URL'
                                  );
                                }
                              }}
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </a>
                            {isTeacher && (
                              <button
                                className="action-btn delete"
                                title="Delete Quiz"
                                onClick={() => handleDeleteClick(quiz)}
                                disabled={deletingQuizId === quiz.id}
                              >
                                <span className="material-symbols-outlined">
                                  {deletingQuizId === quiz.id ? 'hourglass_empty' : 'delete'}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* Control Panel (Right Column) */}
            <div className="quiz-control-panel">
              {/* Batch Actions */}
              <div className="quiz-batch-section">
                <h4 className="quiz-batch-title">Batch Actions</h4>
                <div className="quiz-batch-buttons">
                  <button className="quiz-batch-btn">
                    <span className="material-symbols-outlined">download</span>
                    Export All
                  </button>
                  <button className="quiz-batch-btn">
                    <span className="material-symbols-outlined">mail</span>
                    Remind Class
                  </button>
                </div>
              </div>

              {/* Statistics Snapshot */}
              <div className="quiz-progress-section">
                <h4 className="quiz-progress-title">Course Progress</h4>
                <div className="quiz-progress-list">
                  <div>
                    <div className="quiz-progress-header">
                      <span>Curriculum Coverage</span>
                      <span>{curriculumProgress}%</span>
                    </div>
                    <div className="quiz-progress-bar">
                      <div
                        className="quiz-progress-fill"
                        style={{ width: `${curriculumProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="quiz-progress-header">
                      <span>Quiz Completion</span>
                      <span>{quizCompletion}%</span>
                    </div>
                    <div className="quiz-progress-bar">
                      <div
                        className="quiz-progress-fill"
                        style={{ width: `${quizCompletion}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined quiz-progress-icon">trending_up</span>
              </div>

              {/* Quick Insights */}
              <div className="quiz-insight-section">
                <h5 className="quiz-insight-title">Teacher Insight</h5>
                <p className="quiz-insight-text">
                  "Student performance in Dynamic Programming is 12% lower than usual. Consider
                  adding a supplemental practice quiz."
                </p>
                <button className="quiz-insight-btn">
                  GENERATE PRACTICE <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="quiz-footer">
            <div className="quiz-footer-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Contact Support</a>
            </div>
            <p>&copy; 2024 Unified Academic Portal. Designed for Excellence.</p>
          </footer>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && quizToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Quiz</h3>
            <p>Are you sure you want to delete "{quizToDelete.title}"? This cannot be undone.</p>
            <div className="delete-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => deleteQuiz(quizToDelete.id)}
                disabled={deletingQuizId !== null}
              >
                {deletingQuizId === quizToDelete.id ? 'Deleting...' : 'Delete Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Quiz Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="create-quiz-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="create-quiz-header">
              <button className="back-btn" onClick={() => setShowCreateModal(false)}>
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Back to Management</span>
              </button>
              <h2>Create New Quiz</h2>
              <p>Link a Google Form to create and manage your quiz.</p>
            </div>

            {/* Form */}
            <form
              className="create-quiz-form"
              onSubmit={e => {
                e.preventDefault();
                handleCreateQuiz();
              }}
            >
              <div className="create-quiz-grid">
                {/* Google Form Card - Primary */}
                <div className="quiz-google-form-card">
                  <div className="google-form-header">
                    <div className="google-form-icon">
                      <svg viewBox="0 0 24 24" width="24" height="24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.96 21.07 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.96 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3>Google Form Quiz</h3>
                      <p>Link your existing Google Form or create a new one</p>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Google Form URL</label>
                    <input
                      type="url"
                      className="quiz-input"
                      placeholder="https://forms.google.com/forms/u/0/d/e/..."
                      value={newQuiz.google_form_url}
                      onChange={e => setNewQuiz({ ...newQuiz, google_form_url: e.target.value })}
                    />
                    <span className="input-hint">
                      Paste your Google Form link here. Students will take the quiz via Google
                      Forms.
                    </span>
                  </div>
                  <a
                    href="https://forms.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="create-google-form-link"
                  >
                    <span className="material-symbols-outlined">open_in_new</span>
                    Create New Google Form
                  </a>
                </div>

                {/* Quiz Info Card */}
                <div className="quiz-info-card">
                  <h3>Quiz Details</h3>
                  <div className="form-group">
                    <label>Quiz Title</label>
                    <input
                      type="text"
                      className="quiz-input"
                      placeholder="e.g. Chapter 5 Quiz"
                      value={newQuiz.title}
                      onChange={e => setNewQuiz({ ...newQuiz, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <textarea
                      className="quiz-input quiz-textarea"
                      placeholder="Instructions for students..."
                      value={newQuiz.description}
                      onChange={e => setNewQuiz({ ...newQuiz, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Schedule Card */}
                <div className="quiz-schedule-card">
                  <h3>Availability</h3>
                  <div className="schedule-grid">
                    <div className="form-group">
                      <label>Start Date & Time</label>
                      <input
                        type="datetime-local"
                        className="quiz-input"
                        value={newQuiz.start_at}
                        onChange={e => setNewQuiz({ ...newQuiz, start_at: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>End Date & Time</label>
                      <input
                        type="datetime-local"
                        className="quiz-input"
                        value={newQuiz.end_at}
                        onChange={e => setNewQuiz({ ...newQuiz, end_at: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Settings Card */}
                <div className="quiz-settings-card">
                  <h3>Settings</h3>
                  <div className="form-group">
                    <label>Maximum Score</label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        className="quiz-input"
                        value={newQuiz.max_score}
                        onChange={e =>
                          setNewQuiz({ ...newQuiz, max_score: Number(e.target.value) })
                        }
                      />
                      <span>PTS</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Time Limit (Optional)</label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        className="quiz-input"
                        value={newQuiz.time_limit}
                        onChange={e =>
                          setNewQuiz({ ...newQuiz, time_limit: Number(e.target.value) })
                        }
                      />
                      <span>MIN</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="create-quiz-error">
                  <span className="material-symbols-outlined">error</span>
                  {error}
                </div>
              )}

              {/* Action Bar */}
              <div className="create-quiz-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={
                    !newQuiz.title ||
                    !newQuiz.start_at ||
                    !newQuiz.end_at ||
                    !newQuiz.google_form_url ||
                    creating
                  }
                >
                  {creating ? 'Creating...' : 'Create Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
