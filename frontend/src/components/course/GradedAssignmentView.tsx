import { useState, useEffect } from 'react';
import { getGradedAssignment, submitRegradeRequest } from '../../services/student';

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
    if (!data || !regradeReason) return;

    try {
      await submitRegradeRequest({
        submissionId: data.submission.id,
        criterionId: selectedCriterion || undefined,
        reason: regradeReason,
      });
      alert('Regrade request submitted!');
      setRegradeReason('');
      setSelectedCriterion(null);
      loadGradedAssignment(); // Refresh
    } catch (error) {
      console.error('Failed to submit regrade request:', error);
      alert('Failed to submit regrade request');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;

  const { submission, rubricGrades, regradeRequests } = data;

  return (
    <div className="graded-assignment-view">
      <button onClick={onClose}>Close</button>
      <h3>{submission.assignment_title}</h3>
      <p>{submission.description}</p>
      <p>Submitted: {new Date(submission.submitted_at).toLocaleDateString()}</p>
      <p>Graded by: {submission.grader_name}</p>
      <p>Final Score: {submission.final_score}</p>
      <p>Comments: {submission.comments}</p>

      <h4>Rubric Breakdown</h4>
      {rubricGrades.map(grade => (
        <div key={grade.id} className="rubric-grade">
          <h5>{grade.criterion_title}</h5>
          <p>Score: {grade.score}</p>
          <p>Feedback: {grade.feedback}</p>
          <button onClick={() => setSelectedCriterion(grade.id)}>Request Regrade for this criterion</button>
        </div>
      ))}

      <h4>Regrade Requests</h4>
      {regradeRequests.map(req => (
        <div key={req.id}>
          <p>Reason: {req.reason}</p>
          <p>Status: {req.status}</p>
          <p>Requested: {new Date(req.requested_at).toLocaleDateString()}</p>
        </div>
      ))}

      <div className="regrade-form">
        <h4>Submit Regrade Request</h4>
        <textarea
          value={regradeReason}
          onChange={(e) => setRegradeReason(e.target.value)}
          placeholder="Explain why you are requesting a regrade"
        />
        <button onClick={submitRegrade}>Submit Request</button>
      </div>
    </div>
  );
}