import { useState } from "react";
import { apiFetch } from "../../services/api";

export default function TeacherAssignments({
  assignments,
  onViewCode,
}: {
  assignments: any[];
  onViewCode?: (submission: any) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const load = async (id: string) => {
    if (!id) {
      setSubmissions([]);
      setSelected(null);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ submissions: any[] }>(
        `/api/assignments/${id}/submissions`
      );
      setSubmissions(data.submissions || []);
      const assn = assignments.find((a: any) => String(a.id) === String(id));
      setSelected(assn);
    } catch {
      setSubmissions([]);
      setSelected(null);
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
              {assignments.map((a: any) => (
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
                  {submissions.map((s: any) => {
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
                                    submission: any;
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
