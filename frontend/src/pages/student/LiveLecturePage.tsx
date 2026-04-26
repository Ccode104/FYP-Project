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
import './LiveLecturesPage.css';
import './LiveLecturePage.css';

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

function formatMinutes(value: number) {
  return `${value} min`;
}

function computeRuntimeMinutes(startedAt?: string | null, endedAt?: string | null) {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  return Math.max(0, Math.round((end - start) / 60000));
}

function formatStatusLabel(status?: LiveLecture['status']) {
  if (!status) return 'Unknown';
  if (status === 'live') return 'Live now';
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'ended') return 'Ended';
  return 'Cancelled';
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

  const studentParticipants = useMemo(
    () => participants.filter(participant => participant.role === 'student'),
    [participants]
  );

  const activeParticipants = useMemo(
    () => participants.filter(participant => !participant.left_at).length,
    [participants]
  );

  const activeStudents = useMemo(
    () => studentParticipants.filter(participant => !participant.left_at).length,
    [studentParticipants]
  );

  const participantAverageMinutes = useMemo(() => {
    if (participants.length === 0) return 0;
    const total = participants.reduce(
      (sum, participant) => sum + Number(participant.attendance_minutes || 0),
      0
    );
    return Math.round(total / participants.length);
  }, [participants]);

  const sessionRuntimeMinutes = useMemo(
    () => computeRuntimeMinutes(lecture?.started_at, lecture?.ended_at),
    [lecture?.ended_at, lecture?.started_at]
  );

  const isEndedLecture = lecture?.status === 'ended';

  if (!courseId || !lectureId || !user) {
    return <div>Loading...</div>;
  }

  if (loading) {
    return (
      <div className="ll-page ll-detail-page">
        <div className="ll-detail-shell">
          <div className="loading-spinner">Loading live lecture...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ll-page ll-detail-page">
      <div className="ll-detail-shell">
        <div className="ll-detail-topbar">
          <button
            className="ll-btn ll-btn--outline"
            onClick={() => navigate(`/courses/${courseId}/live-lectures`)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Live Lectures
          </button>
        </div>

        <section className="ll-detail-hero">
          <div className="ll-detail-hero__main">
            <div className="ll-section-label">
              <span
                className={`ll-section-label__dot ${
                  lecture?.status === 'live' ? 'll-section-label__dot--pulse' : ''
                }`}
              ></span>
              <span className="ll-section-label__text">{formatStatusLabel(lecture?.status)}</span>
            </div>
            <h1 className="ll-detail-hero__title">{pageTitle}</h1>
            <p className="ll-detail-hero__subtitle">
              {lecture?.description || 'Google Meet lecture for this course offering.'}
            </p>
            <div className="ll-detail-hero__meta">
              <span className="ll-card__meta-item">
                <span className="material-symbols-outlined">schedule</span>
                {formatDateTime(lecture?.scheduled_at)}
              </span>
              <span className="ll-card__meta-item">
              <span className="material-symbols-outlined">groups</span>
                {activeParticipants} active now
              </span>
              <span className="ll-card__meta-item">
                <span className="material-symbols-outlined">insights</span>
                {formatMinutes(participantAverageMinutes)} average time in room
              </span>
            </div>
          </div>

          <div className="ll-detail-hero__actions">
            {lecture && lecture.status !== 'ended' && (
              <button className="ll-btn ll-btn--primary" onClick={handleJoin} disabled={actionLoading}>
                <span className="material-symbols-outlined">
                  {isStaff ? 'open_in_new' : 'videocam'}
                </span>
                {actionLoading ? 'Opening...' : isStaff ? 'Open Meet' : 'Join Meet'}
              </button>
            )}
            {lecture?.google_calendar_event_url && (
              <a
                className="ll-btn ll-btn--secondary"
                href={lecture.google_calendar_event_url}
                target="_blank"
                rel="noreferrer"
              >
                <span className="material-symbols-outlined">event</span>
                Open Calendar Event
              </a>
            )}
            {isStaff && lecture?.status !== 'ended' && (
              <button className="ll-btn ll-btn--ghost ll-btn--ghost-danger" onClick={handleEnd} disabled={actionLoading}>
                <span className="material-symbols-outlined">stop_circle</span>
                End Lecture
              </button>
            )}
          </div>
        </section>

        {error && <div className="ll-error">{error}</div>}

        <div className="ll-detail-metrics">
          <div className="ll-detail-metric">
            <span className="ll-detail-metric__label">Status</span>
            <strong className="ll-detail-metric__value">{formatStatusLabel(lecture?.status)}</strong>
          </div>
          <div className="ll-detail-metric">
            <span className="ll-detail-metric__label">Scheduled</span>
            <strong className="ll-detail-metric__value">{formatDateTime(lecture?.scheduled_at)}</strong>
          </div>
          <div className="ll-detail-metric">
            <span className="ll-detail-metric__label">Started</span>
            <strong className="ll-detail-metric__value">{formatDateTime(lecture?.started_at)}</strong>
          </div>
          <div className="ll-detail-metric">
            <span className="ll-detail-metric__label">Ended</span>
            <strong className="ll-detail-metric__value">{formatDateTime(lecture?.ended_at)}</strong>
          </div>
        </div>

        <div className="ll-detail-metrics">
          <div className="ll-detail-metric">
            <span className="ll-detail-metric__label">
              {isEndedLecture ? 'People Who Joined' : 'Participants in Room'}
            </span>
            <strong className="ll-detail-metric__value">{participants.length}</strong>
          </div>
          <div className="ll-detail-metric">
            <span className="ll-detail-metric__label">
              {isEndedLecture ? 'Students Who Joined' : 'Students in Room'}
            </span>
            <strong className="ll-detail-metric__value">
              {isEndedLecture ? studentParticipants.length : activeStudents}
            </strong>
          </div>
          <div className="ll-detail-metric">
            <span className="ll-detail-metric__label">Session Runtime</span>
            <strong className="ll-detail-metric__value">{formatMinutes(sessionRuntimeMinutes)}</strong>
          </div>
          <div className="ll-detail-metric">
            <span className="ll-detail-metric__label">Average Time in Room</span>
            <strong className="ll-detail-metric__value">
              {formatMinutes(participantAverageMinutes)}
            </strong>
          </div>
        </div>

        <section className="ll-table-wrap ll-detail-table">
          <div className="ll-detail-table__header">
            <div>
              <h2 className="ll-detail-table__title">
                {lecture?.status === 'ended'
                  ? 'Participants and Attendance'
                  : 'Current Participants'}
              </h2>
              <p className="ll-detail-table__subtitle">
                {lecture?.status === 'ended'
                  ? 'Review who attended and how long they stayed.'
                  : 'Track who is currently in the session and when they joined.'}
              </p>
            </div>
          </div>

          {participants.length === 0 ? (
            <div className="ll-empty ll-detail-empty">
              <div className="ll-empty__icon">
                <span className="material-symbols-outlined">
                  {lecture?.status === 'ended' ? 'groups' : 'videocam_off'}
                </span>
              </div>
              <p>
                {lecture?.status === 'ended'
                  ? 'No participant records were captured for this lecture.'
                  : 'No one has joined this lecture yet.'}
              </p>
            </div>
          ) : (
            <div className="ll-detail-table__scroll">
              <table className="ll-table">
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
                      <td className="ll-detail-role">{participant.role}</td>
                      <td>{formatDateTime(participant.joined_at)}</td>
                      <td>{participant.left_at ? formatDateTime(participant.left_at) : 'Active'}</td>
                      <td>{formatMinutes(participant.attendance_minutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default LiveLecturePage;
