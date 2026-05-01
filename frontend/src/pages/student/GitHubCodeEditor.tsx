import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../components/ToastProvider';
import { apiFetch } from '../../services/api';
import './GitHubCodeEditor.css';

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

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  private: boolean;
  updated_at: string;
}

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  content?: string;
  encoding?: string;
  html_url?: string;
}

interface VisibleTestCase {
  id: string;
  questionId: string | number;
  questionTitle: string;
  input: string;
  expected: string;
  isHidden?: boolean;
}

interface JudgeResponse {
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  status?: {
    id?: number;
    description?: string;
  };
}

interface TestResult {
  id: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  message: string;
  isHidden?: boolean;
}

const languageMap: Record<string, string> = {
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  javascript: 'javascript',
  c: 'c',
};

function getFileExtension(filename: string) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : filename.toLowerCase();
}

function decodeBase64Utf8(value: string) {
  try {
    const binary = atob(value.replace(/\n/g, ''));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return atob(value.replace(/\n/g, ''));
  }
}

function resolveLanguage(selectedLanguage: string, file?: FileItem | null) {
  const extension = file ? getFileExtension(file.name) : '';
  if (extension === 'py') return 'python';
  if (extension === 'java') return 'java';
  if (extension === 'c') return 'c';
  if (extension === 'cpp' || extension === 'cc' || extension === 'cxx' || extension === 'hpp') {
    return 'cpp';
  }
  if (extension === 'js' || extension === 'jsx') return 'javascript';
  if (extension === 'ts' || extension === 'tsx') return 'typescript';
  if (extension === 'json') return 'json';
  if (extension === 'md') return 'markdown';
  if (extension === 'html') return 'html';
  if (extension === 'css' || extension === 'scss') return 'css';
  if (extension === 'sql') return 'sql';
  return languageMap[selectedLanguage] || 'plaintext';
}

