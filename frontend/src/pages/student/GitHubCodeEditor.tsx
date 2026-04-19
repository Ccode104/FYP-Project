import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/ToastProvider';
import Editor from '@monaco-editor/react';
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
}

interface TestResult {
  testIndex: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const languageMap: { [key: string]: string } = {
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  javascript: 'javascript',
  c: 'c',
};

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
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [hasChanges, setHasChanges] = useState(false);

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [runningTests, setRunningTests] = useState(false);
  const [output, setOutput] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [githubConnected, setGithubConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);

  const allTestsPassed = useMemo(() => {
    if (testResults.length === 0) return false;
    return testResults.every(tr => tr.passed);
  }, [testResults]);

  useEffect(() => {
    const checkGitHubStatus = async () => {
      try {
        const data = await apiFetch<{ connected: boolean; username?: string }>(
          '/api/github/status'
        );
        setGithubConnected(data.connected);
        setGithubUsername(data.username || null);
      } catch (e) {
        setGithubConnected(false);
      } finally {
        setCheckingStatus(false);
      }
    };
    checkGitHubStatus();
  }, []);

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
    } catch (err) {
      toast?.push?.({ kind: 'error', message: 'Failed to initiate GitHub connection' });
    }
  };

  useEffect(() => {
    if (!assignmentId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [assignmentData, reposData] = await Promise.all([
          apiFetch<AssignmentDetails>(`/api/assignments/${assignmentId}`),
          apiFetch<{ repositories: GitHubRepo[] }>('/api/github/repositories').catch(() => ({
            repositories: [],
          })),
        ]);

        setAssignment(assignmentData);
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
        const owner = selectedRepo.full_name.split('/')[0];
        const repoName = selectedRepo.full_name.split('/')[1];
        const data = await apiFetch<FileItem[]>(`/api/github/repos/${owner}/${repoName}/contents`);
        setFiles(data || []);
      } catch (err) {
        console.error('Failed to load files:', err);
        setFiles([]);
      } finally {
        setLoadingFiles(false);
      }
    };

    loadFiles();
  }, [selectedRepo]);

  useEffect(() => {
    if (!selectedFile || !selectedRepo) return;

    const loadFileContent = async () => {
      try {
        const owner = selectedRepo.full_name.split('/')[0];
        const repoName = selectedRepo.full_name.split('/')[1];
        const dataArray = await apiFetch<any[]>(
          `/api/github/repos/${owner}/${repoName}/contents/${selectedFile.path}`
        );
        if (dataArray && dataArray.length > 0) {
          const data = dataArray[0];
          if (data.content) {
            const decodedContent = atob(data.content);
            setCode(decodedContent);
            setHasChanges(false);
          }
        }
      } catch (err) {
        console.error('Failed to load file:', err);
        toast?.push?.({ kind: 'error', message: 'Failed to load file content' });
      }
    };

    loadFileContent();
  }, [selectedFile, selectedRepo]);

  const handleFileSelect = (file: FileItem) => {
    if (file.type === 'dir') {
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['py', 'java', 'cpp', 'c', 'js', 'ts'].includes(ext || '')) {
      return;
    }
    setSelectedFile(file);
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    setHasChanges(true);
  };

  const handleSaveToGitHub = async () => {
    if (!selectedRepo || !selectedFile || !code.trim()) return;

    setSaving(true);
    try {
      const owner = selectedRepo.full_name.split('/')[0];
      const repoName = selectedRepo.full_name.split('/')[1];

      await apiFetch(`/api/github/repos/${owner}/${repoName}/contents/${selectedFile.path}`, {
        method: 'PUT',
        body: {
          message: `Update ${selectedFile.name}`,
          content: btoa(code),
          branch: 'main',
        },
      });

      setHasChanges(false);
      toast?.push?.({ kind: 'success', message: 'File saved to GitHub' });
    } catch (err) {
      toast?.push?.({ kind: 'error', message: 'Failed to save file' });
    } finally {
      setSaving(false);
    }
  };

  const handleRunTests = async () => {
    if (!code.trim() || !assignment?.questions?.length) return;

    setRunningTests(true);
    setOutput('Running tests...\n');
    setTestResults([]);

    try {
      const allQuestions = assignment.questions;
      const results: TestResult[] = [];

      for (let i = 0; i < allQuestions.length; i++) {
        const question = allQuestions[i];
        const testCases = question.test_cases?.filter(tc => tc.is_sample) || [];

        for (let j = 0; j < testCases.length; j++) {
          const testCase = testCases[j];
          try {
            const execResult = await apiFetch<{ output: string; error?: string }>(
              '/api/code/execute',
              {
                method: 'POST',
                body: {
                  code,
                  language,
                  input: testCase.input_text,
                },
              }
            );

            const actual = execResult.output?.trim() || execResult.error || '';
            const expected = testCase.expected_text?.trim() || '';

            results.push({
              testIndex: j,
              input: testCase.input_text || '',
              expected,
              actual,
              passed: actual === expected,
            });
          } catch (err) {
            results.push({
              testIndex: j,
              input: testCase.input_text || '',
              expected: testCase.expected_text || '',
              actual: err instanceof Error ? err.message : 'Error',
              passed: false,
            });
          }
        }
      }

      setTestResults(results);
      const passedCount = results.filter(r => r.passed).length;
      const totalCount = results.length;
      setOutput(
        `Tests completed: ${passedCount}/${totalCount} passed\n\n${results
          .map(
            r =>
              `Test ${r.testIndex + 1}: ${r.passed ? 'PASSED' : 'FAILED'}\nInput: ${r.input}\nExpected: ${r.expected}\nActual: ${r.actual}`
          )
          .join('\n\n')}`
      );
    } catch (err) {
      setOutput(`Error running tests: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRunningTests(false);
    }
  };

  const handleSubmit = async () => {
    if (!assignmentId || !allTestsPassed) return;

    setSubmitting(true);
    try {
      await apiFetch('/api/submissions/submit/code', {
        method: 'POST',
        body: {
          assignment_id: Number(assignmentId),
          language,
          code,
          repo_url: selectedRepo?.html_url,
          file_path: selectedFile?.path,
        },
      });

      toast?.push?.({ kind: 'success', message: 'Assignment submitted successfully!' });
      navigate(`/courses/${courseId}/assignments`);
    } catch (err) {
      toast?.push?.({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to submit',
      });
    } finally {
      setSubmitting(false);
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
          <span className="language-badge">{language}</span>
        </div>
        <div className="header-actions">
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
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
        <div className="left-panel">
          <div className="panel-section repo-selector">
            <h3>Repository</h3>
            {checkingStatus ? (
              <div className="loading-files">Checking GitHub status...</div>
            ) : !githubConnected ? (
              <div className="github-connect-prompt">
                <p>Connect your GitHub account to select a repository</p>
                <button className="btn btn-primary" onClick={initiateGitHubConnect}>
                  Connect GitHub
                </button>
              </div>
            ) : (
              <select
                value={selectedRepo?.id || ''}
                onChange={e => {
                  const repo = repos.find(r => r.id === Number(e.target.value));
                  setSelectedRepo(repo || null);
                  setSelectedFile(null);
                  setCode('');
                  setFiles([]);
                }}
                className="repo-select"
              >
                <option value="">Select a repository</option>
                {repos.map(repo => (
                  <option key={repo.id} value={repo.id}>
                    {repo.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="panel-section file-browser">
            <h3>Files</h3>
            {loadingFiles ? (
              <div className="loading-files">Loading files...</div>
            ) : (
              <div className="file-list">
                {files.length === 0 ? (
                  <p className="no-files">No files found</p>
                ) : (
                  files.map(file => (
                    <div
                      key={file.path}
                      className={`file-item ${selectedFile?.path === file.path ? 'selected' : ''} ${file.type}`}
                      onClick={() => handleFileSelect(file)}
                    >
                      <span className="material-symbols-outlined">
                        {file.type === 'dir' ? 'folder' : 'description'}
                      </span>
                      <span className="file-name">{file.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="main-panel">
          {!selectedFile ? (
            <div className="no-file-selected">
              <span className="material-symbols-outlined">code</span>
              <p>Select a file to edit</p>
            </div>
          ) : (
            <>
              <div className="file-tabs">
                <span className="file-tab">
                  {selectedFile.name}
                  {hasChanges && <span className="unsaved-indicator">*</span>}
                </span>
              </div>
              <div className="code-editor-wrapper">
                <Editor
                  height="100%"
                  language={languageMap[language] || 'python'}
                  value={code}
                  onChange={handleCodeChange}
                  theme="vs-light"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    insertSpaces: true,
                    wordWrap: 'on',
                    folding: true,
                    lineDecorationsWidth: 10,
                    lineNumbersMinChars: 3,
                    renderWhitespace: 'selection',
                    cursorBlinking: 'blink',
                    cursorStyle: 'line',
                    contextmenu: true,
                    mouseWheelZoom: true,
                    scrollbar: {
                      vertical: 'visible',
                      horizontal: 'visible',
                      useShadows: false,
                    },
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div className="right-panel">
          <div className="panel-section test-cases">
            <h3>Test Cases</h3>
            <div className="test-list">
              {assignment.questions?.length === 0 ? (
                <p className="no-tests">No test cases available</p>
              ) : (
                assignment.questions?.map((q, qIdx) => (
                  <div key={q.id} className="question-tests">
                    <h4>
                      Question {qIdx + 1}: {q.title}
                    </h4>
                    {q.test_cases
                      ?.filter(tc => tc.is_sample)
                      .map((tc, tcIdx) => {
                        const result = testResults.find(r => r.testIndex === tcIdx);
                        return (
                          <div
                            key={tcIdx}
                            className={`test-case ${result?.passed ? 'passed' : result ? 'failed' : ''}`}
                          >
                            <div className="test-header">
                              <span>Test Case {tcIdx + 1}</span>
                              {result && (
                                <span
                                  className={`test-status ${result.passed ? 'passed' : 'failed'}`}
                                >
                                  {result.passed ? 'PASSED' : 'FAILED'}
                                </span>
                              )}
                            </div>
                            <div className="test-content">
                              <div className="test-input">
                                <strong>Input:</strong>
                                <pre>{tc.input_text}</pre>
                              </div>
                              <div className="test-output">
                                <strong>Expected:</strong>
                                <pre>{tc.expected_text}</pre>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel-actions">
            <button
              className="btn-run-tests"
              onClick={handleRunTests}
              disabled={runningTests || !code.trim() || !selectedFile}
            >
              {runningTests ? 'Running...' : 'Run Tests'}
            </button>
            <button
              className="btn-save"
              onClick={handleSaveToGitHub}
              disabled={saving || !hasChanges || !selectedFile}
            >
              {saving ? 'Saving...' : 'Save to GitHub'}
            </button>
            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={submitting || !allTestsPassed}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>

      <div className="output-console">
        <h3>Output</h3>
        <pre className="output-content">{output || 'Run tests to see output'}</pre>
      </div>
    </div>
  );
}
