import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLiveLecturesByCourse } from '../../features/live-lecture/api/liveLectures';
import { useAuth } from '../../context/AuthContext';

export default function LiveLecturesLanding() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'redirect' | 'empty' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !user) return;
    const courseIdNum = Number(courseId);
    if (Number.isNaN(courseIdNum)) {
      navigate(`/courses/${courseId}/hub`, { replace: true });
      return;
    }

    const loadLectures = async () => {
      try {
        const data = await getLiveLecturesByCourse(courseIdNum);
        const lectures = (data as any)?.lectures || [];
        const activeLecture = lectures.find((lecture: any) => lecture.status === 'live');
        const scheduledLecture = lectures.find((lecture: any) => lecture.status === 'scheduled');

        if (activeLecture?.id) {
          navigate(`/courses/${courseId}/live-lectures/${activeLecture.id}`, { replace: true });
          return;
        }

        if (scheduledLecture?.id) {
          navigate(`/courses/${courseId}/live-lectures/${scheduledLecture.id}`, { replace: true });
          return;
        }

        setStatus('empty');
      } catch (err: unknown) {
        setError((err as Error)?.message || 'Unable to resolve live lectures');
        setStatus('error');
      }
    };

    void loadLectures();
  }, [courseId, navigate, user]);

  if (status === 'loading') {
    return (
      <div className="live-lecture-loading">
        <div className="live-lecture-spinner"></div>
        <p>Looking for your live lecture session...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="live-lecture-loading">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="live-lecture-dashboard" style={{ paddingTop: '32px' }}>
      <header className="live-lecture-header">
        <div className="live-lecture-header-left">
          <h1 className="live-lecture-title">No Live Lecture Session Available</h1>
          <p className="live-lecture-info">
            There are no active or scheduled lectures for this course right now.
          </p>
        </div>
      </header>
      <div className="live-lecture-analytics" style={{ gridTemplateColumns: '1fr' }}>
        <div className="live-lecture-analytics-card">
          <p className="live-lecture-analytics-value">No sessions</p>
          <span className="live-lecture-analytics-label">Live Lecture Status</span>
        </div>
      </div>
    </div>
  );
}
