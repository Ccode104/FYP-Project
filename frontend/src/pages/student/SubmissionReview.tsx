import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useCourse } from '../../context/CourseContext';
import { useToast } from '../../components/ToastProvider';
import { apiFetch } from '../../services/api';
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
      setSubmission(data.submission);
      setError(null);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to load submission');
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

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
      }
    } catch (err: unknown) {
      console.error('Failed to get/create sheet:', err);
      push({ kind: 'error', message: (err as Error)?.message || 'Failed to open grading sheet' });
    } finally {
      setSheetLoading(false);
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

            <button
              className="btn-sheet"
              onClick={googleConnected ? handleOpenOrCreateSheet : handleAuthorizeGoogle}
              disabled={sheetLoading}
            >
              <span className="material-symbols-outlined">table_chart</span>
              {sheetLoading
                ? 'Loading...'
                : !googleConnected
                  ? 'Authorize Google Sheets'
                  : 'Open Grading Sheet'}
            </button>
          </div>
        </div>
      ) : submission.code && submission.code.length > 0 ? (
        <>
          <div className="submission-actions-bar">
            <button
              className="btn-sheet"
              onClick={googleConnected ? handleOpenOrCreateSheet : handleAuthorizeGoogle}
              disabled={sheetLoading}
            >
              <span className="material-symbols-outlined">table_chart</span>
              {sheetLoading
                ? 'Loading...'
                : !googleConnected
                  ? 'Authorize Google Sheets'
                  : 'Open Grading Sheet'}
            </button>
          </div>
          <TeacherCodeSubmissionViewer submission={submission} onGrade={handleGrade} push={push} />
        </>
      ) : (
        <div className="code-submission-body muted">
          No code submissions were found for this entry.
        </div>
      )}
    </div>
  );
}
