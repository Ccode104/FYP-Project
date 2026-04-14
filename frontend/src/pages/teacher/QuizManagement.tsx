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
    course_offering_id: courseId ? Number(courseId) : 0,
    start_at: '',
    end_at: '',
    max_score: 100,
    time_limit: 60,
    is_proctored: false,
    allow_suspension_resume: false,
  });
  const [creating, setCreating] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'ta' || user?.role === 'faculty';

  const handleCreateQuiz = async () => {
    if (!newQuiz.title || !newQuiz.start_at || !newQuiz.end_at || !courseId) return;

    setCreating(true);
    try {
      const created = await apiFetch<Quiz>(`/api/quizzes/`, {
        method: 'POST',
        body: {
          course_offering_id: Number(courseId),
          title: newQuiz.title,
          start_at: newQuiz.start_at,
          end_at: newQuiz.end_at,
          max_score: newQuiz.max_score,
          time_limit: newQuiz.time_limit,
          is_proctored: newQuiz.is_proctored,
          allow_suspension_resume: newQuiz.allow_suspension_resume,
        },
      });
      setQuizzes(prev => [...prev, created]);
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
        const courseData = await apiFetch<CourseInfo>(`/api/student/courses/${courseId}`);
        setCourse(courseData);

        const quizzesData = await apiFetch<Quiz[]>(
          `/api/student/courses/${courseId}/quizzes`
        ).catch(() => []);
        setQuizzes(Array.isArray(quizzesData) ? quizzesData : []);
      } catch (err) {
        console.error('Failed to load quizzes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId]);

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
              <span>Create New Quiz</span>
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
                          <div className="quiz-card-icon">
                            <span className="material-symbols-outlined">terminal</span>
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
                          </div>
                        </div>
                        <div className="quiz-card-actions">
                          <button
                            className="action-btn view"
                            title="View Quiz"
                            onClick={() => navigate(`/quizzes/${quiz.id}`)}
                          >
                            <span className="material-symbols-outlined">visibility</span>
                          </button>
                          <button
                            className="action-btn"
                            title="Edit"
                            onClick={() => navigate(`/quizzes/${quiz.id}/grading`)}
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button className="action-btn delete" title="Delete">
                            <span className="material-symbols-outlined">delete</span>
                          </button>
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
                        <div className="quiz-history-footer">
                          <div className="quiz-avatar-stack">
                            <div className="quiz-avatar"></div>
                            <div className="quiz-avatar"></div>
                            <div className="quiz-avatar-more">+{quiz.total_submissions || 0}</div>
                          </div>
                          <div className="quiz-history-actions">
                            <button
                              className="action-btn view"
                              title="View Quiz"
                              onClick={() => navigate(`/quizzes/${quiz.id}`)}
                            >
                              <span className="material-symbols-outlined">visibility</span>
                            </button>
                            <button
                              className="action-btn"
                              title="View Grading"
                              onClick={() => navigate(`/quizzes/${quiz.id}/grading`)}
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button className="action-btn delete" title="Delete">
                              <span className="material-symbols-outlined">delete</span>
                            </button>
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
              <p>Configure your quiz settings and availability for students.</p>
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
                {/* Primary Info Card */}
                <div className="quiz-info-card">
                  <h3>General Information</h3>
                  <div className="form-group">
                    <label>Quiz Title</label>
                    <input
                      type="text"
                      className="quiz-input"
                      placeholder="e.g. Introduction to Quantum Physics Final"
                      value={newQuiz.title}
                      onChange={e => setNewQuiz({ ...newQuiz, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Course Offering ID</label>
                    <select className="quiz-input" value={newQuiz.course_offering_id} disabled>
                      <option value={newQuiz.course_offering_id}>
                        {course?.course_code}: {course?.course_title}
                      </option>
                    </select>
                  </div>
                </div>

                {/* Scoring & Time Card */}
                <div className="quiz-scoring-card">
                  <h3>Evaluation</h3>
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
                    <label>Time Limit</label>
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

                {/* Schedule Card */}
                <div className="quiz-schedule-card">
                  <h3>Availability Schedule</h3>
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

                {/* Integrity & Controls Card */}
                <div className="quiz-integrity-card">
                  <h3>Academic Integrity</h3>
                  <div className="integrity-options">
                    <label className="integrity-toggle">
                      <div className="toggle-content">
                        <div className="toggle-icon proctoring">
                          <span className="material-symbols-outlined">shield</span>
                        </div>
                        <div>
                          <p>Proctoring</p>
                          <span>Enable AI-assisted monitoring</span>
                        </div>
                      </div>
                      <div
                        className={`toggle-switch ${newQuiz.is_proctored ? 'on' : ''}`}
                        onClick={() =>
                          setNewQuiz({ ...newQuiz, is_proctored: !newQuiz.is_proctored })
                        }
                      >
                        <div className="toggle-knob"></div>
                      </div>
                    </label>
                    <label className="integrity-toggle">
                      <div className="toggle-content">
                        <div className="toggle-icon suspension">
                          <span className="material-symbols-outlined">pause_circle</span>
                        </div>
                        <div>
                          <p>Allow Suspension</p>
                          <span>Students can pause and resume</span>
                        </div>
                      </div>
                      <div
                        className={`toggle-switch ${newQuiz.allow_suspension_resume ? 'on' : ''}`}
                        onClick={() =>
                          setNewQuiz({
                            ...newQuiz,
                            allow_suspension_resume: !newQuiz.allow_suspension_resume,
                          })
                        }
                      >
                        <div className="toggle-knob"></div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="create-quiz-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={!newQuiz.title || !newQuiz.start_at || !newQuiz.end_at || creating}
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
