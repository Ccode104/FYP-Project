import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../../components/ToastProvider';
import { apiFetch } from '../../services/api';
import { getQuizResultsSheet, getQuizResultsSummary, type QuizResultsSummary } from '../../features/quizzes/api/quizzes';

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return Number(value).toFixed(1);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

export default function QuizResultsPage() {
  const { quizId } = useParams();
  const { push } = useToast();

  const [data, setData] = useState<QuizResultsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!quizId) return;
      setLoading(true);
      try {
        const [summary, googleStatus] = await Promise.all([
          getQuizResultsSummary(Number(quizId)),
          apiFetch<{ connected: boolean }>('/api/auth/google/status').catch(() => ({ connected: false })),
        ]);

        if (cancelled) return;
        setData(summary);
        setGoogleConnected(Boolean(googleStatus.connected));
      } catch (error) {
        console.error('Failed to load quiz results:', error);
        if (!cancelled) {
          push({ kind: 'error', message: (error as Error)?.message || 'Failed to load quiz results' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [quizId, push]);

  useEffect(() => {
    let cancelled = false;

    async function ensureSheet() {
      if (!quizId || !googleConnected) return;
      try {
        const response = await getQuizResultsSheet(Number(quizId));
        if (!cancelled) {
          setSheetUrl(response.spreadsheetUrl);
        }
      } catch (error) {
        console.error('Failed to load quiz sheet:', error);
      }
    }

    void ensureSheet();
    return () => {
      cancelled = true;
    };
  }, [quizId, googleConnected]);

  const attemptStats = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Total Attempts', value: String(data.summary.total_attempts) },
      { label: 'Average Score', value: formatScore(data.summary.average_score) },
      { label: 'Highest Score', value: formatScore(data.summary.highest_score) },
      { label: 'Pass Rate', value: data.summary.pass_rate === null ? 'N/A' : `${data.summary.pass_rate.toFixed(1)}%` },
      { label: 'Lowest Score', value: formatScore(data.summary.lowest_score) },
    ];
  }, [data]);

  const handleOpenSheet = async () => {
    if (!quizId) return;
    setSheetLoading(true);
    try {
      const response = await getQuizResultsSheet(Number(quizId));
      setSheetUrl(response.spreadsheetUrl);
      window.open(response.spreadsheetUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open quiz sheet:', error);
      push({ kind: 'error', message: (error as Error)?.message || 'Failed to open quiz sheet' });
    } finally {
      setSheetLoading(false);
    }
  };

  if (loading) {
    return <div className="container"><p className="muted">Loading quiz results...</p></div>;
  }

  if (!data) {
    return <div className="container"><p className="muted">Quiz results not found.</p></div>;
  }

  return (
    <div className="container" style={{ maxWidth: 1200 }}>
      <header className="topbar" style={{ marginBottom: 16 }}>
        <div>
          <h2>{data.quiz.title}</h2>
          <div className="muted">
            {data.quiz.course_code} - {data.quiz.course_title}
          </div>
        </div>
        <div className="muted">Google Form quiz results</div>
      </header>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="muted">Availability</div>
            <div>{formatDateTime(data.quiz.start_at)} to {formatDateTime(data.quiz.end_at)}</div>
          </div>
          <div>
            <div className="muted">Max Score</div>
            <div>{data.quiz.max_score}</div>
          </div>
          <div>
            <div className="muted">Mode</div>
            <div>Google Form responses</div>
          </div>
          <div>
            <div className="muted">Google Marks Sheet</div>
            {googleConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={handleOpenSheet} disabled={sheetLoading}>
                  {sheetLoading ? 'Opening...' : 'Open Sheet'}
                </button>
                {sheetUrl && (
                  <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="muted">
                    Sheet ready
                  </a>
                )}
              </div>
            ) : (
              <div className="muted">Connect Google in your profile to generate the marks sheet.</div>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {attemptStats.map(stat => (
          <div key={stat.label} className="card">
            <div className="muted" style={{ marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {data.quiz.google_form_url && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="muted" style={{ marginBottom: 6 }}>Linked Google Form</div>
          <div style={{ wordBreak: 'break-all' }}>{data.quiz.google_form_url}</div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Attempts</h3>
          <span className="muted">{data.attempts.length} records</span>
        </div>

        {data.attempts.length === 0 ? (
          <p className="muted">No attempts yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Submitted</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.attempts.map(attempt => (
                  <tr key={attempt.id}>
                    <td>
                      <div>{attempt.student_name || 'Unknown'}</div>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>{attempt.student_email}</div>
                    </td>
                    <td>{formatDateTime(attempt.finished_at || attempt.started_at)}</td>
                    <td>
                      {attempt.score === null || attempt.score === undefined
                        ? 'Pending'
                        : `${formatScore(attempt.score)} / ${data.quiz.max_score}`}
                    </td>
                    <td>
                      {attempt.violated ? 'Violated' : attempt.suspended_at ? 'Suspended' : 'Completed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
