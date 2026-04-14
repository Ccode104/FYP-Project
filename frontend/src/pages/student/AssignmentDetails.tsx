import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourse } from '../../context/CourseContext';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import AssignmentComments from '../../components/AssignmentComments';
import './AssignmentDetails.css';
import '../../components/AssignmentComments.css';

interface Assignment {
  id: number;
  title: string;
  description?: string;
  assignment_type: string;
  total_points?: number;
  max_score?: number;
  due_at?: string;
  release_at?: string;
  allow_multiple_submissions?: boolean;
  created_at?: string;
  course_offering_id: number;
  course_code?: string;
  course_name?: string;
  faculty_name?: string;
  allow_github_repo?: boolean;
}

interface Submission {
  id: number;
  assignment_id: number;
  status?: string;
  attempt?: number;
  submitted_at?: string;
  final_score?: number;
  repo_url?: string;
  repo_name?: string;
  repo_description?: string;
  repo_language?: string;
  repo_stars?: number;
  repo_forks?: number;
}

export default function AssignmentDetails() {
  const { courseId, assignmentId } = useParams();
  const { setAssignmentTitle, setCourseTitle } = useCourse();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingRepo, setSavingRepo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !assignmentId) {
      setError('Invalid course or assignment ID');
      setLoading(false);
      return;
    }

    const loadAssignment = async () => {
      try {
        const assignmentData = await apiFetch<Assignment>(`/api/assignments/${assignmentId}`);
        setAssignment(assignmentData);
        setAssignmentTitle(assignmentData.title);
        if (assignmentData.course_name) {
          setCourseTitle(`${assignmentData.course_code} - ${assignmentData.course_name}`);
        }

        const studentSubmissions = await apiFetch<Submission[]>(`/api/student/courses/${courseId}/submissions`);
        const currentSubmission = studentSubmissions.find((submissionItem) =>
          String(submissionItem.assignment_id) === String(assignmentId)
        );
        setSubmission(currentSubmission || null);
        if (currentSubmission?.repo_url) {
          setRepoUrl(currentSubmission.repo_url);
        }
      } catch (err: unknown) {
        console.error('Failed to load assignment details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load assignment details');
      } finally {
        setLoading(false);
      }
    };

    loadAssignment();
  }, [assignmentId, courseId, setAssignmentTitle, setCourseTitle]);

  useEffect(() => {
    return () => {
      setAssignmentTitle(null);
      setCourseTitle(null);
    };
  }, [setAssignmentTitle, setCourseTitle]);

  const formatDate = (value?: string) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAssignmentTypeDisplay = (type: string) => {
    switch (type) {
      case 'code':
        return 'Code Assignment';
      case 'pdf':
        return 'PDF Submission';
      case 'ppt':
        return 'PPT Submission';
      case 'mixed':
      case 'github':
        return 'GitHub Assignment';
      case 'file':
        return 'File Submission';
      default:
        return 'Assignment';
    }
  };

  const getSubmissionInstructions = (type: string, allowGithubRepo?: boolean) => {
    if (allowGithubRepo || type === 'github') {
      return 'Connect your GitHub repository, then submit the repository URL to complete this assignment.';
    }
    switch (type) {
      case 'code':
        return 'Use the built-in code editor to author your solution and submit your final code through the assignment workflow.';
      case 'pdf':
        return 'Upload your PDF file to a cloud drive and submit the shareable URL here.';
      case 'ppt':
        return 'Upload your presentation file to a cloud drive and submit the shareable URL here.';
      case 'mixed':
        return 'Create a GitHub repository with your project files, then submit the repository URL.';
      case 'file':
        return 'Upload your file to a cloud drive and submit the shareable URL here.';
      default:
        return 'Submit your assignment using the instructions provided by your instructor.';
    }
  };

  const statusLabel = submission
    ? submission.status?.replace(/_/g, ' ') || 'Submitted'
    : 'Not submitted';

  const statusColor = submission
    ? submission.status === 'graded'
      ? 'status-graded'
      : submission.status === 'late'
        ? 'status-late'
        : 'status-submitted'
    : 'status-pending';

  const progressPercent = submission ? 100 : 20;

  const canOpenEditor = assignment?.assignment_type === 'code';
  const isGithubAssignment = assignment?.assignment_type === 'github' || assignment?.allow_github_repo;

  const handleSaveRepo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignment?.id || !repoUrl.trim()) return;

    setSavingRepo(true);
    try {
      await apiFetch('/api/submissions/submit/github-repo', {
        method: 'POST',
        body: { assignment_id: assignment.id, repo_url: repoUrl.trim() },
      });
      setSubmission((prev) => ({
        ...(prev ?? {
          id: 0,
          assignment_id: assignment.id,
        }),
        repo_url: repoUrl.trim(),
      } as Submission));
    } catch (err: unknown) {
      console.error('Failed to submit GitHub repository:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit GitHub repository');
    } finally {
      setSavingRepo(false);
    }
  };

  if (loading) {
    return (
      <div className="assignment-details-page">
        <div className="assignment-details-container">
          <div className="loading-card">Loading assignment details...</div>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="assignment-details-page">
        <div className="assignment-details-container">
          <div className="error-card">
            <h2>Error</h2>
            <p>{error || 'Assignment not found'}</p>
            <button className="btn btn-primary" onClick={() => navigate(`/courses/${courseId}`)}>
              Back to Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="assignment-details-page">
      <div className="assignment-details-container">
        <div className="assignment-hero">
          <div className="hero-copy">
            <div className="hero-badge">In Progress</div>
            <div className="hero-meta">
              {assignment.course_code} • {assignment.course_name} • {getAssignmentTypeDisplay(assignment.assignment_type)}
            </div>
            <h1>{assignment.title}</h1>
            <p>{assignment.description || 'No description was provided for this assignment.'}</p>
            <p className="hero-note">{getSubmissionInstructions(assignment.assignment_type, assignment.allow_github_repo)}</p>
          </div>
          <div className="hero-actions">
            {canOpenEditor && (
              <button
                className="hero-button primary"
                onClick={() => navigate(`/courses/${courseId}/assignments/${assignmentId}/editor`)}
              >
                <span className="material-symbols-outlined">terminal</span>
                Open in Code Editor
              </button>
            )}
            <button className="hero-button secondary" onClick={() => navigate(`/courses/${courseId}`)}>
              Back to Assignments
            </button>
          </div>
        </div>

        <div className="assignment-grid">
          <section className="assignment-main">
            <div className="stats-grid">
              <div className="stat-card repo-card">
                <div className="stat-card-header">
                  <div>
                    <p className="stat-label">GitHub Repository</p>
                    <h3>Repository Link</h3>
                  </div>
                  {submission?.repo_url && (
                    <a className="stat-link" href={submission.repo_url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  )}
                </div>
                <p className="stat-copy">
                  {submission?.repo_url
                    ? 'Your submitted repository is available for review and grading.'
                    : 'Submit a GitHub repository URL for this assignment to share your project.'}
                </p>
                {submission?.repo_url ? (
                  <div className="repo-details">
                    <a className="repo-url" href={submission.repo_url} target="_blank" rel="noreferrer">
                      {submission.repo_url}
                    </a>
                    {submission.repo_language && <span>{submission.repo_language}</span>}
                    <div className="repo-stats">
                      {typeof submission.repo_stars === 'number' && <span>⭐ {submission.repo_stars}</span>}
                      {typeof submission.repo_forks === 'number' && <span>🍴 {submission.repo_forks}</span>}
                    </div>
                  </div>
                ) : isGithubAssignment ? (
                  <form className="repo-form" onSubmit={handleSaveRepo}>
                    <input
                      type="url"
                      className="repo-input"
                      placeholder="https://github.com/owner/repo"
                      value={repoUrl}
                      onChange={(event) => setRepoUrl(event.target.value)}
                      required
                    />
                    <button type="submit" className="repo-submit-button" disabled={savingRepo}>
                      {savingRepo ? 'Saving...' : 'Submit Repository'}
                    </button>
                  </form>
                ) : (
                  <p className="stat-copy">This assignment does not require a GitHub repository submission.</p>
                )}
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <div>
                    <p className="stat-label">Submission Stats</p>
                    <h3>{assignment.allow_github_repo || assignment.assignment_type === 'github' ? 'GitHub Workflow' : 'Progress Overview'}</h3>
                  </div>
                </div>
                <div className="stat-grid-mini">
                  <div>
                    <span className="mini-label">Due Date</span>
                    <p>{assignment.due_at ? formatDate(assignment.due_at) : 'TBA'}</p>
                  </div>
                  <div>
                    <span className="mini-label">Weight</span>
                    <p>{assignment.total_points || assignment.max_score || 100} pts</p>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="progress-copy">
                  {submission ? 'Assignment submitted.' : 'Not submitted yet.'}
                </div>
              </div>
            </div>

            <div className="activity-card">
              <div className="activity-header">
                <div>
                  <p className="stat-label">Repository Activity</p>
                  <h3>Submission Overview</h3>
                </div>
                <span className={`status-pill ${statusColor}`}>{statusLabel}</span>
              </div>

              {submission ? (
                <div className="activity-items">
                  <div className="activity-item">
                    <span className="activity-title">Latest submission</span>
                    <span className="activity-time">{formatDate(submission.submitted_at)}</span>
                  </div>
                  <div className="activity-item">
                    <span className="activity-title">Attempt</span>
                    <span className="activity-time">#{submission.attempt ?? 1}</span>
                  </div>
                  <div className="activity-item">
                    <span className="activity-title">Score</span>
                    <span className="activity-time">
                      {submission.final_score !== undefined && submission.final_score !== null
                        ? `${submission.final_score} / ${assignment.total_points || assignment.max_score || 100}`
                        : 'Pending'}
                    </span>
                  </div>
                  {submission.repo_url && (
                    <div className="activity-item">
                      <span className="activity-title">Repository</span>
                      <a className="activity-link" href={submission.repo_url} target="_blank" rel="noreferrer">
                        View repo
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="activity-copy">
                  No repository submission has been recorded yet. Use the form above to submit your GitHub repo or open the code editor if this is a code assignment.
                </div>
              )}
            </div>
          </section>

          <aside className="assignment-sidebar">
            <div className="discussion-card">
              <div className="discussion-header">
                <div>
                  <p className="stat-label">Assignment Q&A</p>
                  <h3>Help & Support</h3>
                </div>
              </div>
              <AssignmentComments assignmentId={assignment.id} />
            </div>

            <div className="peer-review-card">
              <div className="peer-header">
                <div className="peer-icon">📚</div>
                <div>
                  <h3>Peer Reviews</h3>
                  <p className="peer-copy">Your submission will be shared with assigned peers for review once it is received.</p>
                </div>
              </div>
              <p className="peer-note">
                Completing your first repository submission unlocks reviewer assignments and live feedback.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
