import { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import {
  getPlagiarismChecks,
  runPlagiarismCheck,
} from '../../features/assignments/api/assignments';

interface Assignment {
  id: string | number;
  title?: string;
  assignment_type?: string;
  release_at?: string;
  due_at?: string;
  max_score?: number;
  description?: string;
  [key: string]: unknown;
}

interface Submission {
  id: string | number;
  student_name?: string;
  student_email?: string;
  score?: number | null;
  submitted_at?: string;
  is_late?: boolean;
  [key: string]: unknown;
}

interface PlagiarismCheck {
  id: string | number;
  checked_at?: string;
  status?: string;
  match_count?: number;
  report_url?: string;
}

export default function TeacherAssignments({
  assignments,
  onViewCode,
}: {
  assignments: Assignment[];
  onViewCode?: (submission: Submission) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [plagiarismChecks, setPlagiarismChecks] = useState<PlagiarismCheck[]>([]);
  const [plagiarismLoading, setPlagiarismLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const submissionsPerPage = 10;

  const load = async (id: string) => {
    if (!id) {
      setSubmissions([]);
      setSelected(null);
      setPlagiarismChecks([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ submissions: unknown[] }>(`/api/assignments/${id}/submissions`);
      const submissionsData = (data.submissions || []).map((s: unknown) => {
        const submission = s as Submission;
        return {
          ...submission,
          is_late:
            submission.submitted_at && selected?.due_at
              ? new Date(submission.submitted_at) > new Date(selected.due_at)
              : false,
        };
      });
      setSubmissions(submissionsData);
      const assn = assignments.find((a: unknown) => String(a.id) === String(id)) as Assignment;
      setSelected(assn);

      if (assn?.assignment_type === 'code' || assn?.assignment_type === 'file') {
        try {
          const plagiarismData = await getPlagiarismChecks(Number(id));
          setPlagiarismChecks(plagiarismData.checks || []);
        } catch (error) {
          console.error('Failed to load plagiarism checks:', error);
          setPlagiarismChecks([]);
        }
      } else {
        setPlagiarismChecks([]);
      }
    } catch {
      setSubmissions([]);
      setSelected(null);
      setPlagiarismChecks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assignments.length > 0 && !selectedId) {
      setSelectedId(String(assignments[0].id));
      void load(String(assignments[0].id));
    }
  }, [assignments]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (submission: Submission) => {
    if (submission.score !== null && submission.score !== undefined) {
      return <span className="assignment-status-badge status-graded">Graded</span>;
    }
    if (submission.is_late) {
      return <span className="assignment-status-badge status-late">Late</span>;
    }
    return <span className="assignment-status-badge status-submitted">Submitted</span>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = ['primary', 'secondary', 'tertiary', 'surface-dim'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const indexOfLastSubmission = currentPage * submissionsPerPage;
  const indexOfFirstSubmission = indexOfLastSubmission - submissionsPerPage;
  const currentSubmissions = submissions.slice(indexOfFirstSubmission, indexOfLastSubmission);
  const totalPages = Math.ceil(submissions.length / submissionsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="assignment-management">
      {/* Page Header */}
      <div className="assignment-page-header">
        <div className="assignment-page-header-text">
          <span className="assignment-role-badge">Academic Management</span>
          <h1 className="assignment-page-title">Assignment Management</h1>
        </div>
        <div className="assignment-selector-wrapper">
          <label className="assignment-selector-label">Current Assignment</label>
          <div className="assignment-selector-container">
            <select
              className="assignment-selector"
              value={selectedId}
              onChange={e => {
                setSelectedId(e.target.value);
                setCurrentPage(1);
                void load(e.target.value);
              }}
            >
              {assignments.map((a: unknown) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                  {a.due_at ? ` - Due: ${new Date(a.due_at).toLocaleDateString()}` : ''}
                </option>
              ))}
            </select>
            <span className="assignment-selector-icon material-symbols-outlined">expand_more</span>
          </div>
        </div>
      </div>

      {/* Bento Layout */}
      <div className="assignment-bento-grid">
        {/* Assignment Details Card */}
        <div className="assignment-details-card-new">
          <div className="assignment-details-header">
            <div className="assignment-details-info">
              <h3 className="assignment-details-title">
                {selected?.title || 'Select an assignment'}
              </h3>
              <p className="assignment-details-description">
                {selected?.description || 'Choose an assignment to view details'}
              </p>
            </div>
            {selected?.assignment_type && (
              <span className="assignment-type-badge">
                {selected.assignment_type.toUpperCase()}
              </span>
            )}
          </div>
          <div className="assignment-details-grid">
            <div className="assignment-detail-item">
              <span className="assignment-detail-label">Type</span>
              <span className="assignment-detail-value">{selected?.assignment_type || 'File'}</span>
            </div>
            <div className="assignment-detail-item">
              <span className="assignment-detail-label">Release Date</span>
              <span className="assignment-detail-value">{formatDate(selected?.release_at)}</span>
            </div>
            <div className="assignment-detail-item">
              <span className="assignment-detail-label">Due Date</span>
              <span className="assignment-detail-value assignment-due-date">
                {formatDate(selected?.due_at)}
              </span>
            </div>
            <div className="assignment-detail-item">
              <span className="assignment-detail-label">Max Score</span>
              <span className="assignment-detail-value">{selected?.max_score || 100}</span>
            </div>
          </div>
        </div>

        {/* Plagiarism Controls */}
        <div className="plagiarism-card">
          <h3 className="plagiarism-card-title">Plagiarism Controls</h3>
          <button
            className="plagiarism-run-btn"
            onClick={async () => {
              setPlagiarismLoading(true);
              try {
                await runPlagiarismCheck(Number(selectedId));
                const data = await getPlagiarismChecks(Number(selectedId));
                setPlagiarismChecks(data.checks || []);
              } catch (error) {
                console.error('Failed to run plagiarism check:', error);
                alert('Failed to run plagiarism check');
              } finally {
                setPlagiarismLoading(false);
              }
            }}
            disabled={plagiarismLoading || !selectedId}
          >
            <span className="material-symbols-outlined">shield</span>
            {plagiarismLoading ? 'Running...' : 'Run Plagiarism Check'}
          </button>
          <div className="plagiarism-recent">
            <h4 className="plagiarism-recent-title">Recent Checks</h4>
            {plagiarismChecks.length === 0 ? (
              <div className="plagiarism-empty">
                <span className="plagiarism-empty-text">No checks run yet</span>
              </div>
            ) : (
              <div className="plagiarism-checks-list">
                {plagiarismChecks.slice(0, 3).map((check: unknown) => (
                  <div key={check.id} className="plagiarism-check-item">
                    <div className="plagiarism-check-info">
                      <span
                        className={`material-symbols-outlined plagiarism-check-icon ${check.match_count > 0 ? 'warning' : 'success'}`}
                      >
                        {check.match_count > 0 ? 'warning' : 'check_circle'}
                      </span>
                      <span className="plagiarism-check-date">
                        {check.checked_at
                          ? new Date(check.checked_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Unknown'}
                      </span>
                    </div>
                    <span
                      className={`plagiarism-check-status ${check.match_count > 0 ? 'has-matches' : 'no-matches'}`}
                    >
                      {check.match_count > 0 ? `${check.match_count} Suspects` : 'No Matches'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="submissions-card">
        <div className="submissions-header">
          <h3 className="submissions-title">Submissions</h3>
          <div className="submissions-actions">
            <button className="submissions-action-btn">Export CSV</button>
            <button className="submissions-action-btn">Bulk Actions</button>
          </div>
        </div>
        <div className="submissions-table-container">
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="submissions-loading">
                    Loading submissions...
                  </td>
                </tr>
              ) : currentSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="submissions-empty">
                    No submissions yet
                  </td>
                </tr>
              ) : (
                currentSubmissions.map((s: unknown) => {
                  const submission = s as Submission;
                  return (
                    <tr key={submission.id}>
                      <td>
                        <div className="student-info">
                          <div
                            className={`student-avatar ${getAvatarColor(submission.student_name || '')}`}
                          >
                            {getInitials(submission.student_name || 'S')}
                          </div>
                          <div className="student-details">
                            <span className="student-name">
                              {submission.student_name || 'Student'}
                            </span>
                            <span className="student-email">{submission.student_email || ''}</span>
                          </div>
                        </div>
                      </td>
                      <td>{getStatusBadge(submission)}</td>
                      <td>
                        <div className="score-display">
                          {submission.score !== null && submission.score !== undefined ? (
                            <>
                              <span className="score-value">{submission.score}</span>
                              <span className="score-max">/{selected?.max_score || 100}</span>
                            </>
                          ) : (
                            <span className="score-none">—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className={`submission-date ${submission.is_late ? 'late' : ''}`}>
                          {submission.submitted_at
                            ? new Date(submission.submitted_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </div>
                      </td>
                      <td className="action-cell">
                        {selected?.assignment_type === 'code' && onViewCode ? (
                          <button
                            className="action-view-btn"
                            onClick={async () => {
                              const detail = await apiFetch<{ submission: unknown }>(
                                `/api/submissions/${submission.id}`
                              );
                              onViewCode(detail.submission as Submission);
                            }}
                          >
                            View Code
                          </button>
                        ) : (
                          <button className="action-grade-btn">Grade Now</button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {submissions.length > submissionsPerPage && (
          <div className="submissions-pagination">
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
