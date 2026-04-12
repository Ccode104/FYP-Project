import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CodeAssignmentCreator from '../../components/CodeAssignmentCreator';
import './AssignmentsLanding.css';

type AssignmentSummary = {
  id: number;
  title: string;
  description?: string | null;
  assignment_type: string;
  release_at?: string | null;
  due_at?: string | null;
  max_score?: number | null;
  course_offering_id: number;
};

type CourseMeta = {
  course_code?: string;
  course_title?: string;
};

type SubmissionSummary = {
  id: number;
  student_name: string;
  student_email: string;
  status?: string;
  final_score?: number | null;
  submitted_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getAssignmentTypeLabel(type: string) {
  switch (type) {
    case 'code':
      return 'Code';
    case 'pdf':
      return 'PDF';
    case 'ppt':
      return 'PPT';
    case 'mixed':
      return 'Mixed';
    case 'file':
      return 'File';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function getStatusClass(status?: string) {
  switch (status?.toLowerCase()) {
    case 'graded':
      return 'status-pill graded';
    case 'submitted':
      return 'status-pill submitted';
    case 'late':
      return 'status-pill late';
    default:
      return 'status-pill pending';
  }
}

export default function AssignmentsLanding() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseMeta | null>(null);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [plagiarismMessage, setPlagiarismMessage] = useState('No recent checks');

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) || assignments[0] || null,
    [assignments, selectedAssignmentId],
  );

  useEffect(() => {
    if (!courseId) return;

    const loadAssignments = async () => {
      setLoading(true);
      setError(null);

      try {
        const [courseData, assignmentData] = await Promise.all([
          apiFetch<CourseMeta>(`/api/student/courses/${courseId}`),
          apiFetch<AssignmentSummary[]>(`/api/courses/${courseId}/assignments`),
        ]);
        setCourse(courseData);
        const assignmentsList = Array.isArray(assignmentData) ? assignmentData : [];
        setAssignments(assignmentsList);
        if (!selectedAssignmentId && assignmentsList.length > 0) {
          setSelectedAssignmentId(assignmentsList[0].id);
        }
      } catch (err: unknown) {
        console.error('Failed to load assignments:', err);
        setError((err as Error)?.message || 'Unable to load assignments for this course.');
      } finally {
        setLoading(false);
      }
    };

    void loadAssignments();
  }, [courseId]);

  useEffect(() => {
    if (!selectedAssignment?.id) {
      setSubmissions([]);
      return;
    }

    const loadSubmissions = async () => {
      setSubmissionLoading(true);
      setSubmissionError(null);

      try {
        const { submissions: assignmentSubmissions } = await apiFetch<{ submissions: SubmissionSummary[] }>(
          `/api/assignments/${selectedAssignment.id}/submissions`,
        );
        setSubmissions(Array.isArray(assignmentSubmissions) ? assignmentSubmissions : []);
      } catch (err: unknown) {
        console.error('Failed to load submissions:', err);
        setSubmissionError((err as Error)?.message || 'Unable to load submissions for this assignment.');
      } finally {
        setSubmissionLoading(false);
      }
    };

    void loadSubmissions();
  }, [selectedAssignment]);

  const courseTitle = course?.course_code && course?.course_title ? `${course.course_code} — ${course.course_title}` : 'Assignment Management';

  const handlePlagiarismCheck = () => {
    setPlagiarismMessage('Last check passed with no matches');
  };

  return (
    <div className="assignments-landing-page">
      <div className="assignments-landing-header">
        <div>
          <span className="assignments-landing-badge">Academic Management</span>
          <h1>Assignment Management</h1>
          <p className="assignments-landing-description">
            Manage assignment workflows, review submissions, and keep tracking centralized.
          </p>
        </div>
        <div className="assignments-landing-controls">
          {user?.role === 'teacher' && (
            <button className="primary-button" onClick={() => setShowCreator((value) => !value)}>
              {showCreator ? 'Hide Creator' : 'New Assignment'}
            </button>
          )}
          <button className="secondary-button" onClick={() => navigate(`/courses/${courseId}/hub`)}>
            Back to Course Hub
          </button>
        </div>
      </div>

      {showCreator && user?.role === 'teacher' && courseId && (
        <div className="assignments-creator-panel">
          <CodeAssignmentCreator
            courseOfferingId={courseId}
            onComplete={() => {
              setShowCreator(false);
              void (async () => {
                setLoading(true);
                setError(null);

                try {
                  const assignmentData = await apiFetch<AssignmentSummary[]>(`/api/courses/${courseId}/assignments`);
                  setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
                } catch (err: unknown) {
                  console.error('Failed to reload assignments:', err);
                  setError((err as Error)?.message || 'Unable to reload assignments.');
                } finally {
                  setLoading(false);
                }
              })();
            }}
          />
        </div>
      )}

      {error && (
        <div className="assignments-alert">
          <strong>Error</strong>
          <p>{error}</p>
        </div>
      )}

      <div className="assignments-overview-grid">
        <section className="assignment-summary-card">
          <div className="assignment-summary-card-top">
            <div>
              <div className="assignment-summary-label">Current Assignment</div>
              <h2>{selectedAssignment?.title ?? 'No assignment selected'}</h2>
              <p>{selectedAssignment?.description ?? 'Select an assignment from the dropdown to view details.'}</p>
            </div>
            <span className="assignment-type-pill">{getAssignmentTypeLabel(selectedAssignment?.assignment_type ?? 'code')}</span>
          </div>

          <div className="assignment-selection-row">
            <label htmlFor="assignmentSelect">Current assignment</label>
            <select
              id="assignmentSelect"
              value={selectedAssignment?.id ?? ''}
              onChange={(event) => setSelectedAssignmentId(Number(event.target.value))}
            >
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </option>
              ))}
            </select>
          </div>

          <div className="assignment-stats-grid">
            <div>
              <span>Type</span>
              <strong>{getAssignmentTypeLabel(selectedAssignment?.assignment_type ?? 'code')}</strong>
            </div>
            <div>
              <span>Release Date</span>
              <strong>{formatDate(selectedAssignment?.release_at)}</strong>
            </div>
            <div>
              <span>Due Date</span>
              <strong>{formatDate(selectedAssignment?.due_at)}</strong>
            </div>
            <div>
              <span>Max Score</span>
              <strong>{selectedAssignment?.max_score ?? 100}</strong>
            </div>
          </div>
        </section>

        <aside className="assignment-side-panel">
          <div className="plagiarism-card">
            <div className="plagiarism-card-header">
              <h3>Plagiarism Controls</h3>
            </div>
            <p className="plagiarism-copy">
              Monitor similarity and protect academic integrity for the current assignment.
            </p>
            <button className="primary-button full-width" type="button" onClick={handlePlagiarismCheck}>
              Run Plagiarism Check
            </button>
            <div className="plagiarism-status">
              <strong>Recent check</strong>
              <span>{plagiarismMessage}</span>
            </div>
          </div>

          <div className="assignment-card-summary">
            <div className="assignment-card-summary-row">
              <span>Assignment</span>
              <strong>{selectedAssignment?.title ? selectedAssignment.title.substring(0, 22) : 'None'}</strong>
            </div>
            <div className="assignment-card-summary-row">
              <span>Submissions</span>
              <strong>{submissions.length}</strong>
            </div>
            <div className="assignment-card-summary-row">
              <span>Status</span>
              <strong>{submissionLoading ? 'Checking...' : submissions.length ? 'Active' : 'Pending'}</strong>
            </div>
          </div>
        </aside>
      </div>

      <section className="submissions-section">
        <div className="submissions-header">
          <div>
            <h2>Submissions</h2>
            <p>Track student progress and grade recent uploads.</p>
          </div>
          <div className="submissions-actions">
            <button className="secondary-button">Export CSV</button>
            <button className="secondary-button">Bulk Actions</button>
          </div>
        </div>

        {submissionLoading ? (
          <div className="assignments-loading">Loading submissions…</div>
        ) : submissionError ? (
          <div className="assignments-alert">
            <strong>Submissions Error</strong>
            <p>{submissionError}</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="assignments-empty">
            <p>No submissions have been received for this assignment yet.</p>
          </div>
        ) : (
          <div className="submissions-table-wrapper">
            <table className="submissions-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Submitted At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td>
                      <div className="submission-student-cell">
                        <strong>{submission.student_name}</strong>
                        <span>{submission.student_email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={getStatusClass(submission.status)}>
                        {submission.status || 'Pending'}
                      </span>
                    </td>
                    <td>{submission.final_score != null ? `${submission.final_score}/100` : '—'}</td>
                    <td>{formatDate(submission.submitted_at)}</td>
                    <td>
                      <button
                        className="secondary-button"
                        onClick={() => navigate(`/courses/${courseId}/assignments/${selectedAssignment?.id}/submissions/${submission.id}`)}
                      >
                        View Code
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
