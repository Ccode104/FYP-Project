import React from 'react';
import type { LiveLecture } from '../../../../features/live-lecture/api/liveLectures';
import LectureTable from './LectureTable';

interface CompletedSessionsSectionProps {
  lectures: LiveLecture[];
  loading: boolean;
}

const CompletedSessionsSection: React.FC<CompletedSessionsSectionProps> = ({ lectures, loading }) => {
  if (loading) {
    return (
      <section>
        <div className="ll-section-header">
          <h3 className="ll-section-label__text">PAST SESSIONS &amp; RECORDINGS</h3>
        </div>
        <div className="ll-table-wrap">
          <div className="ll-skeleton ll-skeleton-row" style={{ margin: '1rem' }}></div>
          <div className="ll-skeleton ll-skeleton-row" style={{ margin: '1rem' }}></div>
          <div className="ll-skeleton ll-skeleton-row" style={{ margin: '1rem' }}></div>
        </div>
      </section>
    );
  }

  if (lectures.length === 0) {
    return (
      <section>
        <div className="ll-section-header">
          <h3 className="ll-section-label__text">PAST SESSIONS &amp; RECORDINGS</h3>
        </div>
        <div className="ll-empty">
          <div className="ll-empty__icon">
            <span className="material-symbols-outlined">history</span>
          </div>
          <p>No completed sessions yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="ll-section-header">
        <h3 className="ll-section-label__text">PAST SESSIONS &amp; RECORDINGS</h3>
        <button className="ll-link">
          Download All Logs
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
        </button>
      </div>
      <LectureTable lectures={lectures} />
    </section>
  );
};

export default CompletedSessionsSection;
