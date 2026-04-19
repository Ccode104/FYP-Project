import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { createLiveLecture } from '../features/live-lecture/api/liveLectures';

interface LiveLectureBroadcasterProps {
  courseOfferingId: string;
  onLectureCreated: () => void;
  onClose: () => void;
}

const LiveLectureBroadcaster: React.FC<LiveLectureBroadcasterProps> = ({
  courseOfferingId,
  onLectureCreated,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [isLoading, setIsLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkGoogleConnection = async () => {
      try {
        const data = await apiFetch<{ connected: boolean }>('/api/auth/google/status');
        setGoogleConnected(data.connected);
      } catch {
        setGoogleConnected(false);
      } finally {
        setConnectionChecked(true);
      }
    };

    void checkGoogleConnection();
  }, []);

  const handleAuthorizeGoogle = async () => {
    try {
      setGoogleLoading(true);
      sessionStorage.setItem('google_oauth_return_url', window.location.href);
      const data = await apiFetch<{ authUrl: string }>('/api/auth/google');
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Failed to connect Google account');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Please enter a lecture title.');
      return;
    }

    if (!scheduledAt) {
      setError('Please choose the lecture date and time.');
      return;
    }

    if (!googleConnected) {
      setError('Connect your Google account before scheduling a Meet lecture.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await createLiveLecture({
        title: title.trim(),
        description: description.trim() || undefined,
        course_offering_id: Number.parseInt(courseOfferingId, 10),
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: Number.parseInt(durationMinutes, 10) || 60,
      });

      onLectureCreated();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to schedule lecture');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="live-lecture-broadcaster">
      {!connectionChecked ? (
        <p className="muted">Checking Google Calendar connection...</p>
      ) : (
        <>
          <div
            style={{
              marginBottom: '16px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: googleConnected ? 'var(--bg-secondary)' : '#fff7e6',
              border: `1px solid ${googleConnected ? 'var(--border)' : '#f5c26b'}`,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>
              {googleConnected ? 'Google Calendar connected' : 'Google Calendar required'}
            </div>
            <div className="muted" style={{ marginBottom: googleConnected ? 0 : '10px' }}>
              Scheduling creates a real Google Meet event and sends invites to enrolled students.
            </div>
            {!googleConnected && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAuthorizeGoogle}
                disabled={googleLoading}
              >
                {googleLoading ? 'Connecting...' : 'Connect Google Calendar'}
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Lecture title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Graph Theory Revision"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What will be covered in this session?"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                  Starts at
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#fff1f0',
                  border: '1px solid #ffccc7',
                  color: '#a8071a',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} disabled={isLoading} className="btn">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !googleConnected}
                className="btn btn-primary"
              >
                {isLoading ? 'Scheduling...' : 'Schedule Google Meet'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default LiveLectureBroadcaster;
