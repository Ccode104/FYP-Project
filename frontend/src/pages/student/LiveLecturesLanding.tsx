import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getLiveLecturesByCourse,
  type LiveLecture,
} from '../../features/live-lecture/api/liveLectures';

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Not scheduled';
  }
  return new Date(value).toLocaleString();
}

export default function LiveLecturesLanding() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lectures, setLectures] = useState<LiveLecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLectures = async () => {
      if (!courseId) {
        return;
      }

      try {
        const data = await getLiveLecturesByCourse(Number.parseInt(courseId, 10));
        setLectures(data.lectures || []);
        setError('');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load live lectures');
      } finally {
        setLoading(false);
      }
    };

    void loadLectures();
  }, [courseId]);

  if (!courseId || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gap: '18px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Live Lectures</h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            Scheduled and completed Google Meet sessions for this course.
          </p>
        </div>
        <button className="btn" onClick={() => navigate(`/courses/${courseId}/hub`)}>
          Back to Course Hub
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading live lectures...</div>
      ) : error ? (
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
      ) : lectures.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            No live lectures have been scheduled for this course yet.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Participants</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lectures.map(lecture => (
                <tr key={lecture.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{lecture.title}</div>
                    {lecture.description && (
                      <div className="muted" style={{ fontSize: '0.9rem' }}>
                        {lecture.description}
                      </div>
                    )}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{lecture.status}</td>
                  <td>{formatDateTime(lecture.scheduled_at)}</td>
                  <td>{lecture.total_participant_count || 0}</td>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`/courses/${courseId}/live-lectures/${lecture.id}`)}
                    >
                      {lecture.status === 'ended'
                        ? 'View Stats'
                        : user.role === 'teacher' || user.role === 'ta'
                          ? 'Open'
                          : 'View / Join'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
