import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import "./TeacherDashboard.css";
import { useEffect, useState } from "react";
import { getTADashboardData } from "../../features/ta/api/ta";
import type { TADashboardData } from "../../features/ta/api/ta";
import TAAgentChat from "../../components/TAAgentChat";

function LoadingSkeleton() {
  return (
    <div className="card skeleton-card shimmer">
      <div className="skeleton-title shimmer" />
      <div className="skeleton-line shimmer" />
      <div className="skeleton-line shimmer" />
      <div className="skeleton-line shimmer" />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h4 className="empty-state-title h4">{title}</h4>
      <p className="empty-state-description text-base leading-relaxed">
        {description}
      </p>
    </div>
  );
}

interface PendingItem {
  id: number;
  title: string;
  course_code: string;
  course_title: string;
  ungraded_count?: number;
  total_submissions?: number;
  total_attempts?: number;
  ungraded_attempts?: number;
  pending_participants?: number;
  total_participants?: number;
  due_date?: string;
  end_time?: string;
  scheduled_at?: string;
}

interface Course {
  id: number;
  course_code: string;
  course_title: string;
  term: string;
  section?: string;
  role: string;
}

export default function TADashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<TADashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAgentChat, setShowAgentChat] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | undefined>();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getTADashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPendingTasks =
    (dashboardData?.pendingAssignments.length || 0) +
    (dashboardData?.pendingQuizzes.length || 0) +
    (dashboardData?.pendingViva.length || 0);

  return (
    <div className="container container-wide dashboard-page ta-theme">
          <div className="dashboard-header">
            <div className="welcome-section">
              <h1 className="dashboard-title h2 text-primary">
                Welcome back, {user?.name}!
              </h1>
              <p className="dashboard-subtitle text-lg text-secondary leading-relaxed">
                Manage your TA duties and grade student work
              </p>
            </div>
            <div className="dashboard-actions">
              <button className="btn btn-secondary" onClick={() => navigate('/profile')}>
                👤 Profile
              </button>
              <button className="btn btn-outline" onClick={() => navigate('/planner/ta')}>Planner</button>
              <button className="btn btn-outline" onClick={() => navigate('/staff/review-queue')}>Review queue</button>
              <button className="btn btn-primary" onClick={() => setShowAgentChat(true)}>
                🤖 AI Assistant
              </button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="section-container">
            <div className="section-header">
              <h3 className="section-title h3">Your Impact</h3>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📝</div>
                <div className="stat-content">
                  <div className="stat-value">{dashboardData?.stats.total_graded_assignments || 0}</div>
                  <div className="stat-label">Assignments Graded</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-value">{dashboardData?.stats.total_graded_quizzes || 0}</div>
                  <div className="stat-label">Quizzes Graded</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎤</div>
                <div className="stat-content">
                  <div className="stat-value">{dashboardData?.stats.total_graded_viva || 0}</div>
                  <div className="stat-label">Viva Graded</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-value">
                    {(dashboardData?.stats.students_helped_assignments || 0) +
                      (dashboardData?.stats.students_helped_quizzes || 0) +
                      (dashboardData?.stats.students_helped_viva || 0)}
                  </div>
                  <div className="stat-label">Students Helped</div>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Tasks */}
          <div className="section-container">
            <div className="section-header">
              <h3 className="section-title h3">Pending Tasks</h3>
              <span className="courses-count text-sm font-medium text-secondary">
                {totalPendingTasks} pending
              </span>
            </div>

            <div className="tasks-grid">
              {/* Pending Assignments */}
              <div className="card list-card">
                <div className="card-header-mini">
                  <h4 className="card-subtitle">Assignments to Grade</h4>
                  <span className="badge">{dashboardData?.pendingAssignments.length || 0}</span>
                </div>
                {loading ? (
                  <LoadingSkeleton />
                ) : dashboardData?.pendingAssignments.length === 0 ? (
                  <EmptyState
                    icon={<span>📝</span>}
                    title="No assignments pending"
                    description="All assignments have been graded"
                  />
                ) : (
                  <ul className="list list-modern">
                    {dashboardData?.pendingAssignments.map((assignment: PendingItem) => (
                      <li
                        key={assignment.id}
                        className="list-item"
                      >
                        <div className="list-item-content">
                          <span className="list-item-title">{assignment.title}</span>
                          <span className="list-item-subtitle">
                            {assignment.course_code} — {assignment.ungraded_count}/{assignment.total_submissions} ungraded
                          </span>
                        </div>
                        <div className="list-item-meta">
                          Due: {new Date(assignment.due_date!).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => navigate(`/courses/${assignment.id}`, { state: { courseTitle: assignment.course_title } })}
                          >
                            Manage Course
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssignmentId(assignment.id);
                              setShowAgentChat(true);
                            }}
                          >
                            🤖 Ask AI
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Pending Quizzes */}
              <div className="card list-card">
                <div className="card-header-mini">
                  <h4 className="card-subtitle">Quizzes to Grade</h4>
                  <span className="badge">{dashboardData?.pendingQuizzes.length || 0}</span>
                </div>
                {loading ? (
                  <LoadingSkeleton />
                ) : dashboardData?.pendingQuizzes.length === 0 ? (
                  <EmptyState
                    icon={<span>📊</span>}
                    title="No quizzes pending"
                    description="All quizzes have been graded"
                  />
                ) : (
                  <ul className="list list-modern">
                    {dashboardData?.pendingQuizzes.map((quiz: PendingItem) => (
                      <li
                        key={quiz.id}
                        className="list-item list-item-clickable"
                        onClick={() => navigate(`/quizzes/${quiz.id}/results`)}
                      >
                        <div className="list-item-content">
                          <span className="list-item-title">{quiz.title}</span>
                          <span className="list-item-subtitle">
                            {quiz.course_code} — {quiz.ungraded_attempts}/{quiz.total_attempts} ungraded
                          </span>
                        </div>
                        <div className="list-item-meta">
                          Ended: {new Date(quiz.end_time!).toLocaleDateString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Pending Viva */}
              <div className="card list-card">
                <div className="card-header-mini">
                  <h4 className="card-subtitle">Upcoming Viva Sessions</h4>
                  <span className="badge">{dashboardData?.pendingViva.length || 0}</span>
                </div>
                {loading ? (
                  <LoadingSkeleton />
                ) : dashboardData?.pendingViva.length === 0 ? (
                  <EmptyState
                    icon={<span>🎤</span>}
                    title="No viva sessions"
                    description="No upcoming viva sessions scheduled"
                  />
                ) : (
                  <ul className="list list-modern">
                    {dashboardData?.pendingViva.map((viva: PendingItem) => (
                      <li
                        key={viva.id}
                        className="list-item list-item-clickable"
                        onClick={() => navigate(`/viva/${viva.id}`)}
                      >
                        <div className="list-item-content">
                          <span className="list-item-title">{viva.title}</span>
                          <span className="list-item-subtitle">
                            {viva.course_code} — {viva.pending_participants}/{viva.total_participants} pending
                          </span>
                        </div>
                        <div className="list-item-meta">
                          Scheduled: {new Date(viva.scheduled_at!).toLocaleString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Courses Assisted */}
          <div className="section-container">
            <div className="section-header">
              <h3 className="section-title h3">Courses Assisted</h3>
              <span className="courses-count text-sm font-medium text-secondary">
                {dashboardData?.courses.length || 0} courses
              </span>
            </div>

            <div className="card list-card">
              {loading ? (
                <LoadingSkeleton />
              ) : dashboardData?.courses.length === 0 ? (
                <EmptyState
                  icon={<span>📚</span>}
                  title="No courses assigned"
                  description="You haven't been assigned to any courses yet"
                />
              ) : (
                <ul className="list list-modern">
                  {dashboardData?.courses.map((course: Course) => (
                    <li
                      key={course.id}
                      className="list-item list-item-clickable"
                      onClick={() => navigate(`/courses/${course.id}/hub`, { state: { courseTitle: course.course_title } })}
                    >
                      <div className="list-item-content">
                        <span className="list-item-title">
                          {course.course_code} — {course.course_title}
                        </span>
                        <span className="list-item-subtitle">
                          {course.term} {course.section ? `Section ${course.section}` : ''} • Role: {course.role}
                        </span>
                      </div>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/courses/${course.id}/hub`, { state: { courseTitle: course.course_title } });
                        }}
                      >
                        Manage
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* TA Agent Chat */}
          {showAgentChat && (
            <TAAgentChat
              assignmentId={selectedAssignmentId}
              onClose={() => setShowAgentChat(false)}
            />
          )}
    </div>
  );
}

