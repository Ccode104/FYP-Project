import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './AssignmentManagement.css';

interface Assignment {
  id: number;
  title: string;
  description?: string;
  due_at?: string;
  max_score?: number;
  assignment_type?: string;
  allow_github_repo?: boolean;
  allow_multiple_submissions?: boolean;
  attempt_limit?: number;
  course_code?: string;
  course_name?: string;
}

interface Submission {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  submitted_at?: string;
  status: string;
  final_score?: number;
  attempt?: number;
  repo_url?: string;
  repo_name?: string;
}

export default function AssignmentManagement() {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!courseId || !assignmentId) return;
      setLoading(true);
      setError(null);

      try {
        const [assignmentData, submissionsResponse] = await Promise.all([
          apiFetch<Assignment>(`/api/assignments/${assignmentId}`),
          apiFetch<{ submissions: Submission[] }>(
            `/api/assignments/${assignmentId}/submissions`
          ).catch(() => ({ submissions: [] })),
        ]);
        if (!cancelled) {
          setAssignment(assignmentData);
          setSubmissions(submissionsResponse?.submissions || []);
          setEditDescription(assignmentData?.description || '');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load assignment');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, assignmentId]);

  const handleSaveDescription = async () => {
    if (!assignmentId) return;
    try {
      const response = await apiFetch<Assignment>(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        body: JSON.stringify({ description: editDescription }),
      });
      setAssignment(response);
      setEditDescription(response.description || '');
      setEditingDescription(false);
    } catch (err) {
      console.error('Failed to update description:', err);
      alert('Failed to update description');
    }
  };

  if (loading) {
    return (
      <div className="assignment-management">
        <div className="assignment-management-loading">Loading assignment...</div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="assignment-management">
        <div className="assignment-management-error">{error || 'Assignment not found'}</div>
      </div>
    );
  }

  return (
    <div className="assignment-management">
      {/* Header */}
      <div className="assignment-management-header">
        <button
          className="back-button"
          onClick={() => navigate(`/courses/${courseId}/assignments`)}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Assignments
        </button>
      </div>

      {/* Assignment Details Card */}
      <div className="assignment-details-card">
        <div className="assignment-details-header">
          <div>
            <div className="assignment-course-badge">
              <span className="material-symbols-outlined">school</span>
              {assignment.course_code || `Course ${courseId}`}
            </div>
            <h1 className="assignment-title">{assignment.title}</h1>
            <div className="assignment-meta">
              {assignment.due_at && (
                <span className="meta-item">
                  <span className="material-symbols-outlined">event</span>
                  Due: {new Date(assignment.due_at).toLocaleDateString()}
                </span>
              )}
              {assignment.max_score && (
                <span className="meta-item">
                  <span className="material-symbols-outlined">grade</span>
                  Max Score: {assignment.max_score}
                </span>
              )}
              {assignment.attempt_limit && (
                <span className="meta-item">
                  <span className="material-symbols-outlined">replay</span>
                  Attempts: {assignment.attempt_limit}
                </span>
              )}
              <span className="meta-item">
                <span className="material-symbols-outlined">code</span>
                Type: {assignment.assignment_type || 'Standard'}
              </span>
            </div>
          </div>
          <div className="assignment-actions">
            <button className="btn-edit" onClick={() => setEditingDescription(true)}>
              <span className="material-symbols-outlined">edit</span>
              Edit Assignment
            </button>
          </div>
        </div>

        {/* Description Section */}
        <div className="assignment-description-section">
          <h3>Assignment Description</h3>
          {editingDescription ? (
            <div className="description-edit">
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={6}
                placeholder="Enter assignment description..."
              />
              <div className="description-edit-actions">
                <button className="btn-cancel" onClick={() => setEditingDescription(false)}>
                  Cancel
                </button>
                <button className="btn-save" onClick={handleSaveDescription}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="description-display">
              <p>{assignment.description || 'No description provided.'}</p>
              <button className="btn-edit-inline" onClick={() => setEditingDescription(true)}>
                <span className="material-symbols-outlined">edit</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Submissions Spreadsheet */}
      <div className="submissions-section">
        <div className="submissions-header">
          <h2>Submissions</h2>
          <span className="submissions-count">{submissions.length} submissions</span>
        </div>

        <div className="submissions-spreadsheet">
          <table className="spreadsheet-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Email</th>
                <th>Submitted At</th>
                <th>Status</th>
                <th>Attempt</th>
                <th>Marks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-submissions">
                    No submissions yet
                  </td>
                </tr>
              ) : (
                submissions.map(sub => (
                  <tr key={sub.id}>
                    <td className="student-name">{sub.student_name || 'Unknown'}</td>
                    <td className="student-email">{sub.student_email || '-'}</td>
                    <td className="submission-date">
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '-'}
                    </td>
                    <td>
                      <span className={`status-badge status-${sub.status || 'pending'}`}>
                        {sub.status || 'Pending'}
                      </span>
                    </td>
                    <td className="attempt-number">{sub.attempt || 1}</td>
                    <td className="marks">
                      {sub.final_score !== null && sub.final_score !== undefined
                        ? `${sub.final_score}/${assignment.max_score || 100}`
                        : '-'}
                    </td>
                    <td>
                      {assignment.assignment_type === 'github' && sub.repo_url ? (
                        <a
                          href={sub.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-view-github"
                        >
                          <span className="material-symbols-outlined">open_in_new</span>
                          View Repository
                        </a>
                      ) : (
                        <button
                          className="btn-view-submission"
                          onClick={() =>
                            navigate(
                              `/courses/${courseId}/assignments/${assignmentId}/submissions/${sub.id}`
                            )
                          }
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
