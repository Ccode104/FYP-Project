import MenuTiny from "./MenuTiny";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import AssignmentSubmissionModal from "../AssignmentSubmissionModal";

interface Assignment {
  id: string | number;
  title?: string;
  [key: string]: unknown;
}

interface AssignmentItem {
  id: string | number;
  title?: string;
  is_quiz?: boolean;
  isSubmitted?: boolean;
  quiz_id?: string | number;
  due_at?: string;
  allow_github_repo?: boolean;
  [key: string]: unknown;
}

export default function PresentAssignmentsSection({
  userRole,
  presentAssignments,
  isBackend,
  onTeacherDelete,
  onAttemptQuiz,
  onSubmitSuccess,
}: {
  userRole?: string;
  presentAssignments: AssignmentItem[];
  isBackend: boolean;
  onTeacherDelete: (assignmentId: number) => Promise<void>;
  onAttemptQuiz: (quiz: AssignmentItem) => void;
  onSubmitSuccess?: () => void;
}) {
  const navigate = useNavigate();
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  return (
    <section className="assignments-section">
      <div className="section-header">
        <h2 className="section-title">
          {userRole === "student" ? "Your Assignments" : "Open Assignments"}
        </h2>
        <span className="assignment-count">
          {presentAssignments.length} available
        </span>
      </div>

      {userRole === "student" && presentAssignments.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <h3>All caught up!</h3>
          <p>You've completed all your assignments and quizzes.</p>
        </div>
      )}

      <div className="assignments-grid">
        {presentAssignments.map((a: AssignmentItem) => (
          <div
            key={a.id}
            className={`assignment-card ${
              userRole === "student" && !a.is_quiz ? "clickable" : ""
            }`}
            onClick={() => {
              if (userRole === "student" && !a.is_quiz) {
                setSelectedAssignment(a);
                setSubmissionModalOpen(true);
              }
            }}
          >
            <div className="assignment-header">
              <div className="assignment-type">
                {a.is_quiz ? "📝" : a.allow_github_repo ? "🔗" : "📄"}
                <span>
                  {a.is_quiz
                    ? "Quiz"
                    : a.allow_github_repo
                    ? "Assignment (GitHub)"
                    : "Assignment"}
                </span>
              </div>
              <div className="assignment-badges">
                {userRole === "student" && a.isSubmitted && (
                  <span className="submitted-badge">✓ Submitted</span>
                )}
                {isBackend && userRole === "teacher" && (
                  <MenuTiny
                    onDelete={async () => {
                      await onTeacherDelete(Number(a.id));
                    }}
                  />
                )}
              </div>
            </div>

            <h3 className="assignment-title">{a.title}</h3>

            {a.due_at && (
              <div className="assignment-due">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Due: {new Date(a.due_at).toLocaleDateString()}
              </div>
            )}

            {userRole === "student" && (
              <div className="assignment-actions">
                {a.is_quiz ? (
                  a.isSubmitted ? (
                    <button
                      className="btn-assignment view-results"
                      disabled={a.due_at ? new Date(a.due_at) > new Date() : false}
                      title={a.due_at && new Date(a.due_at) > new Date() ? "Results available after deadline" : "View Results"}
                      onClick={(e) => {
                        e.stopPropagation();
                        // If it's a student and they click this, we can either navigate to the quiz results page
                        // or show a message. Since this component is reused, navigating or triggering a callback is best.
                        if (a.due_at && new Date(a.due_at) > new Date()) return;
                        // For now, navigating to the course details quizzes tab might be the easiest way to show the modal
                        // Or we can just trigger onAttemptQuiz with a flag if we want.
                        // But let's just make it look right first.
                      }}
                    >
                      <span>{a.due_at && new Date(a.due_at) > new Date() ? "Results Pending" : "View Results"}</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      className="btn-assignment attempt-quiz"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAttemptQuiz(a);
                      }}
                    >
                      <span>Start Quiz</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="9,18 15,12 9,6" />
                      </svg>
                    </button>
                  )
                ) : (
                  <button
                    className="btn-assignment submit-assignment"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAssignment(a);
                      setSubmissionModalOpen(true);
                    }}
                  >
                    <span>{a.isSubmitted ? "View Submission" : "Submit Assignment"}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21,15v4a2,2 0 0 1-2,2H5a2,2 0 0 1-2-2v-4" />
                      <polyline points="7,10 12,15 17,10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                )}

                {/* View Details Button */}
                <button
                  className="btn-assignment view-details"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/courses/${window.location.pathname.split('/')[2]}/assignments/${a.id}`);
                  }}
                >
                  <span>View Details</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Assignment Submission Modal */}
      {selectedAssignment && (
        <AssignmentSubmissionModal
          isOpen={submissionModalOpen}
          onClose={() => {
            setSubmissionModalOpen(false);
            setSelectedAssignment(null);
          }}
          assignment={selectedAssignment}
          onSubmitSuccess={onSubmitSuccess}
        />
      )}
    </section>
  );
}
