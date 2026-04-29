import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './AssignmentsLanding.css';

type CourseMeta = {
  course_code?: string;
  course_title?: string;
  faculty_name?: string;
};

export default function AssignmentsLanding() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedView, setSelectedView] = useState<'active' | 'completed' | 'archived'>('active');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [stats, setStats] = useState<{ pending: number; completed: number; avgGrade: number }>({
    pending: 0,
    completed: 0,
    avgGrade: 0,
  });
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  const viewLabels = {
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!courseId) return;
      setLoading(true);
      setError(null);

      try {
        const [c, assignmentData, statsData] = await Promise.all([
          apiFetch<CourseMeta>(`/api/student/courses/${courseId}`),
          apiFetch(`/api/student/courses/${courseId}/assignments`),
          apiFetch(`/api/student/courses/${courseId}/stats`).catch(() => ({
            pending: 0,
            completed: 0,
            avgGrade: 0,
          })),
        ]);
        if (!cancelled) {
          setCourse(c);
          setAssignments(assignmentData || []);
          setStats(statsData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assignments');
      } finally {
        setLoading(false);
        setLoadingAssignments(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) {
    return (
      <div className="assignments-page">
        <div className="assignments-content">
          <div className="loading-state text-center py-20">Loading assignments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="assignments-page">
      <div className="assignments-content">
        {error && (
          <div className="error-message">
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        )}

        {/* Page Header */}
        <div className="page-header">
          <div className="page-title">
            <h2>{user?.role === 'student' ? 'Assignment Portfolio' : 'Assignment Management'}</h2>
            <p>{user?.role === 'student' ? 'Track your progress and upcoming deadlines across all enrolled courses.' : 'Manage assignments, track submissions, and evaluate student progress.'}</p>
          </div>
          <div className="view-tabs">
            {(['active', 'completed', 'archived'] as const).map(view => (
              <button
                key={view}
                className={`view-tab ${selectedView === view ? 'active' : ''}`}
                onClick={() => setSelectedView(view)}
              >
                {viewLabels[view] || view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
            {(user?.role === 'teacher' || user?.role === 'ta') && (
              <button
                className="view-tab create-btn"
                onClick={() => navigate(`/courses/${courseId}/assignments/new`)}
                style={{
                  marginLeft: 'auto',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '600'
                }}
              >
                <span className="material-symbols-outlined">add</span>
                Create New
              </button>
            )}
          </div>
        </div>

        {/* Bento Grid Stats - Following HTML design exactly */}
        <div className="assignments-stats">
          <div className="assignments-progress-card">
            <div className="assignments-progress-content">
              <p className="assignments-progress-label">Overall Progress</p>
              <h3 className="assignments-progress-value">84%</h3>
              <div className="assignments-progress-bar">
                <div className="assignments-progress-bar-fill" style={{ width: '84%' }} />
              </div>
              <p className="assignments-progress-text">12 of 14 assignments submitted this term</p>
            </div>
            <span className="material-symbols-outlined assignments-progress-icon">auto_graph</span>
          </div>
          <div className="assignments-stat-card">
            <div className="assignments-stat-icon timer">
              <span className="material-symbols-outlined">timer</span>
            </div>
            <div>
              <h4 className="assignments-stat-value">{stats.pending}</h4>
              <p className="assignments-stat-label">Pending Due Soon</p>
            </div>
          </div>
          <div className="assignments-stat-card">
            <div className="assignments-stat-icon verified">
              <span className="material-symbols-outlined">verified</span>
            </div>
            <div>
              <h4 className="assignments-stat-value">A-</h4>
              <p className="assignments-stat-label">Average Grade</p>
            </div>
          </div>
        </div>

        {/* Filters and Search - Following HTML design exactly */}
        <div className="assignments-filters">
          <div className="assignments-search">
            <span className="material-symbols-outlined">search</span>
            <input
              className="assignments-search-input"
              placeholder="Search by assignment name or professor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="assignments-filter-controls">
            <select className="assignments-filter-select">
              <option>All Types</option>
              <option>Code / Git</option>
              <option>PDF / Essay</option>
            </select>
            <button className="assignments-filter-button">
              <span className="material-symbols-outlined">filter_list</span>
              Sort
            </button>
          </div>
        </div>

        {/* Assignment List - Following HTML design exactly */}
        <div className="assignment-list">
          {/* Dynamic Real Assignments from API */}
          {loadingAssignments ? (
            <div className="assignments-loading">Loading your assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="assignments-empty">
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>No Assignments Yet</h3>
              <p style={{ color: 'var(--muted)', margin: 0 }}>{user?.role === 'student' ? "Your instructor hasn't posted any assignments for this course yet." : "Get started by creating your first assignment for this course."}</p>
              {(user?.role === 'teacher' || user?.role === 'ta') && (
                <button
                  className="create-btn"
                  onClick={() => navigate(`/courses/${courseId}/assignments/new`)}
                  style={{ marginTop: '12px', padding: '12px 28px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span className="material-symbols-outlined">add</span>
                  Create Assignment
                </button>
              )}
            </div>
          ) : (
            assignments.map(assignment => (
              <div key={assignment.id} className="assignments-card">
                <div className="assignments-icon">
                  <span className="material-symbols-outlined text-3xl">
                    {assignment.assignment_type === 'code'
                      ? 'terminal'
                      : assignment.assignment_type === 'pdf'
                        ? 'description'
                        : 'assignment'}
                  </span>
                </div>
                <div className="assignments-content">
                  <div className="assignments-meta">
                    <span
                      className={`assignments-badge ${assignment.is_submitted ? 'completed' : 'pending'}`}
                    >
                      {assignment.is_submitted
                        ? 'Submitted'
                        : 'Due ' + (assignment.due_in_days || 'Soon')}
                    </span>
                    <span className="assignments-course">• {assignment.course_code}</span>
                  </div>
                  <h4 className="assignments-title">{assignment.title}</h4>
                  <p className="assignments-description">
                    {assignment.description || 'No description'}
                  </p>
                </div>
                <div className="assignments-actions">
                  <div className="assignments-deadline">
                    <p className="assignments-deadline-label">Deadline</p>
                    <p className="assignments-deadline-value">
                      {assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'TBD'}
                    </p>
                  </div>
                  <button
                    className="assignments-button"
                    onClick={() => {
                      // For teachers/TAs, navigate to management page
                      if (user?.role === 'teacher' || user?.role === 'ta') {
                        navigate(`/courses/${courseId}/assignments/${assignment.id}/submissions`);
                      } else {
                        // All students go to the details page first
                        navigate(`/courses/${courseId}/assignments/${assignment.id}`);
                      }
                    }}
                  >
                    {user?.role === 'teacher' || user?.role === 'ta'
                      ? 'Manage Assignment'
                      : assignment.is_submitted
                        ? 'View Submission'
                        : 'Submit Now'}
                  </button>
                  <button
                    className="assignments-cite-btn"
                    title="Cite in Discussion"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!courseId) return;
                      navigate(`/courses/${courseId}/discussion`, {
                        state: {
                          prefill: `[Citing: ${assignment.title}](/courses/${courseId}/assignments/${assignment.id})\n\n`,
                        },
                      });
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>format_quote</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Dynamic section for future use if needed, currently empty to remove dummy content */}
      </div>
    </div>
  );
}
