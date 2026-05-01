import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useCourse } from '../../context/CourseContext';
import { useToast } from '../../components/ToastProvider';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import TeacherCodeSubmissionViewer from '../../components/course/TeacherCodeSubmissionViewer';
import './CodeSubmissionView.css';

interface SubmissionData {
  id?: string | number;
  assignment_id?: number;
  code?: Array<Record<string, unknown>>;
  github?: {
    repo_url: string;
    repo_name: string;
    repo_description: string;
    repo_language: string;
  };
  [key: string]: unknown;
}

export default function SubmissionReview() {
  const { user } = useAuth();

  const token = localStorage.getItem('auth:token');

  const getAuthenticatedUrl = (fileId: string | number | undefined) => {
    if (!fileId) return '';
    return `/api/submissions/files/${fileId}/download?token=${token}`;
  };

  const getDriveFileId = (file: { drive_file_id?: string; storage_path?: string } | null) => {
    if (!file) return null;
    if (file.drive_file_id) return file.drive_file_id;
    const path = file.storage_path || '';
    if (path.startsWith('gdrive://')) {
      return path.replace(/^gdrive:\/\//, '');
    }
    const match = path.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
    if (match) return match[1];
    return null;
  };

  const { submissionId, assignmentId } = useParams<{
    submissionId: string;
    assignmentId: string;
  }>();
  const [searchParams] = useSearchParams();
  const { setCourseTitle } = useCourse();
  const toast = useToast();

  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [showSheetGrading, setShowSheetGrading] = useState(false);
  const [syncingToSheet, setSyncingToSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  const [deletingSheet, setDeletingSheet] = useState(false);
  const [assignment, setAssignment] = useState<any>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const isStudent = user?.role === 'student';

  const push = (opts: { kind?: 'success' | 'error' | string; message?: string }) => {
    if (toast && typeof (toast as unknown).push === 'function') {
      (toast as unknown).push(opts);
    } else {
      console.log(opts);
    }
  };

  const checkGoogleConnection = useCallback(async () => {
    try {
      const data = await apiFetch<{ connected: boolean }>('/api/auth/google/status');
      setGoogleConnected(data.connected);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg.includes('out of range') || errMsg.includes('invalid')) {
        try {
          await apiFetch('/api/auth/google/disconnect', { method: 'POST' });
        } catch {}
      }
      setGoogleConnected(false);
    }
  }, []);

  const loadSubmission = useCallback(async () => {
    if (!submissionId) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ submission: SubmissionData }>(
        `/api/submissions/${submissionId}`
      );
      console.log('Submission data:', JSON.stringify(data.submission, null, 2));
      if (data.submission.files) {
        console.log('Files:', JSON.stringify(data.submission.files, null, 2));
      }
      setSubmission(data.submission);
      setScore((data.submission.final_score as number) || (data.submission.score as number) || 0);
      setFeedback((data.submission.comments as string) || '');
      setError(null);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to load submission');
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  const handleSyncToSheet = async () => {
    if (!showSheetGrading) {
      push({ kind: 'error', message: 'Sync is locked. Please unlock the grading sheet first.' });
      return;
    }
    if (!submission || !assignmentId) return;
    setSyncingToSheet(true);
    try {
      await apiFetch(`/api/sheets/assignments/${assignmentId}/update-row`, {
        method: 'POST',
        body: {
          email: submission.student_email,
          score,
          comments: feedback
        },
      });
      push({ kind: 'success', message: 'Grading sheet updated successfully' });
    } catch (err) {
      console.error('Failed to sync to sheet:', err);
      push({ kind: 'error', message: 'Failed to update grading sheet. Ensure student is in the sheet.' });
    } finally {
      setSyncingToSheet(false);
    }
  };

  useEffect(() => {
    void loadSubmission();
    void checkGoogleConnection();

    if (searchParams.get('google_connected') === 'true') {
      sessionStorage.removeItem('google_oauth_return_url');
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
  }, [loadSubmission, checkGoogleConnection, searchParams]);

  useEffect(() => {
    if (submission) {
      setCourseTitle(`Submission ${submission.id} - Review`);
    } else {
      setCourseTitle('Submission Review');
    }

    return () => {
      setCourseTitle(null);
    };
  }, [submission, setCourseTitle]);

  const handleGrade = async (score: number, feedback: string) => {
    if (!submission?.id) return;
    if (!showSheetGrading) {
      push({ kind: 'error', message: 'Grading is locked. Please unlock the grading sheet first.' });
      return;
    }
    try {
      await apiFetch('/api/submissions/grade', {
        method: 'POST',
        body: {
          submission_id: submission.id,
          score,
          feedback,
        },
      });
      push({ kind: 'success', message: 'Submission graded successfully' });
      await loadSubmission();
    } catch (err: unknown) {
      push({ kind: 'error', message: (err as Error)?.message || 'Failed to grade submission' });
    }
  };

  const handleAuthorizeGoogle = async () => {
    try {
      sessionStorage.setItem('google_oauth_return_url', window.location.href);
      const data = await apiFetch<{ authUrl: string }>('/api/auth/google');
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      console.error('Failed to initiate Google OAuth:', err);
      push({ kind: 'error', message: 'Failed to initiate Google authorization' });
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
        setSheetUrl(data.spreadsheetUrl);
        window.open(data.spreadsheetUrl, '_blank');
        // Update assignment/submission state to show sheet exists
        setSubmission(prev => prev ? { ...prev, google_sheet_id: 'exists' } : null);
      }
    } catch (err: unknown) {
      console.error('Failed to get/create sheet:', err);
      push({ kind: 'error', message: (err as Error)?.message || 'Failed to open grading sheet' });
    } finally {
      setSheetLoading(false);
    }
  };

  const handleDeleteSheet = async () => {
    if (!assignmentId || !submission) return;
    // We need the assignment title. If we don't have it, we might need to fetch it.
    // For now, let's assume we can confirm with "DELETE" or fetch the assignment title.
    // Let's fetch the assignment title if we don't have it.
    let title = assignment?.title;
    if (!title) {
        try {
            const data = await apiFetch<any>(`/api/assignments/${assignmentId}`);
            setAssignment(data);
            title = data.title;
        } catch (err) {
            push({ kind: 'error', message: 'Failed to fetch assignment details for confirmation' });
            return;
        }
    }

    if (deleteConfirmTitle !== title) {
      push({ kind: 'error', message: 'Assignment title does not match. Deletion cancelled.' });
      return;
    }

    setDeletingSheet(true);
    try {
      await apiFetch(`/api/sheets/assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      setSubmission(prev => prev ? { ...prev, google_sheet_id: undefined } : null);
      setShowSheetGrading(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmTitle('');
      push({ kind: 'success', message: 'Grading sheet deleted successfully' });
    } catch (err) {
      console.error('Failed to delete grading sheet:', err);
      push({ kind: 'error', message: 'Failed to delete grading sheet' });
    } finally {
      setDeletingSheet(false);
    }
  };

  return (
    <div className="code-submission-view" style={{ minHeight: '100%' }}>
      {loading ? (
        <div className="code-submission-body">Loading submission...</div>
      ) : error ? (
        <div className="code-submission-body" style={{ color: '#dc2626' }}>
          {error}
        </div>
      ) : !submission ? (
        <div className="code-submission-body">No submission found.</div>
      ) : submission.github ? (
        <div className="github-submission-view">
          <div className="github-submission-header">
            <div className="github-icon">
              <svg viewBox="0 0 24 24" width="48" height="48">
                <path
                  fill="currentColor"
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02 .005 2.047 .138 3.006 .404 2.291-1.552 3.297-1.23 3.297-1.23 .653 1.653 .242 2.874 .118 3.176 .77 .84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921 .43 .372 .823 1.102 .823 2.222v3.293c0 .319 .192 .694 .801 .576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
            </div>
            <h2>GitHub Repository Submission</h2>
          </div>

          <div className="github-repo-details">
            <div className="repo-field">
              <span className="field-label">Repository Name</span>
              <span className="field-value">{submission.github.repo_name}</span>
            </div>
            <div className="repo-field">
              <span className="field-label">Repository URL</span>
              <a
                href={submission.github.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="repo-link"
              >
                {submission.github.repo_url}
                <span className="material-symbols-outlined">open_in_new</span>
              </a>
            </div>
            {submission.github.repo_description && (
              <div className="repo-field">
                <span className="field-label">Description</span>
                <span className="field-value">{submission.github.repo_description}</span>
              </div>
            )}
            {submission.github.repo_language && (
              <div className="repo-field">
                <span className="field-label">Language</span>
                <span className="field-value">{submission.github.repo_language}</span>
              </div>
            )}
          </div>

          <div className="github-actions">
            <a
              href={submission.github.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-open-repo"
            >
              <span className="material-symbols-outlined">open_in_new</span>
              Open Repository in GitHub
            </a>
          </div>
          {submission.google_sheet_id && !isStudent && (user?.role === 'teacher' || user?.role === 'ta') && (
            <div className="sheet-sync-status" style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid var(--primary)', marginTop: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>{showSheetGrading ? 'sync' : 'lock'}</span>
              <span style={{ fontWeight: 500 }}>
                {showSheetGrading 
                  ? 'Sync Mode Active. Grading is enabled and will sync to Google Sheet.' 
                  : 'Grading Locked. Unlock the grading sheet to enable grading.'}
              </span>
            </div>
          )}
        </div>
      ) : submission.code && submission.code.length > 0 ? (
        <>
          {(user?.role === 'teacher' || user?.role === 'ta') && (
            <div className="grading-management-bar" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--surface)',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)'
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

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="premium-action-btn"
                  onClick={() => setShowSheetGrading(!showSheetGrading)}
                  disabled={!submission?.google_sheet_id}
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
                    cursor: !submission?.google_sheet_id ? 'not-allowed' : 'pointer',
                    opacity: !submission?.google_sheet_id ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {showSheetGrading ? 'lock' : 'lock_open'}
                  </span>
                  {showSheetGrading ? 'Lock' : 'Unlock'}
                </button>

                {submission?.google_sheet_id ? (
                  <>
                    <button
                      className="premium-action-btn primary"
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
                      className="premium-action-btn danger"
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
                    className="premium-action-btn primary"
                    onClick={googleConnected ? handleOpenOrCreateSheet : handleAuthorizeGoogle}
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
          <TeacherCodeSubmissionViewer submission={submission} onGrade={handleGrade} push={push} isStudent={isStudent} />
        </>
      ) : (submission.files && (submission.files as any[]).length > 0) || submission.content ? (
        <div className="mixed-submission-review-container">
          {(user?.role === 'teacher' || user?.role === 'ta') && (
            <div className="grading-management-bar" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--surface)',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)'
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

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="premium-action-btn"
                  onClick={() => setShowSheetGrading(!showSheetGrading)}
                  disabled={!submission?.google_sheet_id}
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
                    cursor: !submission?.google_sheet_id ? 'not-allowed' : 'pointer',
                    opacity: !submission?.google_sheet_id ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {showSheetGrading ? 'lock' : 'lock_open'}
                  </span>
                  {showSheetGrading ? 'Lock' : 'Unlock'}
                </button>

                {submission?.google_sheet_id ? (
                  <>
                    <button
                      className="premium-action-btn primary"
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
                      className="premium-action-btn danger"
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
                    className="premium-action-btn primary"
                    onClick={googleConnected ? handleOpenOrCreateSheet : handleAuthorizeGoogle}
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
          <div className="mixed-submission-content-grid">
            <div className="mixed-submission-main">
              {submission.content && (
                <div className="submission-notes-section">
                  <h3>Submission Notes</h3>
                  <div className="notes-display-box">{submission.content as string}</div>
                </div>
              )}

              {submission.files && (submission.files as any[]).length > 0 && (
                <div className="submission-files-section">
                  <h3>Submitted Files</h3>
                  <div className="files-list-grid">
                    {(submission.files as any[]).map(file => (
                      <div
                        key={file.id}
                        className={`file-review-card ${selectedFile?.id === file.id ? 'active' : ''}`}
                        onClick={() => setSelectedFile(file)}
                      >
                        <div className="file-review-icon">
                          <span className="material-symbols-outlined">description</span>
                        </div>
                        <div className="file-review-info">
                          <span className="file-review-name">{file.filename}</span>
                          <span className="file-review-meta">
                            {file.mime_type} • {file.id}
                          </span>
                        </div>
                        <a
                          href={getAuthenticatedUrl(file.id)}
                          className="file-download-link"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="material-symbols-outlined">download</span>
                        </a>
                        {getDriveFileId(file) && (
                          <a
                            href={`https://drive.google.com/file/d/${getDriveFileId(file)}/preview?usp=drivesdk`}
                            className="file-drive-link"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Open in Google Drive viewer"
                          >
                            <span className="material-symbols-outlined">insert_drive_file</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      ) : (
        <div className="code-submission-body muted">
          No code or file submissions were found for this entry.
        </div>
      )}
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
              To confirm, please type the assignment title: <strong>{assignment?.title || 'fetching...'}</strong>
            </p>

            <input
              type="text"
              value={deleteConfirmTitle}
              onChange={(e) => setDeleteConfirmTitle(e.target.value)}
              placeholder="Type assignment title here..."
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                marginBottom: '24px', outline: 'none', fontSize: '14px', color: 'var(--text)'
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
    </div>
  );
}
