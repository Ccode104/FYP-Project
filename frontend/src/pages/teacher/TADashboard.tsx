import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './TeacherDashboard.css';
import { useEffect, useState } from 'react';
import { getTAAssignments, type GradingTask } from '../../features/ta/api/ta';

function LoadingSkeleton() {
  return (
    <div className="teacher-skeleton-card">
      <div className="teacher-skeleton-image shimmer"></div>
      <div className="teacher-skeleton-content">
        <div className="teacher-skeleton-title shimmer"></div>
        <div className="teacher-skeleton-text shimmer"></div>
        <div className="teacher-skeleton-text shimmer" style={{ width: '60%' }}></div>
      </div>
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
    <div className="teacher-empty-state">
      <div className="teacher-empty-icon">{icon}</div>
      <h4 className="teacher-empty-title">{title}</h4>
      <p className="teacher-empty-description">{description}</p>
    </div>
  );
}

export default function TADashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [gradingTasks, setGradingTasks] = useState<GradingTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        const tasks = await getTAAssignments();
        setGradingTasks(tasks);
      } catch (error) {
        console.error('Failed to load grading tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  return (
    <div className="teacher-dashboard ta-dashboard-simplified">
      {/* Simple Header */}
      <section className="teacher-hero-section" style={{ marginBottom: '32px' }}>
        <div className="teacher-hero-content">
          <div className="teacher-hero-text">
            <span className="teacher-role-badge" style={{ background: '#dcfce7', color: '#16a34a' }}>Evaluation Portal</span>
            <h1 className="teacher-hero-title">
              Hello, {user?.name || 'TA'}
            </h1>
            <p className="teacher-hero-subtitle">You have {gradingTasks.length} assignments allotted for evaluation.</p>
          </div>
        </div>
      </section>

      {/* Task List Section */}
      <section className="teacher-offerings-section">
        <div className="teacher-section-header">
          <h2 className="teacher-section-title">Allotted Tasks</h2>
        </div>
        
        <div className="teacher-offerings-grid">
          {loading ? (
            <>
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
            </>
          ) : gradingTasks.length === 0 ? (
            <div className="teacher-full-width-empty">
              <EmptyState
                icon={
                  <span className="material-symbols-outlined" style={{ fontSize: 48 }}>
                    assignment_turned_in
                  </span>
                }
                title="No tasks allotted"
                description="Your inbox is clear! No evaluation tasks are assigned to you at the moment."
              />
            </div>
          ) : (
            gradingTasks.map(task => (
              <div 
                key={task.id} 
                className="teacher-course-card" 
              >
                <div className="teacher-course-image" style={{ height: '120px' }}>
                  <img
                    src={`https://picsum.photos/seed/task-${task.id}/400/200`}
                    alt={task.title}
                  />
                  <div className="teacher-course-image-overlay">
                    <span className="teacher-course-status">
                      {task.graded_students === task.assigned_students ? 'COMPLETED' : 'PENDING EVALUATION'}
                    </span>
                  </div>
                </div>
                <div className="teacher-course-content">
                  <div className="teacher-course-info">
                    <h3 className="teacher-course-title">
                      {task.course_code}: {task.title}
                    </h3>
                    <p className="teacher-course-meta">
                      {task.course_title}
                    </p>
                  </div>
                  <div className="teacher-course-stats">
                    <div className="teacher-course-stat">
                      <span className="material-symbols-outlined">how_to_reg</span>
                      <span>{task.graded_students} / {task.assigned_students} Evaluated</span>
                    </div>
                  </div>
                  <div className="teacher-course-actions">
                    <button
                      className="teacher-course-btn teacher-course-btn-primary"
                      onClick={() => navigate(`/courses/${task.course_offering_id}/assignments/${task.id}/details`)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
