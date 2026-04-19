import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/ToastProvider';
import CodeEditor from '../../components/CodeEditor';
import './CodeAssignmentView.css';

interface CodeQuestion {
  id: string | number;
  title?: string;
  description?: string;
  constraints?: string;
  sample_input?: string;
  sample_output?: string;
  test_cases?: Array<{
    id?: number;
    is_sample?: boolean;
    input_text?: string;
    expected_text?: string;
  }>;
}

interface AssignmentDetails {
  id: string | number;
  title?: string;
  description?: string;
  instructions?: string;
  constraints?: string;
  due_at?: string;
  max_score?: number;
  attempt_limit?: number;
  attempts_used?: number;
  course_code?: string;
  course_name?: string;
  language?: string;
  questions?: CodeQuestion[];
}

interface Submission {
  id: number;
  submitted_at: string;
  score?: number;
  language?: string;
  code?: string;
}

export default function CodeAssignmentView() {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [assignment, setAssignment] = useState<AssignmentDetails | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = useMemo(() => {
    return assignment?.questions?.[currentQuestionIndex] || null;
  }, [assignment, currentQuestionIndex]);

  useEffect(() => {
    if (!assignmentId) return;

    const loadAssignment = async () => {
      try {
        setLoading(true);
        const [assignmentData, questionsData, submissionsData] = await Promise.all([
          apiFetch<AssignmentDetails>(`/api/assignments/${assignmentId}`),
          apiFetch<CodeQuestion[]>(`/api/assignments/${assignmentId}/questions`).catch(() => []),
          apiFetch<Submission[]>(`/api/assignments/${assignmentId}/submissions`).catch(() => []),
        ]);

        setAssignment({ ...assignmentData, questions: questionsData });
        setSubmissions(submissionsData || []);

        if (assignmentData.language) {
          setLanguage(assignmentData.language);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assignment');
      } finally {
        setLoading(false);
      }
    };

    loadAssignment();
  }, [assignmentId]);

  const handleSubmit = async () => {
    if (!assignmentId || !code.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await apiFetch('/api/submissions/submit/code', {
        method: 'POST',
        body: {
          assignment_id: Number(assignmentId),
          question_id: currentQuestion ? Number(currentQuestion.id) : undefined,
          language,
          code,
        },
      });

      setSubmissions(prev => [result as Submission, ...prev]);
      toast?.push?.({ kind: 'success', message: 'Code submitted successfully!' });
    } catch (err) {
      toast?.push?.({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to submit',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="code-assignment-view">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="code-assignment-view">
        <div className="error-state">
          <p>{error || 'Assignment not found'}</p>
          <button onClick={() => navigate(`/courses/${courseId}/assignments`)}>
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  const formatDueDate = (dueAt?: string) => {
    if (!dueAt) return 'No due date';
    const date = new Date(dueAt);
    return (
      date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' 11:59 PM'
    );
  };

  const getMonthFromDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  };

  const getDayFromDate = (dateStr: string) => {
    return new Date(dateStr).getDate();
  };

  return (
    <div className="code-assignment-view">
      <button className="back-btn" onClick={() => navigate(`/courses/${courseId}/assignments`)}>
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Assignments
      </button>

      <div className="code-assignment-header">
        <div className="header-left">
          <div className="course-code">
            <span className="material-symbols-outlined">code</span>
            {assignment.course_code}: {assignment.course_name}
          </div>
          <h2>{assignment.title}</h2>
          <div className="meta-info">
            <span>
              <span className="material-symbols-outlined">event</span>
              Due: {formatDueDate(assignment.due_at)}
            </span>
            <span>
              <span className="material-symbols-outlined">star</span>
              Points: {assignment.max_score || 0}/{assignment.max_score || 100}
            </span>
            <span>
              <span className="material-symbols-outlined">replay</span>
              Attempts: {assignment.attempts_used || 0}/{assignment.attempt_limit || 5}
            </span>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-open-editor" onClick={() => setShowEditor(true)}>
            <span className="material-symbols-outlined">terminal</span>
            Open Code Editor
          </button>
        </div>
      </div>

      {!showEditor && (
        <div className="bento-grid">
          <div className="left-column">
            {assignment.description && (
              <div className="instructions-card">
                <div className="card-header">
                  <span className="material-symbols-outlined">description</span>
                  Instructions
                </div>
                <div className="card-content">
                  <div dangerouslySetInnerHTML={{ __html: assignment.description }} />
                </div>
              </div>
            )}

            {assignment.constraints && (
              <div className="constraints-card">
                <div className="card-header">
                  <span className="material-symbols-outlined">rule</span>
                  Constraints
                </div>
                <div className="constraints-grid">
                  <div className="constraint-item">
                    <span className="material-symbols-outlined constraint-icon">check_circle</span>
                    <span className="constraint-text">Time Limit: 2 seconds</span>
                  </div>
                  <div className="constraint-item">
                    <span className="material-symbols-outlined constraint-icon">check_circle</span>
                    <span className="constraint-text">Memory Limit: 256MB</span>
                  </div>
                </div>
              </div>
            )}

            {submissions.length > 0 && (
              <div className="history-card">
                <div className="card-header">
                  <div className="header-title">
                    <span className="material-symbols-outlined">history</span>
                    Submission History
                  </div>
                </div>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub, idx) => (
                      <tr key={sub.id || idx}>
                        <td className="version">v{idx + 1}.0</td>
                        <td>{new Date(sub.submitted_at).toLocaleString()}</td>
                        <td>
                          <span
                            className={`status-badge ${sub.score !== undefined && sub.score > 0 ? 'passed' : 'failed'}`}
                          >
                            {sub.score !== undefined && sub.score > 0 ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                        <td>{sub.score ?? '-'}</td>
                        <td>
                          <button
                            className="btn-view-code"
                            onClick={() => {
                              setCode(sub.code || '');
                              setShowEditor(true);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="right-column">
            {assignment.due_at && (
              <div className="deadlines-card">
                <h3>Upcoming Deadlines</h3>
                <div className="deadline-item">
                  <div className="date-badge oct">
                    <span className="month">{getMonthFromDate(assignment.due_at)}</span>
                    <span className="day">{getDayFromDate(assignment.due_at)}</span>
                  </div>
                  <div>
                    <h4>Assignment Due</h4>
                    <p>11:59 PM</p>
                  </div>
                </div>
              </div>
            )}

            <div className="resources-card">
              <h3>Resources</h3>
              <div className="resource-item">
                <span className="material-symbols-outlined">menu_book</span>
                <span>Lecture Slides</span>
              </div>
              <div className="resource-item">
                <span className="material-symbols-outlined">article</span>
                <span>Practice Problems</span>
              </div>
              <div className="resource-item">
                <span className="material-symbols-outlined">video_library</span>
                <span>Video Tutorial</span>
              </div>
            </div>

            <div className="help-card">
              <h4>Need Help?</h4>
              <p>Get assistance from our AI tutor or ask your instructor.</p>
              <button>Ask for Help</button>
            </div>
          </div>
        </div>
      )}

      {showEditor && (
        <div className="editor-container">
          <div className="editor-top-bar">
            <div className="question-tabs">
              {assignment.questions && assignment.questions.length > 1 ? (
                assignment.questions.map((q, idx) => (
                  <button
                    key={q.id}
                    className={`question-tab ${idx === currentQuestionIndex ? 'active' : ''}`}
                    onClick={() => setCurrentQuestionIndex(idx)}
                  >
                    Q{idx + 1}
                  </button>
                ))
              ) : (
                <button className="question-tab active">Question 1</button>
              )}
            </div>
            <div className="language-selector">
              <label>Language:</label>
              <select value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>
          </div>

          {currentQuestion && (
            <div className="question-panel">
              <div className="question-header">
                <h3>{currentQuestion.title || `Question ${currentQuestionIndex + 1}`}</h3>
              </div>
              <div className="question-description">
                {currentQuestion.description && (
                  <div dangerouslySetInnerHTML={{ __html: currentQuestion.description }} />
                )}
                {currentQuestion.test_cases &&
                  currentQuestion.test_cases.filter(tc => tc.is_sample).length > 0 && (
                    <div className="examples">
                      <h4>Examples:</h4>
                      {currentQuestion.test_cases
                        .filter(tc => tc.is_sample)
                        .map((tc, idx) => (
                          <div key={idx} className="example">
                            <div className="example-input">
                              <strong>Input:</strong>
                              <pre>{tc.input_text}</pre>
                            </div>
                            <div className="example-output">
                              <strong>Output:</strong>
                              <pre>{tc.expected_text}</pre>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
              </div>
            </div>
          )}

          <div className="code-editor-wrapper">
            <CodeEditor value={code} onChange={setCode} defaultLanguage={language} />
          </div>

          <div className="editor-actions">
            <button
              className="btn-submit-code"
              onClick={handleSubmit}
              disabled={!code.trim() || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Code'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