export default function GitHubCodeEditor() {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [assignment, setAssignment] = useState<AssignmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [code, setCode] = useState('');
  const [fileMessage, setFileMessage] = useState('Select a file to preview it.');
  const [language, setLanguage] = useState('python');

  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [runningTests, setRunningTests] = useState(false);
  const [output, setOutput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submittingFile, setSubmittingFile] = useState(false);
  const codePanelRef = useRef<HTMLDivElement>(null);

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

  const [githubConnected, setGithubConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);

  const visibleTestCases = useMemo<VisibleTestCase[]>(() => {
    if (!assignment?.questions?.length) return [];

    return assignment.questions.flatMap((question, questionIndex) => {
      if (question.test_cases && Array.isArray(question.test_cases) && question.test_cases.length > 0) {
        return question.test_cases
          .map((testCase, testIndex) => ({
            id: `${question.id}-${testIndex}`,
            questionId: question.id,
            questionTitle: question.title || `Question ${questionIndex + 1}`,
            input: testCase.input_text || '',
            expected: testCase.expected_text || '',
            isHidden: !testCase.is_sample,
          }));
      }

      if (question.sample_input || question.sample_output) {
        return [
          {
            id: `${question.id}-sample-0`,
            questionId: question.id,
            questionTitle: question.title || `Question ${questionIndex + 1}`,
            input: question.sample_input || '',
            expected: question.sample_output || '',
            isHidden: false,
          },
        ];
      }

      return [];
    });
  }, [assignment]);

  const breadcrumbSegments = useMemo(() => currentPath.split('/').filter(Boolean), [currentPath]);

  const allTestsPassed = useMemo(() => {
    const results = Object.values(testResults);
    return results.length > 0 && results.every(result => result.passed);
  }, [testResults]);

  useEffect(() => {
    const checkGitHubStatus = async () => {
      try {
        const data = await apiFetch<{ connected: boolean; username?: string }>('/api/github/status');
        setGithubConnected(data.connected);
        setGithubUsername(data.username || null);
      } catch {
        setGithubConnected(false);
        setGithubUsername(null);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkGitHubStatus();
  }, []);

  useEffect(() => {
    if (!assignmentId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [assignmentData, questionsData, reposData] = await Promise.all([
          apiFetch<AssignmentDetails>(`/api/assignments/${assignmentId}`),
          apiFetch<CodeQuestion[]>(`/api/assignments/${assignmentId}/questions`).catch(() => []),
          apiFetch<{ repositories: GitHubRepo[] }>('/api/github/repositories').catch(() => ({
            repositories: [],
          })),
        ]);

        setAssignment({ ...assignmentData, questions: questionsData || [] });
        setRepos(reposData.repositories || []);

        if (assignmentData.language) {
          setLanguage(assignmentData.language);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [assignmentId]);

  useEffect(() => {
    if (!selectedRepo) return;

    const loadFiles = async () => {
      setLoadingFiles(true);
      try {
        const [owner, repoName] = selectedRepo.full_name.split('/');
        const encodedPath = currentPath
          .split('/')
          .map(segment => encodeURIComponent(segment))
          .join('/');
        const url = encodedPath
          ? `/api/github/repos/${owner}/${repoName}/contents/${encodedPath}`
          : `/api/github/repos/${owner}/${repoName}/contents`;
        const data = await apiFetch<FileItem[] | FileItem>(url);
        const items = Array.isArray(data) ? data : [];
        const sortedItems = [...items].sort((a, b) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        setFiles(sortedItems);
      } catch (err) {
        console.error('Failed to load files:', err);
        setFiles([]);
        toast?.push?.({ kind: 'error', message: 'Failed to load repository contents' });
      } finally {
        setLoadingFiles(false);
      }
    };

    loadFiles();
  }, [currentPath, selectedRepo, toast]);

  useEffect(() => {
    if (!selectedFile || !selectedRepo) return;

    const loadFileContent = async () => {
      try {
        const [owner, repoName] = selectedRepo.full_name.split('/');
        const encodedPath = selectedFile.path
          .split('/')
          .map(segment => encodeURIComponent(segment))
          .join('/');
        const data = await apiFetch<FileItem>(`/api/github/repos/${owner}/${repoName}/contents/${encodedPath}`);

        if (!data?.content) {
          setCode('');
          setFileMessage('This file cannot be previewed inline.');
          return;
        }

        const decodedContent =
          data.encoding === 'base64' ? decodeBase64Utf8(data.content) : data.content || '';
        setCode(decodedContent);
        setFileMessage(decodedContent ? '' : 'This file is empty.');
      } catch (err) {
        console.error('Failed to load file:', err);
        setCode('');
        setFileMessage('Failed to load file content.');
        toast?.push?.({ kind: 'error', message: 'Failed to load file content' });
      }
    };

    loadFileContent();
  }, [selectedFile, selectedRepo, toast]);

  const initiateGitHubConnect = async () => {
    try {
      const response = await apiFetch<{ authUrl: string }>('/api/auth/github');
      const authWindow = window.open(
        response.authUrl,
        'github-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (authWindow) {
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            setTimeout(async () => {
              try {
                const data = await apiFetch<{ connected: boolean; username?: string }>(
                  '/api/github/status'
                );
                setGithubConnected(data.connected);
                setGithubUsername(data.username || null);
                if (!data.connected) {
                  toast?.push?.({ kind: 'error', message: 'Failed to connect GitHub' });
                }
              } catch {
                toast?.push?.({ kind: 'error', message: 'Failed to connect GitHub' });
              }
            }, 2000);
          }
        }, 1000);
      }
    } catch {
      toast?.push?.({ kind: 'error', message: 'Failed to initiate GitHub connection' });
    }
  };

  const handleRepoChange = (repoId: number) => {
    const repo = repos.find(item => item.id === repoId) || null;
    setSelectedRepo(repo);
    setCurrentPath('');
    setFiles([]);
    setSelectedFile(null);
    setCode('');
    setFileMessage('Select a file to preview it.');
    setTestResults({});
    setOutput('');
  };

  const handleFileSelect = (file: FileItem) => {
    if (file.type === 'dir') {
      setCurrentPath(file.path);
      return;
    }

    setSelectedFile(file);
    setCode('');
    setFileMessage('Loading file...');
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index < 0) {
      setCurrentPath('');
      return;
    }
    setCurrentPath(breadcrumbSegments.slice(0, index + 1).join('/'));
  };

  const handleGoUp = () => {
    if (!breadcrumbSegments.length) return;
    navigateToBreadcrumb(breadcrumbSegments.length - 2);
  };

  const handleSubmitFile = async () => {
    if (!assignmentId || !selectedRepo || !selectedFile || selectedFile.type !== 'file') {
      toast?.push?.({ kind: 'error', message: 'Select a file to submit first' });
      return;
    }

    const branch = (selectedRepo as any).default_branch || 'main';
    const repoLink =
      selectedFile.html_url ||
      `https://github.com/${selectedRepo.full_name}/blob/${branch}/${selectedFile.path}`;

    setSubmittingFile(true);
    try {
      await apiFetch('/api/submissions/submit/code', {
        method: 'POST',
        body: {
          assignment_id: Number(assignmentId),
          language,
          code: code || null,
          repo_link: repoLink,
        },
      });
      toast?.push?.({ kind: 'success', message: 'GitHub file submitted successfully.' });
    } catch (err) {
      console.error('Failed to submit GitHub file:', err);
      toast?.push?.({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to submit GitHub file. Please try again.',
      });
    } finally {
      setSubmittingFile(false);
    }
  };

  const handleRunTests = async () => {
    if (!code.trim()) {
      toast?.push?.({ kind: 'error', message: 'Open a file with code before running tests' });
      return;
    }

    if (visibleTestCases.length === 0) {
      toast?.push?.({ kind: 'error', message: 'No sample test cases are available for this assignment' });
      return;
    }

    setRunningTests(true);
    setOutput('Running tests...\n');
    setTestResults({});

    try {
      const nextResults: Record<string, TestResult> = {};

      for (const testCase of visibleTestCases) {
        try {
          const response = await apiFetch<JudgeResponse>('/api/judge', {
            method: 'POST',
            body: {
              source_code: code,
              language,
              stdin: testCase.input,
            },
          });

          const stdout = (response.stdout ?? '').toString().trim();
          const stderr = (response.stderr ?? '').toString().trim();
          const compileOutput = (response.compile_output ?? '').toString().trim();
          const actual = stdout || stderr || compileOutput;
          const passed = stdout === testCase.expected.trim();

          let message = response.status?.description || 'Finished';
          if (response.status?.id === 3) {
            message = passed ? 'Passed' : 'Output mismatch';
          } else if (response.status?.id === 6) {
            message = 'Compilation error';
          } else if (response.status?.id === 7) {
            message = 'Runtime error';
          }

          nextResults[testCase.id] = {
            id: testCase.id,
            input: testCase.input,
            expected: testCase.expected,
            actual,
            passed,
            message,
            isHidden: testCase.isHidden,
          };
        } catch (err) {
          nextResults[testCase.id] = {
            id: testCase.id,
            input: testCase.input,
            expected: testCase.expected,
            actual: '',
            passed: false,
            message: err instanceof Error ? err.message : 'Test execution failed',
            isHidden: testCase.isHidden,
          };
        }
      }

      setTestResults(nextResults);

      const results = Object.values(nextResults);
      const passedCount = results.filter(result => result.passed).length;
      setOutput(
        [
          `Tests completed: ${passedCount}/${results.length} passed`,
          '',
          ...results.map((result, index) =>
            [
              `Test ${index + 1}: ${result.passed ? 'PASSED' : 'FAILED'}${result.isHidden ? ' (Hidden)' : ''}`,
              result.isHidden ? 'Details hidden for this test case.' : `Input: ${result.input || '(empty)'}`,
              result.isHidden ? null : `Expected: ${result.expected || '(empty)'}`,
              result.isHidden ? null : `Actual: ${result.actual || '(empty)'}`,
              `Status: ${result.message}`,
            ].filter(Boolean).join('\n')
          ),
        ].join('\n\n')
      );
    } finally {
      setRunningTests(false);
    }
  };

  if (loading) {
    return (
      <div className="github-code-editor">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="github-code-editor">
        <div className="error-state">
          <p>{error || 'Assignment not found'}</p>
          <button onClick={() => navigate(`/courses/${courseId}/assignments`)}>
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="github-code-editor">
      <div className="editor-header">
        <button className="back-btn" onClick={() => navigate(`/courses/${courseId}/assignments`)}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back
        </button>
        <div className="header-title">
          <h2>{assignment.title}</h2>
          <div className="header-meta">
            <span className="language-badge">{language}</span>
            {githubUsername && <span className="github-user">@{githubUsername}</span>}
          </div>
        </div>
        <div className="header-actions">
          <select
            value={language}
            onChange={event => setLanguage(event.target.value)}
            className="language-select"
          >
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
            <option value="javascript">JavaScript</option>
          </select>
        </div>
      </div>

      <div className="editor-layout">
        <aside className="left-panel">
          <div className="panel-section repo-selector">
            <div className="panel-section-header">
              <h3>Repository</h3>
            </div>
            {checkingStatus ? (
              <div className="loading-files">Checking GitHub status...</div>
            ) : !githubConnected ? (
              <div className="github-connect-prompt">
                <p>Connect your GitHub account to browse a repository.</p>
                <button className="btn btn-primary" onClick={initiateGitHubConnect}>
                  Connect GitHub
                </button>
              </div>
            ) : (
              <select
                value={selectedRepo?.id || ''}
                onChange={event => handleRepoChange(Number(event.target.value))}
                className="repo-select"
              >
                <option value="">Select a repository</option>
                {repos.map(repo => (
                  <option key={repo.id} value={repo.id}>
                    {repo.full_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="panel-section file-browser">
            <div className="panel-section-header">
              <h3>Files</h3>
              <button className="up-btn" onClick={handleGoUp} disabled={!breadcrumbSegments.length}>
                Up
              </button>
            </div>

            <div className="breadcrumbs">
              <button className="breadcrumb" onClick={() => navigateToBreadcrumb(-1)}>
                root
              </button>
              {breadcrumbSegments.map((segment, index) => (
                <button
                  key={`${segment}-${index}`}
                  className="breadcrumb"
                  onClick={() => navigateToBreadcrumb(index)}
                >
                  {segment}
                </button>
              ))}
            </div>

            {loadingFiles ? (
              <div className="loading-files">Loading files...</div>
            ) : (
              <div className="file-list">
                {!selectedRepo ? (
                  <p className="no-files">Choose a repository to start browsing.</p>
                ) : files.length === 0 ? (
                  <p className="no-files">No files found in this folder.</p>
                ) : (
                  files.map(file => (
                    <button
                      key={file.path}
                      type="button"
                      className={`file-item ${selectedFile?.path === file.path ? 'selected' : ''} ${file.type}`}
                      onClick={() => handleFileSelect(file)}
                    >
                      <span className="material-symbols-outlined">
                        {file.type === 'dir' ? 'folder' : 'description'}
                      </span>
                      <span className="file-name">{file.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>

        <aside className="right-panel">
          <div className="panel-section test-cases">
            <div className="panel-section-header">
              <h3>Test Cases</h3>
              <span className="tests-summary">
                {visibleTestCases.length} {visibleTestCases.length === 1 ? 'case' : 'cases'}
              </span>
            </div>

            <div className="test-list">
              {visibleTestCases.length === 0 ? (
                <p className="no-tests">No test cases available for this assignment.</p>
              ) : (
                visibleTestCases.map((testCase, index) => {
                  const result = testResults[testCase.id];
                  return (
                    <div
                      key={testCase.id}
                      className={`test-case ${result?.passed ? 'passed' : result ? 'failed' : ''} ${testCase.isHidden ? 'hidden-test' : ''}`}
                    >
                      <div className="test-header">
                        <span>
                          {testCase.isHidden ? 'Hidden Test Case' : `Test Case ${index + 1}`} - {testCase.questionTitle}
                        </span>
                        {result && (
                          <span className={`test-status ${result.passed ? 'passed' : 'failed'}`}>
                            {result.passed ? 'Passed' : 'Failed'}
                          </span>
                        )}
                      </div>
                      <div className="test-content">
                        {testCase.isHidden ? (
                          <p className="hidden-notice">Details are hidden for this test case.</p>
                        ) : (
                          <>
                            <div className="test-input">
                              <strong>Input</strong>
                              <pre>{testCase.input || '(empty)'}</pre>
                            </div>
                            <div className="test-output">
                              <strong>Expected</strong>
                              <pre>{testCase.expected || '(empty)'}</pre>
                            </div>
                            {result && (
                              <div className="test-output">
                                <strong>Actual</strong>
                                <pre>{result.actual || result.message}</pre>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="panel-actions">
            <button
              className="btn-run-tests"
              onClick={handleRunTests}
              disabled={runningTests || !selectedFile || !code.trim()}
            >
              {runningTests ? 'Running...' : 'Run Tests'}
            </button>
            <button
              className="btn-submit-file"
              onClick={handleSubmitFile}
              disabled={submittingFile || !selectedFile || selectedFile.type !== 'file'}
              style={{ marginLeft: '16px' }}
            >
              {submittingFile ? 'Submitting...' : 'Submit Selected File'}
            </button>
            <div className={`run-summary ${allTestsPassed ? 'passed' : ''}`}>
              {Object.keys(testResults).length === 0
                ? 'Run tests against the selected file.'
                : allTestsPassed
                  ? 'All tests passed (including hidden cases).'
                  : 'Some tests failed.'}
            </div>
          </div>
        </aside>

        <main className="main-panel code-viewer-panel" ref={codePanelRef}>
          {!selectedFile ? (
            <div className="no-file-selected">
              <span className="material-symbols-outlined">description</span>
              <p>Select any file from the repository to preview it.</p>
            </div>
          ) : (
            <>
              <div className="file-tabs">
                <span className="file-tab">{selectedFile.path}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="viewer-badge">View only</span>
                  <button className="tc-fullscreen-btn" onClick={toggleFullscreen}>
                    <span className="material-symbols-outlined">
                      {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                    </span>
                  </button>
                </div>
              </div>
              <div className="tc-code-content">
                {code || !fileMessage ? (
                  <div className="tc-code-block">
                    <div className="tc-line-numbers">
                      {code.split('\n').map((_, i) => (
                        <div key={i}>{i + 1}</div>
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
                              whiteSpace: 'pre', 
                              display: 'block' 
                            }}
                            dangerouslySetInnerHTML={{ __html: highlighted || ' ' }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="file-message">
                    <span className="material-symbols-outlined">info</span>
                    <p>{fileMessage}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <div className="output-console">
        <h3>Output</h3>
        <pre className="output-content">{output || 'Run tests to see output.'}</pre>
      </div>
    </div>
  );
}
