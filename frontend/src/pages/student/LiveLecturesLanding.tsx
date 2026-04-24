import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getLiveLecturesByCourse,
  type LiveLecture,
} from '../../features/live-lecture/api/liveLectures';
import { useToast } from '../../components/ToastProvider';
import LiveSessionsSection from './components/live-lectures/LiveSessionsSection';
import ScheduledLecturesSection from './components/live-lectures/ScheduledLecturesSection';
import CompletedSessionsSection from './components/live-lectures/CompletedSessionsSection';
import ScheduleLectureModal from './components/live-lectures/ScheduleLectureModal';
import './LiveLecturesPage.css';

type TabKey = 'all' | 'live' | 'scheduled' | 'completed';

export default function LiveLecturesLanding() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { push } = useToast();

  const [lectures, setLectures] = useState<LiveLecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const isStaff = user?.role === 'teacher' || user?.role === 'ta' || user?.role === 'admin';

  const loadLectures = async () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getLiveLecturesByCourse(Number.parseInt(courseId, 10));
      setLectures(data.lectures || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load live lectures';
      setError(msg);
      push({ kind: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLectures();
    // Auto-refresh every 30 seconds for live status updates
    const interval = setInterval(() => {
      void loadLectures();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const liveLectures = useMemo(() => lectures.filter((l) => l.status === 'live'), [lectures]);
  const scheduledLectures = useMemo(
    () => lectures.filter((l) => l.status === 'scheduled'),
    [lectures]
  );
  const completedLectures = useMemo(
    () => lectures.filter((l) => l.status === 'ended' || l.status === 'cancelled'),
    [lectures]
  );

  const tabCounts = {
    all: lectures.length,
    live: liveLectures.length,
    scheduled: scheduledLectures.length,
    completed: completedLectures.length,
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All Sessions' },
    { key: 'live', label: 'Live Now' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'completed', label: 'Completed/Recordings' },
  ];

  if (!courseId || !user) {
    return <div className="ll-page"><div className="loading-spinner">Loading...</div></div>;
  }

  return (
    <div className="ll-page">
      {/* Page Header */}
      <div className="ll-page-header">
        <div>
          <h2 className="ll-page-header__title">Live Lecture Management</h2>
          <p className="ll-page-header__subtitle">
            Coordinate, broadcast, and review your academic sessions.
          </p>
        </div>
        {isStaff && (
          <button
            className="ll-btn ll-editorial-gradient"
            style={{
              background: 'linear-gradient(135deg, #00346F 0%, #2563EB 100%)',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={() => setShowScheduleModal(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            Schedule New Lecture
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && !loading && <div className="ll-error">{error}</div>}

      {/* Status Tabs */}
      <div className="ll-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={'ll-tab' + (activeTab === t.key ? ' ll-tab--active' : '')}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            {t.key === 'live' && tabCounts.live > 0 && (
              <span className="ll-tab-badge">{tabCounts.live}</span>
            )}
          </button>
        ))}
      </div>

      {/* Live Now Section */}
      {(activeTab === 'all' || activeTab === 'live') && (
        <LiveSessionsSection lectures={liveLectures} isStaff={isStaff} loading={loading} />
      )}

      {/* Scheduled Section */}
      {(activeTab === 'all' || activeTab === 'scheduled') && (
        <ScheduledLecturesSection
          lectures={scheduledLectures}
          isStaff={isStaff}
          loading={loading}
          onRefresh={loadLectures}
        />
      )}

      {/* Completed Section */}
      {(activeTab === 'all' || activeTab === 'completed') && (
        <CompletedSessionsSection lectures={completedLectures} loading={loading} />
      )}

      {/* Schedule Modal */}
      <ScheduleLectureModal
        open={showScheduleModal}
        courseId={courseId}
        onClose={() => setShowScheduleModal(false)}
        onCreated={loadLectures}
      />
    </div>
  );
}
