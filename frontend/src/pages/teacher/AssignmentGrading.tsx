import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './AssignmentGrading.css';

interface Assignment {
  id: number;
  title: string;
  description?: string;
  assignment_type: string;
  max_score: number;
  due_at?: string;
  course_name?: string;
  course_code?: string;
  google_sheet_id?: string;
}

interface SubmissionFile {
  id: number;
  storage_path: string;
  filename: string;
  mime_type?: string;
  file_size?: number;
}

interface Submission {
  id: number;
  student_name: string;
  student_email: string;
  github_repo?: string;
  submitted_at?: string;
  score?: number;
  final_score?: number;
  status?: string;
  comments?: string;
  files?: SubmissionFile[];
  attempt?: number;
  content?: string;
  is_late?: boolean;
}

export default function AssignmentGrading() {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTA = user?.role === 'ta' || user?.role === 'TA';

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<SubmissionFile | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [fullSubmission, setFullSubmission] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'question' | 'file'>('question');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [showSheetGrading, setShowSheetGrading] = useState(false);
  const [syncingToSheet, setSyncingToSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  const [deletingSheet, setDeletingSheet] = useState(false);

  useEffect(() => {
    if (!courseId || !assignmentId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const assignmentData = await apiFetch<Assignment>(`/api/assignments/${assignmentId}`);
        setAssignment(assignmentData);
        setScore(assignmentData.max_score || 100);

        const submissionsEndpoint = isTA 
          ? `/api/ta/grading/${assignmentId}/submissions`
          : `/api/assignments/${assignmentId}/submissions`;

        const submissionsData = await apiFetch<{ submissions: Submission[] } | Submission[]>(
          submissionsEndpoint
        );
        
        let subs: Submission[] = [];
        if (Array.isArray(submissionsData)) {
          // TA endpoint returns array directly
          subs = submissionsData.map((s: any) => ({
            ...s,
            id: s.submission_id // Mapping TA-specific field names if needed
          }));
        } else {
          subs = submissionsData.submissions || [];
        }
        setSubmissions(subs);

        if (subs.length > 0) {
          const pending = subs.find(s => !s.final_score) || subs[0];
          setSelectedSubmission(pending);
        }

        // Fetch questions if it's a code/mixed assignment
        try {
          const questionsData = await apiFetch<any[]>(`/api/assignments/${assignmentId}/questions`);
          setQuestions(questionsData);
          if (questionsData.length > 0) {
            setCurrentQuestionId(questionsData[0].id);
            setViewMode('question');
          } else {
            setViewMode('file');
          }
        } catch (qErr) {
          console.error('Failed to load questions:', qErr);
          setViewMode('file');
        }
      } catch (err) {
        console.error('Failed to load:', err);
        setError('Failed to load assignment data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, assignmentId]);

  useEffect(() => {
    if (!selectedSubmission) return;

    const fetchFullSubmission = async () => {
      try {
        const data = await apiFetch<{ submission: any }>(`/api/submissions/${selectedSubmission.id}`);
        setFullSubmission(data.submission);
        setScore(data.submission.final_score || data.submission.score || 0);
        setFeedback(data.submission.comments || '');
        
        if (data.submission.files && data.submission.files.length > 0) {
          setSelectedFile(data.submission.files[0]);
        } else {
          setSelectedFile(null);
        }
      } catch (err) {
        console.error('Failed to fetch full submission:', err);
      }
    };

    void fetchFullSubmission();
  }, [selectedSubmission?.id]);

  useEffect(() => {
    const checkGoogle = async () => {
      try {
        const data = await apiFetch<{ connected: boolean }>('/api/auth/google/status');
        setGoogleConnected(data.connected);
      } catch {
        setGoogleConnected(false);
      }
    };
    void checkGoogle();
  }, []);

  const handleGrade = async (publish: boolean = false) => {
    if (!selectedSubmission) return;
    if (!showSheetGrading) {
      alert('Grading is locked. Please unlock the grading sheet first.');
      return;
    }

    setSaving(true);
    try {
      const gradingEndpoint = isTA
        ? `/api/ta/grading/submit`
        : `/api/assignments/submissions/${selectedSubmission.id}/grade`;
      
      const payload = isTA 
        ? {
            submissionId: selectedSubmission.id,
            score,
            comments: feedback,
            status: publish ? 'graded' : 'pending'
          }
        : {
            score,
            comments: feedback,
            status: publish ? 'graded' : 'pending',
          };

      await apiFetch(gradingEndpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSubmissions(prev =>
        prev.map(s =>
          s.id === selectedSubmission.id
            ? {
                ...s,
                final_score: score,
                comments: feedback,
                status: publish ? 'graded' : 'pending',
              }
            : s
        )
      );
      setSelectedSubmission(prev =>
        prev ? { ...prev, final_score: score, comments: feedback } : null
      );
    } catch (err) {
      console.error('Failed to grade:', err);
      setError('Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenOrCreateSheet = async () => {
    if (!assignmentId) return;
    setSheetLoading(true);
    try {
      const data = await apiFetch<{ spreadsheetUrl: string }>(
        `/api/sheets/assignments/${assignmentId}`
      );
      if (data.spreadsheetUrl) {
        window.open(data.spreadsheetUrl, '_blank');
        // Update assignment state to reflect sheet exists
        setAssignment(prev => prev ? { ...prev, google_sheet_id: 'pending_recheck' } : null);
        // Better: re-fetch or just set a truthy value since we know it exists now
      }
    } catch (err) {
      console.error('Failed to get/create sheet:', err);
      alert('Failed to open grading sheet');
    } finally {
      setSheetLoading(false);
    }
  };

  const handleDeleteSheet = async () => {
    if (!assignmentId || !assignment) return;
    if (deleteConfirmTitle !== assignment.title) {
      alert('Assignment title does not match. Deletion cancelled.');
      return;
    }

    setDeletingSheet(true);
    try {
      await apiFetch(`/api/sheets/assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      setAssignment(prev => prev ? { ...prev, google_sheet_id: undefined } : null);
      setShowSheetGrading(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmTitle('');
      alert('Grading sheet deleted successfully');
    } catch (err) {
      console.error('Failed to delete grading sheet:', err);
      alert('Failed to delete grading sheet');
    } finally {
      setDeletingSheet(false);
    }
  };

  const handleSyncToSheet = async () => {
    if (!selectedSubmission || !assignmentId) return;
    if (!showSheetGrading) {
      alert('Sync is locked. Please unlock the grading sheet first.');
      return;
    }
    setSyncingToSheet(true);
    try {
      await apiFetch(`/api/sheets/assignments/${assignmentId}/update-row`, {
        method: 'POST',
        body: {
          email: selectedSubmission.student_email,
          score: score,
          comments: feedback
        },
      });
      alert('Grading sheet updated successfully!');
    } catch (err) {
      console.error('Failed to sync to sheet:', err);
      alert('Failed to update grading sheet. Ensure the student is in the sheet.');
    } finally {
      setSyncingToSheet(false);
    }
  };

  const getFileIcon = (mimeType?: string, filename?: string) => {
    if (mimeType?.includes('pdf') || filename?.toLowerCase().endsWith('.pdf')) {
      return { icon: 'description', color: 'rose' };
    }
    if (mimeType?.includes('python') || filename?.toLowerCase().endsWith('.py')) {
      return { icon: 'code', color: 'blue' };
    }
    if (mimeType?.includes('image') || filename?.match(/\.(png|jpg|jpeg|gif)$/i)) {
      return { icon: 'image', color: 'emerald' };
    }
    if (mimeType?.includes('ppt') || filename?.toLowerCase().endsWith('.pptx')) {
      return { icon: 'slideshow', color: 'orange' };
    }
    return { icon: 'description', color: 'slate' };
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (filename?: string) => {
    if (!filename) return '';
    const ext = filename.split('.').pop()?.toUpperCase() || '';
    return ext;
  };

  const isPDF = (mimeType?: string, filename?: string) => {
    if (mimeType?.includes('pdf')) return true;
    if (filename?.toLowerCase().endsWith('.pdf')) return true;
    return false;
  };

  const getSubmissionFiles = () => {
    if (!selectedSubmission?.files || selectedSubmission.files.length === 0) return [];
    return selectedSubmission.files;
  };

  const renderFilePreview = () => {
    // If it's a code assignment and we are in question view mode
    if (viewMode === 'question' && questions.length > 0 && currentQuestionId) {
      const questionCode = fullSubmission?.code?.find((c: any) => c.assignment_question_id === currentQuestionId || c.question_id === currentQuestionId);
      
      return (
        <div className="code-preview-container" style={{ padding: '24px', background: 'var(--slate-900, #1e293b)', borderRadius: '12px', height: '100%', overflow: 'auto' }}>
          <div className="code-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: '#94a3b8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>code</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Code Submission</span>
            </div>
            <span style={{ fontSize: '12px', background: '#334155', padding: '4px 8px', borderRadius: '4px' }}>{questionCode?.language || 'python'}</span>
          </div>
          {questionCode ? (
            <pre style={{ margin: 0, color: '#e2e8f0', fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', lineHeight: '1.6' }}>
              <code>{questionCode.code}</code>
            </pre>
          ) : (
            <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '100px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px' }}>code_off</span>
              <p>No code submitted for this question yet.</p>
            </div>
          )}
        </div>
      );
    }

    if (!selectedFile) {
      if (questions.length > 0) {
        return (
          <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '100px' }}>
            <p>Select a question from the header or a file below to preview.</p>
          </div>
        );
      }
      return null;
    }

    // Handle GitHub type - show repo link
    if (
      selectedFile.filename === 'repository' ||
      selectedFile.storage_path?.includes('github.com')
    ) {
      return (
        <div className="github-preview">
          <div className="github-repo-card">
            <span className="material-symbols-outlined">inventory_2</span>
            <h3>GitHub Repository</h3>
            <p className="repo-url">{selectedFile.storage_path}</p>
            <a
              href={selectedFile.storage_path}
              target="_blank"
              rel="noopener noreferrer"
              className="repo-open-link"
            >
              <span className="material-symbols-outlined">open_in_new</span>
              Open Repository
            </a>
          </div>
        </div>
      );
    }

    if (isPDF(selectedFile.mime_type, selectedFile.filename)) {
      return (
        <div className="file-pdf-preview">
          <div className="pdf-preview-header">
            <a
              href={selectedFile.storage_path}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-open-link"
            >
              <span className="material-symbols-outlined">open_in_new</span>
              Open PDF in New Tab
            </a>
          </div>
          <div className="pdf-embed-container">
            <iframe src={selectedFile.storage_path} title="PDF Viewer" className="pdf-iframe" />
          </div>
        </div>
      );
    }

    if (
      selectedFile.mime_type?.includes('image') ||
      selectedFile.filename?.match(/\.(png|jpg|jpeg|gif)$/i)
    ) {
      return (
        <div className="file-image-preview">
          <img src={selectedFile.storage_path} alt={selectedFile.filename} />
        </div>
      );
    }

    return (
      <div className="file-generic-preview">
        <span className="material-symbols-outlined">description</span>
        <p>Preview not available</p>
        <a
          href={selectedFile.storage_path}
          target="_blank"
          rel="noopener noreferrer"
          className="preview-link"
        >
          Open in new tab
        </a>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="grading-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="submission-review-page">
      {/* Top Header */}
      <header className="submission-header">
        <div className="header-left">
          <div className="header-course">
            {assignment?.course_code}: {assignment?.course_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 className="header-title">{assignment?.title}</h1>
            {questions.length > 0 && (
              <div className="header-question-selector" style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Reviewing:</span>
                <select 
                  value={viewMode === 'question' ? currentQuestionId || '' : ''} 
                  onChange={(e) => {
                    setCurrentQuestionId(Number(e.target.value));
                    setViewMode('question');
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                >
                  <option value="" disabled>{viewMode === 'file' ? 'Switch to Question...' : 'Select Question...'}</option>
                  {questions.map((q, idx) => (
                    <option key={q.id} value={q.id} style={{ background: '#1e293b' }}>
                      Q{idx + 1}: {q.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="header-meta">
            {!isTA && <span className="student-name">{selectedSubmission?.student_name}</span>}
            {!isTA && <span className="separator">•</span>}
            <span className="submit-date">
              {selectedSubmission?.submitted_at
                ? new Date(selectedSubmission.submitted_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'N/A'}
            </span>
            {selectedSubmission?.is_late && <span className="late-badge">Late</span>}
          </div>
        </div>
        <div className="header-right">
          <button
            className="nav-btn"
            onClick={() => {
              const currentIndex = submissions.findIndex(s => s.id === selectedSubmission?.id);
              if (currentIndex > 0) {
                const prev = submissions[currentIndex - 1];
                setSelectedSubmission(prev);
                setScore(prev.final_score || prev.score || 0);
                setFeedback(prev.comments || '');
                if (prev.files && prev.files.length > 0) {
                  setSelectedFile(prev.files[0]);
                }
              }
            }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            className="nav-btn"
            onClick={() => {
              const currentIndex = submissions.findIndex(s => s.id === selectedSubmission?.id);
              if (currentIndex < submissions.length - 1) {
                const next = submissions[currentIndex + 1];
                setSelectedSubmission(next);
                setScore(next.final_score || next.score || 0);
                setFeedback(next.comments || '');
                if (next.files && next.files.length > 0) {
                  setSelectedFile(next.files[0]);
                }
              }
            }}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="submission-workspace">
        {/* Content Panel */}
        <div className="content-panel">
          {/* Files Section */}
          <section className="files-section">
            <h3 className="section-title">Submission</h3>
            {selectedSubmission?.repo_url ? (
              <div
                className="github-repo-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '24px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="github-icon" style={{ marginBottom: '12px' }}>
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02 .005 2.047 .138 3.006 .404 2.291-1.552 3.297-1.23 3.297-1.23 .653 1.653 .242 2.874 .118 3.176 .77 .84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921 .43 .372 .823 1.102 .823 2.222v3.293c0 .319 .192 .694 .801 .576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </div>
                <h3>GitHub Repository Submission</h3>
                {selectedSubmission.repo_name && (
                  <p>
                    <strong>{selectedSubmission.repo_name}</strong>
                  </p>
                )}
                <p
                  className="repo-url"
                  style={{ wordBreak: 'break-all', textAlign: 'center', margin: '8px 0' }}
                >
                  {selectedSubmission.repo_url}
                </p>
                <a
                  href={selectedSubmission.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="repo-open-link repo-open-link--compact"
                >
                  <span className="material-symbols-outlined">open_in_new</span>
                  Open Repository
                </a>
              </div>
            ) : (
              <>
                <div className="files-grid">
                  {getSubmissionFiles().map((file, idx) => {
                    const { icon, color } = getFileIcon(file.mime_type, file.filename);
                    return (
                      <div
                        key={file.id}
                        className={`file-card ${viewMode === 'file' && selectedFile?.id === file.id ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedFile(file);
                          setViewMode('file');
                        }}
                      >
                        <div
                          className={`file-icon ${color}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span className="material-symbols-outlined">{icon}</span>
                        </div>
                        <div className="file-details">
                          <p className="file-name" title={file.filename}>
                            {file.filename}
                          </p>
                          <p className="file-meta">
                            {formatFileSize(file.file_size)} • {getFileExtension(file.filename)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {getSubmissionFiles().length === 0 && (
                    <p className="no-files">No files submitted</p>
                  )}
                </div>
              </>
            )}
          </section>

          {/* File Preview */}
          {selectedFile && (
            <section className="preview-section">
              <div className="preview-header">
                <h3 className="section-title">Submission Content</h3>
                <button className="expand-btn">Expand</button>
              </div>
              <div className="preview-content">{renderFilePreview()}</div>
            </section>
          )}

          {/* Student Comments */}
          {selectedSubmission?.content && (
            <section className="comments-section">
              <h3 className="section-title">Student Comments</h3>
              <div className="student-comments">
                <p>{selectedSubmission.content}</p>
              </div>
            </section>
          )}

          {/* History */}
          <section className="history-section">
            <h3 className="section-title">History</h3>
            <div className="history-list">
              {submissions
                .filter(s => s.attempt)
                .map((sub, idx) => (
                  <div
                    key={sub.id}
                    className={`history-item ${idx === 0 ? 'latest' : ''}`}
                    onClick={() => {
                      setSelectedSubmission(sub);
                      setScore(sub.final_score || sub.score || 0);
                      setFeedback(sub.comments || '');
                      if (sub.files && sub.files.length > 0) {
                        setSelectedFile(sub.files[0]);
                      }
                    }}
                  >
                    <span className={`dot ${idx === 0 ? 'active' : ''}`}></span>
                    <span className="attempt-label">
                      Attempt {sub.attempt} {idx === 0 ? '(Latest)' : ''}
                    </span>
                    <span className="attempt-date">
                      {sub.submitted_at
                        ? new Date(sub.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : ''}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        </div>

        {/* Grading Sidebar */}
        <aside className="grading-sidebar-panel">
          <div className="sidebar-section">
            {!isTA && (
              <div className="grading-management-bar" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                background: 'var(--surface)',
                padding: '16px 20px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                animation: 'slideDown 0.4s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>analytics</span>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Grading Management</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minWidth: 0 }}>
                  <button
                    className="premium-action-btn"
                    onClick={() => setShowSheetGrading(!showSheetGrading)}
                    disabled={!assignment?.google_sheet_id}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid ' + (showSheetGrading ? 'var(--primary)' : 'var(--border)'),
                      background: showSheetGrading ? 'var(--primary)' : 'var(--surface)',
                      color: showSheetGrading ? 'white' : 'var(--text)',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: !assignment?.google_sheet_id ? 'not-allowed' : 'pointer',
                      opacity: !assignment?.google_sheet_id ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showSheetGrading ? 'lock' : 'lock_open'}
                    </span>
                    {showSheetGrading ? 'Lock' : 'Unlock'}
                  </button>

                  {assignment?.google_sheet_id ? (
                    <>
                      <button
                        onClick={handleOpenOrCreateSheet}
                        disabled={sheetLoading}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, var(--primary), #4338ca)',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                        {sheetLoading ? 'Opening...' : 'Open Sheet'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={deletingSheet}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: '1px solid rgba(220, 38, 38, 0.2)',
                          background: 'rgba(220, 38, 38, 0.05)',
                          color: '#dc2626',
                          fontSize: '13px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete_forever</span>
                        Delete Sheet
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleOpenOrCreateSheet}
                      disabled={sheetLoading}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, var(--primary), #4338ca)',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_table</span>
                      {sheetLoading ? 'Creating...' : 'Create Sheet'}
                    </button>
                  )}
                </div>
              </div>
            )}

              {showSheetGrading && (
                <div className="sheet-sync-status" style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid var(--primary)', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeIn 0.3s ease' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>{showSheetGrading ? 'sync' : 'lock'}</span>
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>
                  {showSheetGrading
                    ? 'Sync Mode Active. Grading is enabled and will sync to Google Sheet.'
                    : 'Grading Locked. Unlock the grading sheet above to enable grading.'}
                </span>
              </div>
              )}
            <div className="grading-panel-card" style={{ opacity: showSheetGrading ? 1 : 0.7, pointerEvents: showSheetGrading ? 'all' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>Grading & Feedback</h3>
                  {!showSheetGrading && (
                    <span className="material-symbols-outlined" style={{ color: '#dc2626' }}>lock</span>
                  )}
                </div>

              <fieldset disabled={!showSheetGrading} style={{ border: 'none', padding: 0, margin: 0 }}>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleGrade(score, feedback);
                }}
              >
                <div className="form-group">
                  <label>Marks (out of 100)</label>
                  <input
                    type="number"
                    name="score"
                    value={score}
                    onChange={e => setScore(Number(e.target.value))}
                    min="0"
                    max="100"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Comment / Feedback</label>
                  <textarea
                    name="feedback"
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    rows={6}
                    placeholder="Enter feedback for the student..."
                  />
                </div>
                <button type="submit" className="btn-grade-submit">
                  Submit Grade
                </button>

                {showSheetGrading && (
                  <button
                    type="button"
                    className="btn-grade-submit"
                    onClick={handleSyncToSheet}
                    disabled={syncingToSheet}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'var(--primary)',
                      marginTop: '12px'
                    }}
                  >
                    <span className="material-symbols-outlined">sync</span>
                    {syncingToSheet ? 'Syncing...' : 'Update Google Sheet'}
                  </button>
                )}
              </form>
              </fieldset>
            </div>
          </div>
        </aside>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content" style={{
            background: 'var(--surface)', padding: '32px', borderRadius: '16px',
            width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>warning</span>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Delete Grading Sheet?</h2>
            </div>
            
            <p style={{ color: 'var(--muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              This will permanently delete the Google Sheet and remove all grading data synced to it. 
              To confirm, please type the assignment title: <strong>{assignment?.title}</strong>
            </p>

            <input
              type="text"
              value={deleteConfirmTitle}
              onChange={(e) => setDeleteConfirmTitle(e.target.value)}
              placeholder="Type assignment title here..."
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                marginBottom: '24px', outline: 'none', fontSize: '14px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmTitle('');
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDeleteSheet}
                disabled={deletingSheet || deleteConfirmTitle !== assignment?.title}
              >
                {deletingSheet ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="submission-footer">
        <span>© 2024 Unified Academic</span>
        <div className="footer-links">
          <a href="#">Support</a>
          <a href="#">Legal</a>
        </div>
      </footer>
    </div>
  );
}
