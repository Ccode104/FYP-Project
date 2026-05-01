import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './TeacherCodeSubmissionViewer.css';

interface CodeSubmission {
  id?: string | number;
  code?: Array<{
    id: string | number;
    question_id?: string | number;
    code?: string;
    language?: string;
    filename?: string;
    test_case_results?: Array<{
      id?: string | number;
      passed?: boolean;
      input_text?: string;
      expected_text?: string;
      student_output?: string;
      error_output?: string;
      execution_time_ms?: number | null;
      is_sample?: boolean;
    }>;
    [key: string]: unknown;
  }>;
  student_name?: string;
  student_email?: string;
  submitted_at?: string;
  assignment_title?: string;
  assignment_id?: string | number;
  score?: number;
  feedback?: string;
  [key: string]: unknown;
}

interface QuestionDetail {
  id?: string | number;
  title?: string;
  description?: string;
  constraints?: string;
  test_cases?: Array<{
    id?: string | number;
    is_sample?: boolean;
    input_text?: string;
    expected_text?: string;
  }>;
  [key: string]: unknown;
}

interface TestCaseResult {
  passed?: boolean;
  output?: string;
  student_output?: string;
  error_output?: string;
  execution_time_ms?: number | null;
  input_text?: string;
  expected_text?: string;
  is_sample?: boolean;
  id?: string | number;
  [key: string]: unknown;
}

interface TeacherCodeSubmissionViewerProps {
  submission: CodeSubmission;
  onGrade: (score: number, feedback: string) => void;
  push: (opts: { kind?: string; message?: string }) => void;
  openGradeForm?: boolean;
  onToggleGradeForm?: (open: boolean) => void;
  isLocked?: boolean;
  isStudent?: boolean;
}

