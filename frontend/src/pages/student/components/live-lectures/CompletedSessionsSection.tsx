import React, { useState } from 'react';
import type { LiveLecture } from '../../../../features/live-lecture/api/liveLectures';
import LectureTable from './LectureTable';
import { apiFetch } from '../../../../services/api';
import { useToast } from '../../../../components/ToastProvider';

interface CompletedSessionsSectionProps {
  lectures: LiveLecture[];
  loading: boolean;
  isStaff?: boolean;
  courseOfferingId?: string;
}

const CompletedSessionsSection: React.FC<CompletedSessionsSectionProps> = ({ 
  lectures, 
  loading,
  isStaff,
  courseOfferingId
}) => {
  const { push } = useToast();
  const [sheetLoading, setSheetLoading] = useState(false);

  const handleOpenAttendanceSheet = async () => {
    if (!courseOfferingId) return;
    setSheetLoading(true);
    try {
      const data = await apiFetch<{ spreadsheetUrl: string }>(
        `/api/sheets/live-lecture-attendance/${courseOfferingId}`
      );
      window.open(data.spreadsheetUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to open attendance sheet';
      if (msg.includes('Connect Google')) {
        push({ 
          kind: 'warning', 
          message: 'Please connect your Google account in your profile settings first.' 
        });
      } else {
        push({ kind: 'error', message: msg });
      }
    } finally {
      setSheetLoading(false);
    }
  };

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
        {isStaff && (
          <button 
            className="ll-link" 
            onClick={handleOpenAttendanceSheet}
            disabled={sheetLoading}
          >
            {sheetLoading ? 'Generating Spreadsheet...' : 'Open Attendance Spreadsheet'}
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              {sheetLoading ? 'sync' : 'spreadsheet'}
            </span>
          </button>
        )}
      </div>
      <LectureTable lectures={lectures} />
    </section>
  );
};

export default CompletedSessionsSection;
