import { useState, useEffect } from 'react';
import { getTAAssignments, getGradingSubmissions, submitGrading } from '../../services/ta';
import { getAssignmentRubric } from '../../services/rubrics';

interface Assignment {
  id: number;
  title: string;
  due_at: string;
  course_code: string;
  course_title: string;
  assigned_students: number;
  graded_students: number;
}

interface Submission {
  submission_id: number;
  student_id: number;
  student_name: string;
  roll_number: string;
  submitted_at: string;
  final_score: number | null;
  comments: string | null;
  grading_status: string;
}

interface RubricGrade {
  criterionId: number;
  score: number;
  feedback: string;
}

interface TAGradingProps {
  courseId?: string;
}

export default function TAGrading({ courseId }: TAGradingProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [rubric, setRubric] = useState<any>(null);
  const [rubricGrades, setRubricGrades] = useState<RubricGrade[]>([]);
  const [overallComments, setOverallComments] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const data = await getTAAssignments(courseId);
      setAssignments(data);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    }
  };

  const selectAssignment = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSelectedSubmission(null);
    try {
      const subs = await getGradingSubmissions(assignment.id);
      setSubmissions(subs);

      // Load rubric
      const rubricData = await getAssignmentRubric(assignment.id);
      setRubric(rubricData);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    }
  };

  const selectSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setRubricGrades([]);
    setOverallComments(submission.comments || '');
  };

  const handleRubricGradeChange = (criterionId: number, score: number, feedback: string) => {
    setRubricGrades(prev => {
      const existing = prev.find(g => g.criterionId === criterionId);
      if (existing) {
        return prev.map(g => g.criterionId === criterionId ? { ...g, score, feedback } : g);
      } else {
        return [...prev, { criterionId, score, feedback }];
      }
    });
  };

  const submitGradingForm = async () => {
    if (!selectedSubmission) return;

    setLoading(true);
    try {
      await submitGrading({
        submissionId: selectedSubmission.submission_id,
        rubricGrades,
        overallComments,
      });
      alert('Grading submitted successfully!');
      // Refresh
      if (selectedAssignment) {
        selectAssignment(selectedAssignment);
      }
    } catch (error) {
      console.error('Failed to submit grading:', error);
      alert('Failed to submit grading');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ta-grading">
      <h3>TA Grading</h3>

      {!selectedAssignment ? (
        <div>
          <h4>Select Assignment</h4>
          <div className="assignments-list">
            {assignments.map(assignment => (
              <div key={assignment.id} className="assignment-item" onClick={() => selectAssignment(assignment)}>
                <h5>{assignment.title}</h5>
                <p>{assignment.course_code} - {assignment.course_title}</p>
                <p>Due: {new Date(assignment.due_at).toLocaleDateString()}</p>
                <p>Assigned: {assignment.assigned_students}, Graded: {assignment.graded_students}</p>
              </div>
            ))}
          </div>
        </div>
      ) : !selectedSubmission ? (
        <div>
          <button onClick={() => setSelectedAssignment(null)}>Back to Assignments</button>
          <h4>Submissions for {selectedAssignment.title}</h4>
          <div className="submissions-list">
            {submissions.map(submission => (
              <div key={submission.submission_id} className="submission-item" onClick={() => selectSubmission(submission)}>
                <h5>{submission.student_name} ({submission.roll_number})</h5>
                <p>Submitted: {new Date(submission.submitted_at).toLocaleDateString()}</p>
                <p>Status: {submission.grading_status}</p>
                {submission.final_score !== null && <p>Score: {submission.final_score}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <button onClick={() => setSelectedSubmission(null)}>Back to Submissions</button>
          <h4>Grade Submission</h4>
          <p>Student: {selectedSubmission.student_name}</p>

          {rubric && rubric.criteria && (
            <div className="rubric-grading">
              <h5>Rubric</h5>
              {rubric.criteria.map((criterion: any) => (
                <div key={criterion.id} className="rubric-criterion">
                  <h6>{criterion.title}</h6>
                  <p>{criterion.description}</p>
                  <p>Max Points: {criterion.max_points}</p>
                  <input
                    type="number"
                    min="0"
                    max={criterion.max_points}
                    value={rubricGrades.find(g => g.criterionId === criterion.id)?.score || 0}
                    onChange={(e) => handleRubricGradeChange(criterion.id, parseFloat(e.target.value), rubricGrades.find(g => g.criterionId === criterion.id)?.feedback || '')}
                  />
                  <textarea
                    placeholder="Feedback"
                    value={rubricGrades.find(g => g.criterionId === criterion.id)?.feedback || ''}
                    onChange={(e) => handleRubricGradeChange(criterion.id, rubricGrades.find(g => g.criterionId === criterion.id)?.score || 0, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="overall-comments">
            <h5>Overall Comments</h5>
            <textarea
              value={overallComments}
              onChange={(e) => setOverallComments(e.target.value)}
              rows={4}
            />
          </div>

          <button onClick={submitGradingForm} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Grading'}
          </button>
        </div>
      )}
    </div>
  );
}