function TeacherCodeSubmissionViewer({
  submission,
  onGrade,
  push,
  openGradeForm = false,
  onToggleGradeForm,
  isLocked = false,
  isStudent = false,
}: TeacherCodeSubmissionViewerProps) {
  const { user } = useAuth();
  const [showGradingForm, setShowGradingForm] = useState(true);
  const [score, setScore] = useState('85');
  const [feedback, setFeedback] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [latePenalty, setLatePenalty] = useState(0);
  const [runningTestCases, setRunningTestCases] = useState<Record<string, boolean>>({});
  const [testCaseResults, setTestCaseResults] = useState<Record<string, TestCaseResult[]>>({});
  const [expandedTestCases, setExpandedTestCases] = useState<Record<number, boolean>>({});
  const [questionDetails, setQuestionDetails] = useState<Record<string, QuestionDetail>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleTestCase = (index: number) => {
    setExpandedTestCases(prev => ({ ...prev, [index]: !prev[index] }));
  };
  const codePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openGradeForm !== undefined) {
      setShowGradingForm(Boolean(openGradeForm));
    }
    if (submission.score !== undefined) {
      setScore(String(submission.score));
    }
  }, [openGradeForm, submission.score]);

  useEffect(() => {
    const loadQuestionDetails = async () => {
      const details: Record<string, QuestionDetail> = {};
      for (const codeSub of submission.code || []) {
        const questionId = codeSub.question_id;
        if (questionId) {
          try {
            const questionData = await apiFetch<QuestionDetail>(
              `/api/code-questions/${questionId}`
            );
            details[codeSub.id as string] = questionData;
          } catch (err) {
            console.error('Failed to load question details:', err);
          }
        }
      }
      setQuestionDetails(details);
    };
    if (submission.code && submission.code.length > 0 && submission.assignment_id) {
      void loadQuestionDetails();
    }
  }, [submission]);

  const runHiddenTestCases = async (codeSub: CodeSubmission['code'][0], questionId: number) => {
    if (!codeSub.code || !codeSub.language) {
      push({ kind: 'error', message: 'No code found for this question' });
      return;
    }

    setRunningTestCases(prev => ({ ...prev, [codeSub.id as string]: true }));
    try {
      const question = await apiFetch<QuestionDetail>(`/api/code-questions/${questionId}`);
      const allTestCases = question.test_cases || [];
      const hiddenTestCases = allTestCases.filter(
        (tc: QuestionDetail['test_cases'][0]) => !tc.is_sample
      );

      if (hiddenTestCases.length === 0) {
        push({ kind: 'info', message: 'No hidden test cases found for this question' });
        setRunningTestCases(prev => ({ ...prev, [codeSub.id as string]: false }));
        return;
      }

      const results: TestCaseResult[] = [];
      for (const testCase of hiddenTestCases) {
        try {
          const result = await apiFetch<{
            stdout?: string;
            stderr?: string;
            compile_output?: string;
            time?: number;
            status?: string;
          }>('/api/judge', {
            method: 'POST',
            body: {
              source_code: codeSub.code,
              language: codeSub.language,
              stdin: testCase.input_text || '',
              expected_output: testCase.expected_text || '',
              question_id: questionId,
            },
          });

          const passed =
            (result.stdout || '').trim() === (testCase.expected_text || '').trim();

          results.push({
            ...testCase,
            passed,
            student_output: result.stdout || '',
            error_output: result.stderr || result.compile_output || '',
            execution_time_ms: result.time ? Math.round(result.time * 1000) : null,
          });
        } catch {
          results.push({
            ...testCase,
            passed: false,
            error: 'Execution failed',
          });
        }
      }

      setTestCaseResults(prev => ({ ...prev, [codeSub.id as string]: results }));
      const passedCount = results.filter(r => r.passed).length;
      push({
        kind: 'success',
        message: `Ran ${results.length} hidden test cases. ${passedCount}/${results.length} passed.`,
      });
    } catch (err: unknown) {
      push({
        kind: 'error',
        message: (err as Error)?.message || 'Failed to run hidden test cases',
      });
    } finally {
      setRunningTestCases(prev => ({ ...prev, [codeSub.id as string]: false }));
    }
  };

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      push({ kind: 'error', message: 'Grading is locked. Please unlock the grading sheet first.' });
      return;
    }
    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      push({ kind: 'error', message: 'Please enter a valid score between 0 and 100' });
      return;
    }
    onGrade(numScore - latePenalty, feedback);
    setShowGradingForm(false);
    onToggleGradeForm?.(false);
    setScore('');
    setFeedback('');
    setInternalNotes('');
    setLatePenalty(0);
  };

  const toggleFullscreen = () => {
    if (!codePanelRef.current) return;

    if (!isFullscreen) {
      codePanelRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getFileName = (codeSub: CodeSubmission['code'][0]) => {
    return codeSub.filename || 'main.py';
  };

  const getLanguage = (codeSub: CodeSubmission['code'][0]) => {
    const lang = codeSub.language || 'python';
    const langMap: Record<string, string> = {
      python: 'Python 3.10',
      javascript: 'JavaScript',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      go: 'Go',
      rust: 'Rust',
    };
    return langMap[lang.toLowerCase()] || lang;
  };

  const formatCode = (code: unknown) => {
    if (code === null || code === undefined) return '';
    if (typeof code === 'string') {
      let processed = code;
      
      // Handle escaped newlines and tabs if they were double-escaped
      processed = processed.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      
      // Try parsing if it looks like JSON
      if ((processed.trim().startsWith('[') && processed.trim().endsWith(']')) || 
          (processed.trim().startsWith('{') && processed.trim().endsWith('}'))) {
        try {
          const parsed = JSON.parse(processed);
          return JSON.stringify(parsed, null, 2);
        } catch (e) {
          // Not valid JSON, return as string
        }
      }
      return processed.replace(/\r?\n/g, '\n');
    }
    if (typeof code === 'object') {
      return JSON.stringify(code, null, 2);
    }
    return String(code);
  };

  const getLineNumbers = (code: string) => {
    return code
      .split('\n')
      .map((_, i) => i + 1)
      .join('\n');
  };

  const getVisibleTestResultsForCode = (codeSub: CodeSubmission['code'][0]) => {
    const existingTestResults = codeSub.test_case_results || [];
    const filteredExisting = existingTestResults.filter(testCase =>
      isStudent ? testCase.is_sample : !testCase.is_sample
    );

    if (filteredExisting.length > 0) {
      return filteredExisting;
    }

    const question = questionDetails[codeSub.id as string];
    if (!question?.test_cases?.length) {
      return [];
    }

    return question.test_cases
      .filter(testCase => (isStudent ? testCase.is_sample : !testCase.is_sample))
      .map(testCase => ({
        ...testCase,
        passed: undefined,
        student_output: '',
        error_output: '',
        execution_time_ms: null,
      }));
  };

  const calculatePassingRate = () => {
    let total = 0;
    let passed = 0;

    submission.code?.forEach(codeSub => {
      const testResults = getVisibleTestResultsForCode(codeSub);
      total += testResults.length;
      passed += testResults.filter(tc => tc.passed).length;
    });

    if (total === 0) return 0;
    return Math.round((passed / total) * 100);
  };

  const getTestResultsForCode = (codeSub: CodeSubmission['code'][0]) => getVisibleTestResultsForCode(codeSub);

  const getAllTestResults = () => {
    const allResults: Array<{
      testCase: TestCaseResult | CodeSubmission['code'][0]['test_case_results'][0];
      index: number;
    }> = [];

    submission.code?.forEach((codeSub, codeIdx) => {
      const testResults = getTestResultsForCode(codeSub);
      testResults.forEach((testCase, tcIdx) => {
        allResults.push({ testCase, index: codeIdx * 100 + tcIdx });
      });
    });

    return allResults;
  };

  const formatSubmittedAt = () => {
    if (!submission.submitted_at) return 'N/A';
    const date = new Date(submission.submitted_at);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const primaryCode = submission.code?.[0];
  const primaryCodeId = primaryCode?.id as string | undefined;
  const primaryQuestion = primaryCodeId ? questionDetails[primaryCodeId] : undefined;
  const canRunHiddenTests = Boolean(primaryCode?.code && primaryCode?.language && primaryQuestion?.id);
  const isRunningPrimaryTests = primaryCodeId ? Boolean(runningTestCases[primaryCodeId]) : false;

  return (
    <div className="tc-viewer">
      <header className="tc-header">
        <div className="tc-header-left">
          <div className="tc-header-top">
            <span className="tc-badge">Student Submission</span>
            <span className="tc-submission-id">Submission ID: #{submission.id || 'N/A'}</span>
          </div>
          <h1 className="tc-title">
            {submission.assignment_title || 'Binary Search Tree Implementation'}
          </h1>
          <p className="tc-student-meta">
            Student: {submission.student_name || submission.student_email || 'Unknown'} • Submitted{' '}
            {formatSubmittedAt()}
          </p>
        </div>
        <div className="tc-nav-buttons">
          <button className="tc-nav-btn">
            <span className="material-symbols-outlined">arrow_back</span>
            Previous
          </button>
          <button className="tc-nav-btn">
            Next
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </header>

      <div className="tc-main">
        <section className="tc-code-panel" ref={codePanelRef}>
          <div className="tc-code-header-bar">
            <div className="tc-code-info">
              {submission.code?.[0] ? (
                <>
                  <span className="tc-file-name">
                    Source Code: {getFileName(submission.code[0])}
                  </span>
                  <div className="tc-divider"></div>
                  <span className="tc-language">{getLanguage(submission.code[0])}</span>
                </>
              ) : (
                <>
                  <span className="tc-file-name">Source Code: main.py</span>
                  <div className="tc-divider"></div>
                  <span className="tc-language">Python 3.10</span>
                </>
              )}
            </div>
            <button className="tc-fullscreen-btn" onClick={toggleFullscreen}>
              <span className="material-symbols-outlined">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>
          </div>
          <div className="tc-code-content">
            {(() => {
              let codeArray = submission.code;
              if (typeof codeArray === 'string') {
                try {
                  codeArray = JSON.parse(codeArray);
                } catch (e) {
                  codeArray = [];
                }
              }
              if (!Array.isArray(codeArray)) return null;
              
              return codeArray.map((codeSub, idx) => {
                const code = formatCode(codeSub.code);
                const lineNumbers = getLineNumbers(code);

                return (
                  <div key={codeSub.id || idx} className="tc-code-block">
                  <div className="tc-line-numbers">
                    {lineNumbers.split('\n').map((n, i) => (
                      <div key={i}>{n}</div>
                    ))}
                  </div>
                  <div className="tc-code-text">
                    {code.split('\n').map((line, lineIdx) => {
                      let highlighted = line
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                      
                      const stashes: string[] = [];
                      
                      // Stash strings
                      highlighted = highlighted.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, (match) => {
                          stashes.push(`<span class="tc-string">${match}</span>`);
                          return `__STASH_${stashes.length - 1}__`;
                      });

                      // Stash comments
                      highlighted = highlighted.replace(/(#.*)$/g, (match) => {
                          stashes.push(`<span class="tc-comment">${match}</span>`);
                          return `__STASH_${stashes.length - 1}__`;
                      });

                      // Keywords
                      highlighted = highlighted
                        .replace(
                          /\b(class|def|if|elif|else|return|import|from|for|while|in|is|try|except|finally|with|as|pass|break|continue|lambda|yield|raise|async|await)\b/g,
                          '<span class="tc-keyword">$1</span>'
                        )
                        .replace(/\b(self|None|True|False)\b/g, '<span class="tc-func">$1</span>')
                        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tc-number">$1</span>');

                      // Unstash
                      highlighted = highlighted.replace(/__STASH_(\d+)__/g, (_, idx) => stashes[Number(idx)]);

                      return (
                        <div
                          key={lineIdx}
                          className="code-line"
                          style={{ 
                            minHeight: '1.625em', 
                            whiteSpace: 'pre-wrap', 
                            wordBreak: 'break-all',
                            display: 'block' 
                          }}
                          dangerouslySetInnerHTML={{ __html: highlighted || ' ' }}
                        />
                      );
                    })}
                  </div>
                </div>
                );
              });
            })()}
          </div>
        </section>

        <section className="tc-sidebar">
          <div className="tc-test-card">
            <div className="tc-test-header">
              <h2 className="tc-card-title">Test Suite Results</h2>
              <span className="tc-passing-rate">{calculatePassingRate()}% Passing</span>
            </div>
            <div className="tc-test-list">
              {getAllTestResults().length > 0 ? (
                getAllTestResults().map(({ testCase, index }) => {
                  const isExpanded = expandedTestCases[index] || false;
                  return (
                    <div key={index} className="tc-test-container">
                      <div
                        className={`tc-test-item ${
                          testCase.passed === true ? 'passed' : testCase.passed === false ? 'failed' : 'pending'
                        }`}
                        onClick={() => toggleTestCase(index)}
                        style={{ cursor: 'pointer', marginBottom: isExpanded ? 0 : '8px', borderBottomLeftRadius: isExpanded ? 0 : '', borderBottomRightRadius: isExpanded ? 0 : '' }}
                      >
                        <div className="tc-test-item-left">
                          <span
                            className={`material-symbols-outlined ${
                              testCase.passed === true
                                ? 'tc-check-icon'
                                : testCase.passed === false
                                ? 'tc-error-icon'
                                : 'tc-pending-icon'
                            }`}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {testCase.passed === true
                              ? 'check_circle'
                              : testCase.passed === false
                              ? 'error'
                              : 'hourglass_empty'}
                          </span>
                          <span className="tc-test-name">
                            {testCase.is_sample ? 'Sample Test' : 'Hidden Test'} {index + 1}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="tc-test-time">
                            {testCase.execution_time_ms !== null &&
                            testCase.execution_time_ms !== undefined
                              ? `${(testCase.execution_time_ms / 1000).toFixed(2)}s`
                              : testCase.passed === true
                                ? 'Passed'
                                : testCase.passed === false
                                  ? 'FAILED'
                                  : 'Pending'}
                          </span>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{
                          padding: '12px',
                          backgroundColor: 'var(--surface-container-lowest, #f8fafc)',
                          borderRadius: '0 0 8px 8px',
                          border: '1px solid var(--outline-variant, #e2e8f0)',
                          borderTop: 'none',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          marginBottom: '8px'
                        }}>
                          <div style={{marginBottom: '8px'}}><strong style={{color: 'var(--on-surface)'}}>Input:</strong><br />{testCase.input_text || 'No input details'}</div>
                          <div style={{marginBottom: '8px'}}><strong style={{color: 'var(--on-surface)'}}>Expected:</strong><br />{testCase.expected_text || 'N/A'}</div>
                          <div style={{marginBottom: testCase.error_output ? '8px' : '0'}}><strong style={{color: testCase.passed ? 'var(--primary, #3b82f6)' : 'var(--error, #ef4444)'}}>Actual Output:</strong><br />{testCase.student_output}</div>
                          {testCase.error_output && (
                            <div><strong style={{color: 'var(--error, #ef4444)'}}>Error:</strong><br />{testCase.error_output}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="tc-empty-state">
                  <p>
                    {isStudent
                      ? 'No sample test results are available for this submission yet.'
                      : 'No hidden test results are available yet. Run hidden test cases to see results.'}
                  </p>
                </div>
              )}
            </div>
            {!isStudent && (
              <button
                className="tc-run-btn"
                onClick={() => {
                  if (primaryCode && primaryQuestion?.id) {
                    runHiddenTestCases(primaryCode, primaryQuestion.id as number);
                  }
                }}
                disabled={isRunningPrimaryTests || !canRunHiddenTests || isLocked}
                title={isLocked ? 'Unlock the grading sheet to run hidden test cases' : !canRunHiddenTests ? 'Question details are still loading' : undefined}
              >
                {isRunningPrimaryTests ? (
                  <>
                    <span className="tc-spinner"></span>
                    Running...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined tc-play-icon">play_circle</span>
                    Run Hidden Test Cases
                  </>
                )}
              </button>
            )}
          </div>

          {!isStudent && user?.role !== 'student' && (
            <div className="grading-panel-card">
              {!showGradingForm ? (
                <button
                  className="btn-grade-submit"
                  onClick={() => {
                    setShowGradingForm(true);
                    onToggleGradeForm?.(true);
                  }}
                >
                  <span className="material-symbols-outlined">verified_user</span>
                  Grade Submission
                </button>
              ) : (
                <form onSubmit={handleGradeSubmit}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Grading & Feedback</h3>
                    {isLocked && (
                      <span className="material-symbols-outlined" style={{ color: '#dc2626' }}>lock</span>
                    )}
                  </div>

                  {isLocked && (
                    <div className="tc-lock-message" style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid var(--primary)', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
                      Unlock grading sheet to submit grades.
                    </div>
                  )}
                  
                  <fieldset disabled={isLocked} style={{ border: 'none', padding: 0, margin: 0, opacity: isLocked ? 0.7 : 1 }}>
                    <div className="form-group">
                      <label>Marks (out of 100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={score}
                        onChange={e => setScore(e.target.value)}
                        required
                        placeholder="Enter marks..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Comment / Feedback</label>
                      <textarea
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="Enter feedback for the student..."
                        rows={6}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button type="submit" className="btn-grade-submit" style={{ flex: 1, marginTop: 0 }}>
                        Submit Grade
                      </button>
                      <button
                        type="button"
                        className="btn-back"
                        style={{ flex: 1, marginTop: 0, justifyContent: 'center' }}
                        onClick={() => {
                          setShowGradingForm(false);
                          onToggleGradeForm?.(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </fieldset>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default TeacherCodeSubmissionViewer;
