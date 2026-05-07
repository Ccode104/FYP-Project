import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import './AssignmentDetails.css';

type Assignment = {
  id: number;
  title: string;
  description: string;
  due_at: string;
  assignment_type: string;
  course_code: string;
  is_submitted: boolean;
  submission_status: string | null;
  final_score: number | null;
  submission_id: number | null;
  points?: number;
  allow_github_repo?: boolean;
  assignment_config?: {
    github_requirements?: string;
    questions?: unknown[];
  } | string | null;
};

function isGitHubAssignment(assignment: Assignment) {
  if (assignment.assignment_type === 'github') return true;

  let config = assignment.assignment_config;
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config);
    } catch {
      config = null;
    }
  }

  return Boolean(
    assignment.allow_github_repo &&
      config &&
      typeof config === 'object' &&
      'github_requirements' in config &&
      !('questions' in config && Array.isArray(config.questions) && config.questions.length > 0)
  );
}

export default function AssignmentDetails() {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true);
        const data = await apiFetch<Assignment>(`/api/student/assignments/${assignmentId}/details`);
        setAssignment(data);
      } catch (err) {
        console.error('Failed to fetch assignment details:', err);
        setError(err instanceof Error ? err.message : 'Could not load assignment details.');
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [assignmentId]);

  if (loading) {
    return (
      <div className="assignment-details-page loading">
        <div className="shimmer-card"></div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="assignment-details-page error">
        <div className="error-box">
          <span className="material-symbols-outlined">error</span>
          <h3>Oops! Something went wrong</h3>
          <p>{error || 'Assignment not found.'}</p>
          <button onClick={() => navigate(-1)} className="btn-secondary">Go Back</button>
        </div>
      </div>
    );
  }

  const isPastDue = new Date(assignment.due_at) < new Date() && !assignment.is_submitted;
  const dueDate = new Date(assignment.due_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleStartAction = () => {
    const type = assignment.assignment_type;
    if (assignment.is_submitted && assignment.submission_id) {
        navigate(`/courses/${courseId}/assignments/${assignment.id}/submissions/${assignment.submission_id}`);
        return;
    }

    if (isGitHubAssignment(assignment)) {
      navigate(`/courses/${courseId}/assignments/${assignment.id}/github-submit`);
    } else if (type === 'code') {
      navigate(`/courses/${courseId}/assignments/${assignment.id}/editor`);
    } else if (type === 'mixed') {
      navigate(`/courses/${courseId}/assignments/${assignment.id}/mixed`);
    } else {
      navigate(`/courses/${courseId}/assignments/${assignment.id}/editor`);
    }
  };

  return (
    <div className="assignment-details-page">
      <div className="details-container">
        {/* Navigation Breadcrumb */}
        <nav className="details-breadcrumb">
          <Link to={`/courses/${courseId}/hub`}>Course Hub</Link>
          <span className="separator">/</span>
          <Link to={`/courses/${courseId}/assignments`}>Assignments</Link>
          <span className="separator">/</span>
          <span className="current">Details</span>
        </nav>

        <div className="details-layout">
          {/* Main Content */}
          <main className="details-main">
            <div className="details-header">
              <div className="title-section">
                <div className="type-badge">
                   <span className="material-symbols-outlined">
                    {assignment.assignment_type === 'code' ? 'terminal' : 'description'}
                   </span>
                   {assignment.assignment_type.toUpperCase()}
                </div>
                <h1>{assignment.title}</h1>
                <p className="course-ref">{assignment.course_code} • Assignment {assignment.id}</p>
              </div>
              
              <div className="status-banner">
                {assignment.is_submitted ? (
                  <div className="status-tag success">
                    <span className="material-symbols-outlined">check_circle</span>
                    Submitted
                  </div>
                ) : isPastDue ? (
                  <div className="status-tag danger">
                    <span className="material-symbols-outlined">warning</span>
                    Overdue
                  </div>
                ) : (
                  <div className="status-tag warning">
                    <span className="material-symbols-outlined">schedule</span>
                    Pending
                  </div>
                )}
              </div>
            </div>

            <section className="details-section description">
              <h3>Description</h3>
              <div className="description-content">
                {assignment.description ? (
                  <div dangerouslySetInnerHTML={{ __html: assignment.description.replace(/\n/g, '<br/>') }} />
                ) : (
                  <p className="muted">No detailed description provided for this assignment.</p>
                )}
              </div>
            </section>

            <section className="details-section resources">
              <h3>Supporting Materials</h3>
              <div className="empty-materials">
                <span className="material-symbols-outlined">folder_open</span>
                <p>Check the <Link to={`/courses/${courseId}/hub`}>Course Hub</Link> for related lectures and notes.</p>
              </div>
            </section>
          </main>

          {/* Sidebar Info */}
          <aside className="details-sidebar">
            <div className="sidebar-card info-card">
              <div className="info-item">
                <span className="material-symbols-outlined icon">event</span>
                <div>
                  <label>Due Date</label>
                  <p className={isPastDue ? 'text-danger' : ''}>{dueDate}</p>
                </div>
              </div>
              
              <div className="info-item">
                <span className="material-symbols-outlined icon">grade</span>
                <div>
                  <label>Points Possible</label>
                  <p>{assignment.points || 100} Points</p>
                </div>
              </div>

              {assignment.is_submitted && (
                <div className="info-item">
                  <span className="material-symbols-outlined icon">analytics</span>
                  <div>
                    <label>Current Score</label>
                    <p className="score-value">
                      {assignment.final_score !== null ? `${assignment.final_score}%` : 'Pending Grade'}
                    </p>
                  </div>
                </div>
              )}

              <div className="sidebar-actions">
                <button 
                  className={`btn-primary full-width ${assignment.is_submitted ? 'btn-outline' : ''}`}
                  onClick={handleStartAction}
                >
                  {assignment.is_submitted ? 'View Submission' : 'Start Assignment'}
                </button>
                
                <button 
                   className="btn-cite full-width"
                   onClick={() => navigate(`/courses/${courseId}/discussion`, {
                     state: { prefill: `[Citing: ${assignment.title}](/courses/${courseId}/assignments/${assignment.id})\n\n` }
                   })}
                >
                   <span className="material-symbols-outlined">format_quote</span>
                   Cite and Ask
                </button>
              </div>
            </div>

            <div className="sidebar-card ai-card">
               <div className="ai-header">
                 <span className="material-symbols-outlined">psychology</span>
                 <h4>AI Assistant</h4>
               </div>
               <p>Have questions about this assignment? Ask the bot in the Discussion Forum or use the Sidebar Chat.</p>
               <button 
                 className="ai-link"
                 onClick={() => navigate(`/courses/${courseId}/discussion`, {
                   state: { prefill: `@ai [Citing: ${assignment.title}](/courses/${courseId}/assignments/${assignment.id})\n\n` }
                 })}
                 style={{ border: 'none', width: '100%', textAlign: 'center', cursor: 'pointer' }}
               >
                 Go to Discussion Forum
               </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
