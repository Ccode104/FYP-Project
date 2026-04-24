import React from 'react';
import type { LiveLecture } from '../../../../features/live-lecture/api/liveLectures';
import LectureCard from './LectureCard';

interface LiveSessionsSectionProps {
  lectures: LiveLecture[];
  isStaff: boolean;
  loading: boolean;
}

const LiveSessionsSection: React.FC<LiveSessionsSectionProps> = ({ lectures, isStaff, loading }) => {
  if (loading) {
    return (
      <section className="mb-12">
        <div className="ll-section-label">
          <span className="ll-section-label__dot ll-section-label__dot--pulse"></span>
          <span className="ll-section-label__text">LIVE NOW</span>
        </div>
        <div className="ll-live-grid">
          <div className="ll-skeleton ll-skeleton-card"></div>
          <div className="ll-skeleton ll-skeleton-card"></div>
        </div>
      </section>
    );
  }

  if (lectures.length === 0) {
    return (
      <section className="mb-12">
        <div className="ll-section-label">
          <span className="ll-section-label__dot ll-section-label__dot--pulse"></span>
          <span className="ll-section-label__text">LIVE NOW</span>
        </div>
        <div className="ll-empty">
          <div className="ll-empty__icon">
            <span className="material-symbols-outlined">videocam_off</span>
          </div>
          <p>No sessions are currently live.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="ll-section-label">
        <span className="ll-section-label__dot ll-section-label__dot--pulse"></span>
        <span className="ll-section-label__text">LIVE NOW</span>
      </div>
      <div className="ll-live-grid">
        {lectures.map((lecture) => (
          <LectureCard key={lecture.id} lecture={lecture} isStaff={isStaff} />
        ))}
      </div>
    </section>
  );
};

export default LiveSessionsSection;
