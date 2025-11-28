import MenuTiny from "./MenuTiny";
import { useNavigate } from "react-router-dom";

export default function PresentAssignmentsSection({
  userRole,
  presentAssignments,
  isBackend,
  onTeacherDelete,
  onStudentClickSubmitPDF,
  onAttemptQuiz,
  onStartCodeAttempt,
}: {
  userRole?: string;
  presentAssignments: any[];
  isBackend: boolean;
  onTeacherDelete: (assignmentId: number) => Promise<void>;
  onStudentClickSubmitPDF: (assignmentId: string) => void;
  onAttemptQuiz: (quizId: any) => void;
  onStartCodeAttempt: (assignment: any) => void;
}) {
  const navigate = useNavigate();
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
        {presentAssignments.map((a: any) => (
          <div
            key={a.id}
            className={`assignment-card ${
              userRole === "student" &&
              (a.assignment_type === "file" || a.assignment_type === "pdf" || a.assignment_type === "ppt" || a.assignment_type === "mixed")
                ? "clickable"
                : ""
            }`}
            onClick={() => {
              if (
                userRole === "student" &&
                (a.assignment_type === "file" || a.assignment_type === "pdf" || a.assignment_type === "ppt" || a.assignment_type === "mixed")
              ) {
                onStudentClickSubmitPDF(String(a.id));
                setTimeout(() => {
                  const form = document.querySelector(
                    "form[data-assignment-submit]"
                  ) as HTMLElement | null;
                  if (form)
                    form.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                    });
                }, 80);
              }
            }}
          >
            <div className="assignment-header">
              <div className="assignment-type">
                {a.assignment_type === "code" && "💻"}
                {a.assignment_type === "quiz" && "📝"}
                {a.assignment_type === "file" && "📄"}
                {a.assignment_type === "pdf" && "📄"}
                {a.assignment_type === "ppt" && "📊"}
                {a.assignment_type === "mixed" && "🔗"}
                {!a.assignment_type && a.is_quiz && "📝"}
                <span>
                  {a.assignment_type === "code"
                    ? "Code"
                    : a.assignment_type === "quiz"
                    ? "Quiz"
                    : a.assignment_type === "file"
                    ? "PDF"
                    : a.assignment_type === "pdf"
                    ? "PDF"
                    : a.assignment_type === "ppt"
                    ? "PPT"
                    : a.assignment_type === "mixed"
                    ? "Mixed"
                    : a.is_quiz
                    ? "Quiz"
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
                  <button
                    className="btn-assignment attempt-quiz"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAttemptQuiz(a.quiz_id);
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
                ) : a.assignment_type === "code" ? (
                  <button
                    className="btn-assignment attempt-code"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartCodeAttempt(a);
                    }}
                  >
                    <span>{a.isSubmitted ? "View Submission" : "Code Editor"}</span>
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
                ) : a.assignment_type === "file" ||
                  a.assignment_type === "pdf" ? (
                  <button
                    className="btn-assignment submit-pdf"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStudentClickSubmitPDF(String(a.id));
                      setTimeout(() => {
                        const form = document.querySelector(
                          "form[data-assignment-submit]"
                        ) as HTMLElement | null;
                        if (form)
                          form.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                          });
                      }, 80);
                    }}
                  >
                    <span>Submit PDF</span>
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
                ) : a.assignment_type === "ppt" ? (
                  <button
                    className="btn-assignment submit-ppt"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStudentClickSubmitPDF(String(a.id));
                      setTimeout(() => {
                        const form = document.querySelector(
                          "form[data-assignment-submit]"
                        ) as HTMLElement | null;
                        if (form)
                          form.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                          });
                      }, 80);
                    }}
                  >
                    <span>Submit PPT</span>
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
                ) : null}

                {/* View Details Button */}
                <button
                  className="btn-assignment view-details"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/courses/${window.location.pathname.split('/')[2]}/assignments/${a.id}`);
                  }}
                  style={{ marginTop: '8px', background: 'var(--secondary)', color: 'var(--text-primary)' }}
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


    </section>
  );
}
