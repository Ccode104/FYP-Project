import { useState } from "react";
import { apiFetch } from "../../services/api";
import { getPlagiarismChecks, runPlagiarismCheck } from "../../services/assignments";

interface Assignment {
  id: string | number;
  title?: string;
  [key: string]: unknown;
}

interface Submission {
  id: string | number;
  student_name?: string;
  submitted_at?: string;
  [key: string]: unknown;
}

interface PlagiarismCheck {
  id: string | number;
  status?: string;
  [key: string]: unknown;
}

export default function TeacherAssignments({
  assignments,
  onViewCode,
}: {
  assignments: Assignment[];
  onViewCode?: (submission: Submission) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [plagiarismChecks, setPlagiarismChecks] = useState<PlagiarismCheck[]>([]);
  const [plagiarismLoading, setPlagiarismLoading] = useState(false);

  const load = async (id: string) => {
    if (!id) {
      setSubmissions([]);
      setSelected(null);
      setPlagiarismChecks([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ submissions: unknown[] }>(
        `/api/assignments/${id}/submissions`
      );
      setSubmissions(data.submissions || []);
      const assn = assignments.find((a: unknown) => String(a.id) === String(id));
      setSelected(assn);

      // Load plagiarism checks for assignments that support it
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

  return (
    <section className="assignments-section">
      <div className="section-header">
        <h2 className="section-title">Assignments</h2>
        <span className="assignment-count">{assignments.length} total</span>
      </div>

      <div className="teacher-assignments-container">
        <div className="assignment-selector-panel">
          <div className="form-group">
            <label htmlFor="assignment-select">Select Assignment</label>
            <select
              id="assignment-select"
              className="form-select"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                void load(e.target.value);
              }}
            >
              <option value="">Choose an assignment...</option>
              {assignments.map((a: unknown) => (
                <option key={a.id} value={a.id}>
                  {a.title}{" "}
                  {a.due_at
                    ? `(Due: ${new Date(a.due_at).toLocaleDateString()})`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="assignment-details-card">
              <h4 className="assignment-details-title">Assignment Details</h4>
              <div className="assignment-detail-item">
                <span className="detail-label">Type:</span>
                <span className="detail-value">
                  {selected.assignment_type || "file"}
                </span>
              </div>
              {selected.release_at && (
                <div className="assignment-detail-item">
                  <span className="detail-label">Release:</span>
                  <span className="detail-value">
                    {new Date(selected.release_at).toLocaleString()}
                  </span>
                </div>
              )}
              {selected.due_at && (
                <div className="assignment-detail-item">
                  <span className="detail-label">Due:</span>
                  <span className="detail-value">
                    {new Date(selected.due_at).toLocaleString()}
                  </span>
                </div>
              )}
              {selected.max_score && (
                <div className="assignment-detail-item">
                  <span className="detail-label">Max Score:</span>
                  <span className="detail-value">{selected.max_score}</span>
                </div>
              )}

              {(selected.assignment_type === 'code' || selected.assignment_type === 'file') && (
                <div className="assignment-detail-item">
                  <span className="detail-label">Plagiarism Checks:</span>
                  <div className="plagiarism-controls">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={async () => {
                        setPlagiarismLoading(true);
                        try {
                          await runPlagiarismCheck(Number(selectedId));
                          // Reload checks
                          const data = await getPlagiarismChecks(Number(selectedId));
                          setPlagiarismChecks(data.checks || []);
                        } catch (error) {
                          console.error('Failed to run plagiarism check:', error);
                          alert('Failed to run plagiarism check');
                        } finally {
                          setPlagiarismLoading(false);
                        }
                      }}
                      disabled={plagiarismLoading}
                    >
                      {plagiarismLoading ? 'Running...' : 'Run Plagiarism Check'}
                    </button>
                    {plagiarismChecks.length > 0 && (
                      <div className="plagiarism-reports">
                        <h5>Recent Checks:</h5>
                        {plagiarismChecks.slice(0, 3).map((check: unknown) => (
                          <div key={check.id} className="plagiarism-check-item">
                            <span>{new Date(check.checked_at).toLocaleString()}</span>
                            <span className={`status-${check.status}`}>{check.status}</span>
                            {check.report_url && (
                              <a href={check.report_url} target="_blank" rel="noopener noreferrer">
                                View Report
                              </a>
                            )}
                            <span>{check.match_count || 0} matches</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="submissions-panel">
          {!selectedId ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>Select an assignment</h3>
              <p>
                Choose an assignment from the dropdown to view student
                submissions and progress.
              </p>
            </div>
          ) : loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No submissions yet</h3>
              <p>
                Students haven't submitted their work for this assignment yet.
              </p>
            </div>
          ) : (
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
                  {submissions.map((s: unknown) => {
                    const status =
                      typeof s.score === "number" ? "graded" : "submitted";
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="student-info">
                            <span className="student-name">
                              {s.student_name || "Student"}
                            </span>
                            {s.student_email && (
                              <span className="student-email">
                                {s.student_email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge status-${status}`}>
                            {status === "graded" ? "✓ Graded" : "⏳ Submitted"}
                          </span>
                        </td>
                        <td>
                          <span className="score-display">
                            {typeof s.score === "number" ? s.score : "-"}
                          </span>
                        </td>
                        <td className="date-cell">
                          {s.submitted_at
                            ? new Date(s.submitted_at).toLocaleString()
                            : "-"}
                        </td>
                        <td>
                          {selected?.assignment_type === "code" &&
                            onViewCode && (
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={async () => {
                                  const detail = await apiFetch<{
                                    submission: unknown;
                                  }>(`/api/submissions/${s.id}`);
                                  onViewCode(detail.submission);
                                }}
                              >
                                View Code
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
