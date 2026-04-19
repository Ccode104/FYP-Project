import { useEffect, useState, useCallback } from 'react';
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
  google_sheet_id?: string;
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

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    due_at: '',
    max_score: 100,
  });

  const [googleConnected, setGoogleConnected] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);

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

  useEffect(() => {
    async function checkGoogleConnection() {
      try {
        const data = await apiFetch<{ connected: boolean }>('/api/google/status');
        setGoogleConnected(data.connected);
      } catch {
        setGoogleConnected(false);
      }
    }
    checkGoogleConnection();
  }, []);

  const handleSaveEdit = async () => {
    if (!assignmentId) return;
    try {
      const updated = await apiFetch<Assignment>(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          due_at: editForm.due_at || null,
          max_score: editForm.max_score,
        }),
      });
      setAssignment(updated);
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update assignment:', err);
      alert('Failed to update assignment');
    }
  };

  const handleDelete = async () => {
    if (!assignmentId) return;
    if (
      !window.confirm(
        'Are you sure you want to delete this assignment? This action cannot be undone.'
      )
    )
      return;
    try {
      await apiFetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      navigate(`/courses/${courseId}/assignments`);
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      alert('Failed to delete assignment');
    }
  };

  const handleOpenSheet = useCallback(async () => {
    if (!assignment || !assignmentId) return;
    setSheetLoading(true);
    try {
      const response = await apiFetch<{ url: string }>(
        `/api/assignments/${assignmentId}/grading-sheet`,
        {
          method: 'POST',
        }
      );
      if (response.url) {
        window.open(response.url, '_blank');
      } else {
        alert('Failed to generate grading sheet');
      }
    } catch (err) {
      console.error('Failed to open grading sheet:', err);
      alert('Failed to open grading sheet');
    } finally {
      setSheetLoading(false);
    }
  }, [assignment, assignmentId]);

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
            <button
              className="btn btn-secondary"
              onClick={() => {
                setEditForm({
                  title: assignment.title,
                  description: assignment.description || '',
                  due_at: assignment.due_at
                    ? new Date(assignment.due_at).toISOString().slice(0, 16)
                    : '',
                  max_score: assignment.max_score || 100,
                });
                setShowEditModal(true);
              }}
            >
              <span className="material-symbols-outlined">edit</span>
              Edit Assignment
            </button>
            <button className="btn btn-danger" onClick={handleDelete} style={{ marginLeft: '8px' }}>
              <span className="material-symbols-outlined">delete</span>
              Delete
            </button>
            <button
              className="btn btn-outline"
              onClick={handleOpenSheet}
              style={{ marginLeft: '8px' }}
            >
              <span className="material-symbols-outlined">table_chart</span>
              Grading Sheet
            </button>
          </div>
        </div>

        {/* Description Section */}
        <div className="assignment-description-section">
          <h3>Assignment Description</h3>
          <div className="description-display">
            <p>{assignment.description || 'No description provided.'}</p>
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: 'var(--bg-primary)',
                padding: '24px',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '500px',
              }}
            >
              <h2 style={{ marginBottom: '16px' }}>Edit Assignment</h2>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                  Title
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={editForm.due_at}
                  onChange={e => setEditForm({ ...editForm, due_at: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                  Max Score
                </label>
                <input
                  type="number"
                  value={editForm.max_score}
                  onChange={e => setEditForm({ ...editForm, max_score: Number(e.target.value) })}
                  min={0}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button className="btn" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSaveEdit}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
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
