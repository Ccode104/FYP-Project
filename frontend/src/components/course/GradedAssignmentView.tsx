import { useState, useEffect } from 'react';
import { getGradedAssignment, submitRegradeRequest } from '../../services/student';
import './GradedAssignmentView.css';

interface RubricGrade {
  id: number;
  criterion_title: string;
  score: number;
  feedback: string;
}

interface RegradeRequest {
  id: number;
  criterion_id: number | null;
  reason: string;
  status: string;
  requested_at: string;
}

interface GradedAssignment {
  submission: {
    id: number;
    assignment_title: string;
    description: string;
    submitted_at: string;
    final_score: number;
    comments: string;
    grader_name: string;
  };
  rubricGrades: RubricGrade[];
  regradeRequests: RegradeRequest[];
}

interface Props {
  assignmentId: number;
  onClose: () => void;
}

export default function GradedAssignmentView({ assignmentId, onClose }: Props) {
  const [data, setData] = useState<GradedAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [regradeReason, setRegradeReason] = useState('');
  const [selectedCriterion, setSelectedCriterion] = useState<number | null>(null);
  const [showRegradeForm, setShowRegradeForm] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadGradedAssignment();
  }, [assignmentId]);

  const loadGradedAssignment = async () => {
    try {
      const result = await getGradedAssignment(assignmentId);
      setData(result);
    } catch (error) {
      console.error('Failed to load graded assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitRegrade = async () => {
    if (!data || !regradeReason.trim()) return;

    setSubmitStatus('submitting');
    try {
      await submitRegradeRequest({
        submissionId: data.submission.id,
        criterionId: selectedCriterion || undefined,
        reason: regradeReason.trim(),
      });
      setSubmitStatus('success');
      setRegradeReason('');
      setSelectedCriterion(null);
      setShowRegradeForm(false);
      loadGradedAssignment(); // Refresh
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to submit regrade request:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }
  };

  if (loading) return (
    <div className="graded-assignment-view">
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Loading assignment details...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="graded-assignment-view">
      <div className="error-state">
        <span className="error-icon">⚠️</span>
        <h3>No assignment data found</h3>
        <p>Please try again or contact support if the problem persists.</p>
      </div>
    </div>
  );

  const { submission, rubricGrades, regradeRequests } = data;

  return (
    <div className="graded-assignment-view">
      {/* Header Section */}
      <div className="assignment-header">
        <div className="header-content">
          <h1 className="assignment-title">{submission.assignment_title}</h1>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close assignment details"
          >
            ✕
          </button>
        </div>
        <p className="assignment-description">{submission.description}</p>
      </div>

      {/* Assignment Metadata */}
      <div className="assignment-meta">
        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-label">Submitted</span>
            <span className="meta-value">
              📅 {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Graded by</span>
            <span className="meta-value">👨‍🏫 {submission.grader_name}</span>
          </div>
          <div className="meta-item score-highlight">
            <span className="meta-label">Final Score</span>
            <span className="meta-value score-value">{submission.final_score}</span>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {submission.comments && (
        <div className="comments-section">
          <h3 className="section-title">📝 Grader Comments</h3>
          <div className="comments-content">
            <p>{submission.comments}</p>
          </div>
        </div>
      )}

      {/* Rubric Breakdown */}
      <div className="rubric-section">
        <h3 className="section-title">📊 Rubric Breakdown</h3>
        <div className="rubric-grades">
          {rubricGrades.map(grade => (
            <div key={grade.id} className="rubric-grade-card">
              <div className="rubric-header">
                <h4 className="criterion-title">{grade.criterion_title}</h4>
                <div className="criterion-score">
                  <span className="score-badge">{grade.score}</span>
                </div>
              </div>
              {grade.feedback && (
                <div className="rubric-feedback">
                  <p>{grade.feedback}</p>
                </div>
              )}
              <button
                className="regrade-button"
                onClick={() => {
                  setSelectedCriterion(grade.id);
                  setShowRegradeForm(true);
                }}
                aria-label={`Request regrade for ${grade.criterion_title}`}
              >
                ✏️ Request Regrade
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Regrade Requests History */}
      {regradeRequests.length > 0 && (
        <div className="regrade-history">
          <h3 className="section-title">📋 Regrade Requests</h3>
          <div className="regrade-list">
            {regradeRequests.map(req => (
              <div key={req.id} className={`regrade-item status-${req.status.toLowerCase()}`}>
                <div className="regrade-header">
                  <span className="regrade-status">
                    {req.status === 'pending' && '⏳'}
                    {req.status === 'approved' && '✅'}
                    {req.status === 'rejected' && '❌'}
                    {req.status}
                  </span>
                  <span className="regrade-date">
                    {new Date(req.requested_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <p className="regrade-reason">{req.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regrade Form */}
      {showRegradeForm && (
        <div className="regrade-form-overlay">
          <div className="regrade-form-modal">
            <div className="form-header">
              <h3>Request Regrade</h3>
              <button
                className="close-form-button"
                onClick={() => setShowRegradeForm(false)}
                aria-label="Close regrade form"
              >
                ✕
              </button>
            </div>

            {selectedCriterion && (
              <div className="selected-criterion">
                <p>
                  <strong>Selected Criterion:</strong>{' '}
                  {rubricGrades.find(g => g.id === selectedCriterion)?.criterion_title}
                </p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="regrade-reason">Reason for regrade request *</label>
              <textarea
                id="regrade-reason"
                value={regradeReason}
                onChange={(e) => setRegradeReason(e.target.value)}
                placeholder="Please explain why you are requesting a regrade. Be specific about what you believe was graded incorrectly."
                rows={4}
                required
              />
            </div>

            <div className="form-actions">
              <button
                className="cancel-button"
                onClick={() => setShowRegradeForm(false)}
                disabled={submitStatus === 'submitting'}
              >
                Cancel
              </button>
              <button
                className="submit-button"
                onClick={submitRegrade}
                disabled={!regradeReason.trim() || submitStatus === 'submitting'}
              >
                {submitStatus === 'submitting' && '📤 Submitting...'}
                {submitStatus === 'success' && '✅ Submitted!'}
                {submitStatus === 'error' && '❌ Try Again'}
                {submitStatus === 'idle' && '📤 Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
