import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  endLiveLecture,
  getLiveLectureById,
  joinLiveLecture,
  type LiveLecture,
  type LiveLectureParticipant,
  type LiveLectureStats,
} from '../../features/live-lecture/api/liveLectures';

const emptyStats: LiveLectureStats = {
  total_participants: 0,
  active_participants: 0,
  total_attendance_minutes: 0,
  average_attendance_minutes: 0,
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Not available';
  }
  return new Date(value).toLocaleString();
}

const LiveLecturePage: React.FC = () => {
  const { courseId, lectureId } = useParams<{ courseId: string; lectureId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lecture, setLecture] = useState<LiveLecture | null>(null);
  const [participants, setParticipants] = useState<LiveLectureParticipant[]>([]);
  const [stats, setStats] = useState<LiveLectureStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const isStaff = user?.role === 'teacher' || user?.role === 'ta';
  const lectureIdNumber = Number.parseInt(lectureId || '', 10);

  const loadLecture = useCallback(async () => {
    if (!Number.isFinite(lectureIdNumber)) {
      setError('Invalid lecture id.');
      setLoading(false);
      return;
    }

    try {
      const data = await getLiveLectureById(lectureIdNumber);
      setLecture(data.lecture);
      setParticipants(data.participants);
      setStats(data.stats);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load lecture');
    } finally {
      setLoading(false);
    }
  }, [lectureIdNumber]);

  useEffect(() => {
    void loadLecture();
  }, [loadLecture]);

  useEffect(() => {
    if (!lectureIdNumber || !lecture || lecture.status === 'ended') {
      return;
    }

    const interval = window.setInterval(() => {
      void loadLecture();
    }, 20000);

    return () => window.clearInterval(interval);
  }, [lecture, lectureIdNumber, loadLecture]);

  const handleJoin = async () => {
    if (!lecture) {
      return;
    }

    try {
      setActionLoading(true);
      const result = await joinLiveLecture(lecture.id);
      setLecture(result.lecture);
      window.open(result.meeting_url, '_blank', 'noopener,noreferrer');
      await loadLecture();
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Failed to join lecture');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!lecture) {
      return;
    }

    try {
      setActionLoading(true);
      const result = await endLiveLecture(lecture.id);
      setLecture(result.lecture);
      await loadLecture();
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : 'Failed to end lecture');
    } finally {
      setActionLoading(false);
    }
  };

  const pageTitle = useMemo(() => {
    if (!lecture) {
      return 'Live Lecture';
    }
    return lecture.title;
  }, [lecture]);

  if (!courseId || !lectureId || !user) {
    return <div>Loading...</div>;
  }

  if (loading) {
    return <div className="loading-spinner">Loading live lecture...</div>;
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gap: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '16px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <button className="btn" onClick={() => navigate(`/courses/${courseId}/live-lectures`)}>
            Back to Live Lectures
          </button>
          <h1 style={{ margin: '14px 0 8px' }}>{pageTitle}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {lecture?.description || 'Google Meet lecture for this course offering.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {lecture && lecture.status !== 'ended' && (
            <button className="btn btn-primary" onClick={handleJoin} disabled={actionLoading}>
              {actionLoading ? 'Opening...' : isStaff ? 'Open Meet' : 'Join Meet'}
            </button>
          )}
          {isStaff && lecture?.status !== 'ended' && (
            <button className="btn btn-danger" onClick={handleEnd} disabled={actionLoading}>
              End Lecture
            </button>
          )}
          {lecture?.google_calendar_event_url && (
            <a
              className="btn btn-secondary"
              href={lecture.google_calendar_event_url}
              target="_blank"
              rel="noreferrer"
            >
              Open Calendar Event
            </a>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: '#fff1f0',
            border: '1px solid #ffccc7',
            color: '#a8071a',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="card">
          <h3>Status</h3>
          <p style={{ margin: '8px 0 0', textTransform: 'capitalize' }}>{lecture?.status}</p>
        </div>
        <div className="card">
          <h3>Scheduled</h3>
          <p style={{ margin: '8px 0 0' }}>{formatDateTime(lecture?.scheduled_at)}</p>
        </div>
        <div className="card">
          <h3>Started</h3>
          <p style={{ margin: '8px 0 0' }}>{formatDateTime(lecture?.started_at)}</p>
        </div>
        <div className="card">
          <h3>Ended</h3>
          <p style={{ margin: '8px 0 0' }}>{formatDateTime(lecture?.ended_at)}</p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="card">
          <h3>Total Participants</h3>
          <p style={{ margin: '8px 0 0' }}>{stats.total_participants}</p>
        </div>
        <div className="card">
          <h3>Active Right Now</h3>
          <p style={{ margin: '8px 0 0' }}>{stats.active_participants}</p>
        </div>
        <div className="card">
          <h3>Total Attendance</h3>
          <p style={{ margin: '8px 0 0' }}>{stats.total_attendance_minutes} min</p>
        </div>
        <div className="card">
          <h3>Average Attendance</h3>
          <p style={{ margin: '8px 0 0' }}>{stats.average_attendance_minutes} min</p>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>
          {lecture?.status === 'ended' ? 'Participants and Attendance' : 'Current Participants'}
        </h2>

        {participants.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            {lecture?.status === 'ended'
              ? 'No participant records were captured for this lecture.'
              : 'No one has joined this lecture yet.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Left</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {participants.map(participant => (
                  <tr key={participant.id}>
                    <td>{participant.name}</td>
                    <td>{participant.email}</td>
                    <td style={{ textTransform: 'capitalize' }}>{participant.role}</td>
                    <td>{formatDateTime(participant.joined_at)}</td>
                    <td>{participant.left_at ? formatDateTime(participant.left_at) : 'Active'}</td>
                    <td>{participant.attendance_minutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveLecturePage;
