import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import './TeacherDashboard.css';

interface Submission {
  id: number;
  submitted_at?: string;
  status: string;
  final_score?: number;
}

export default function TASubmissionsList() {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setLoading(true);
        // Using the same endpoint as AssignmentManagement, but the backend now filters for TAs
        const data = await apiFetch<{ submissions: Submission[] }>(`/api/assignments/${assignmentId}/submissions`);
        setSubmissions(data.submissions || []);
      } catch (err) {
        console.error('Failed to load submissions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [assignmentId]);

  return (
    <div className="teacher-dashboard ta-submissions-page">
      <section className="teacher-hero-section">
        <div className="teacher-hero-content">
          <div className="teacher-hero-text">
            <span className="teacher-role-badge">Evaluation Queue</span>
            <h1 className="teacher-hero-title">Assigned Submissions</h1>
            <p className="teacher-hero-subtitle">Anonymized grading mode active. Student names are hidden to ensure unbiased evaluation.</p>
          </div>
          <div className="teacher-hero-actions">
            <button 
              className="teacher-action-btn"
              onClick={() => navigate(`/courses/${courseId}/assignments/${assignmentId}/details`)}
            >
              <span className="material-symbols-outlined">description</span>
              View Instructions
            </button>
          </div>
        </div>
      </section>

      <section className="teacher-requests-section">
        <div className="teacher-requests-card">
          <div className="teacher-requests-header">
            <h2 className="teacher-requests-title">Submissions to Evaluate</h2>
            <span className="teacher-requests-badge">{submissions.length} Total</span>
          </div>
          
          <div className="teacher-requests-table-container">
            <table className="teacher-requests-table">
              <thead>
                <tr>
                  <th>Submission ID</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th>Current Score</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Loading submissions...</td></tr>
                ) : submissions.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>No submissions allotted to you yet.</td></tr>
                ) : (
                  submissions.map((sub, index) => (
                    <tr key={sub.id}>
                      <td>
                        <div className="teacher-request-user">
                          <div className="teacher-request-avatar">#{index + 1}</div>
                          <span className="teacher-request-name">Submission_{sub.id}</span>
                        </div>
                      </td>
                      <td className="teacher-request-date">
                        {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td>
                        <span className="teacher-request-type" style={{ 
                          background: sub.status === 'graded' ? '#dcfce7' : '#fef3c7',
                          color: sub.status === 'graded' ? '#16a34a' : '#92400e'
                        }}>
                          {sub.status?.toUpperCase() || 'PENDING'}
                        </span>
                      </td>
                      <td className="teacher-request-quiz">
                        {sub.final_score !== null ? `${sub.final_score} pts` : '-'}
                      </td>
                      <td className="teacher-request-actions">
                        <button 
                          className="teacher-course-btn teacher-course-btn-primary"
                          style={{ padding: '8px 16px', fontSize: '11px' }}
                          onClick={() => navigate(`/courses/${courseId}/assignments/${assignmentId}/grading`)}
                        >
                          Evaluate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
