import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { LiveLecture } from '../../../../features/live-lecture/api/liveLectures';

interface LectureCardProps {
  lecture: LiveLecture;
  isStaff: boolean;
}

const fallbackThumbs = [
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop',
];

function formatDuration(startedAt?: string | null): string {
  if (!startedAt) return '00:00';
  const diff = Date.now() - new Date(startedAt).getTime();
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

const LectureCard: React.FC<LectureCardProps> = ({ lecture, isStaff }) => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [duration, setDuration] = React.useState(formatDuration(lecture.started_at));

  React.useEffect(() => {
    if (lecture.status !== 'live' || !lecture.started_at) return;
    const interval = setInterval(() => setDuration(formatDuration(lecture.started_at)), 1000);
    return () => clearInterval(interval);
  }, [lecture.started_at, lecture.status]);

  const thumbIndex = lecture.id % fallbackThumbs.length;
  const thumb = fallbackThumbs[thumbIndex];

  const handleJoin = () => {
    if (!courseId) return;
    navigate('/courses/' + courseId + '/live-lectures/' + lecture.id);
  };

  return (
    <div className="ll-card">
      <div className="ll-card__thumb">
        <img src={thumb} alt={lecture.title} loading="lazy" />
        <div className="ll-card__live-badge">
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>podcasts</span>
          LIVE
        </div>
      </div>
      <div className="ll-card__body">
        <div>
          <div className="ll-card__header">
            <h4 className="ll-card__title">{lecture.title}</h4>
            <span className="ll-card__duration">{duration}</span>
          </div>
          <p className="ll-card__desc">
            {lecture.description || 'Live lecture session'}
          </p>
        </div>
        <div>
          <div className="ll-card__meta">
            <div className="ll-card__meta-item">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
              {lecture.total_participant_count || 0} Students
            </div>
            <div className="ll-card__meta-item ll-card__meta-item--green">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>wifi</span>
              Stable
            </div>
          </div>
          <div className="ll-card__actions">
            <button className="ll-btn ll-btn--primary" onClick={handleJoin}>
              {isStaff ? 'JOIN BROADCAST' : 'JOIN LECTURE'}
            </button>
            {isStaff && (
              <button className="ll-btn ll-btn--secondary" onClick={handleJoin}>
                MANAGE CHAT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LectureCard;