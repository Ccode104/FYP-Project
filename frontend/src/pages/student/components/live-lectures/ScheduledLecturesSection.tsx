import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { LiveLecture } from '../../../../features/live-lecture/api/liveLectures';
import { deleteLiveLecture, updateLiveLecture } from '../../../../features/live-lecture/api/liveLectures';
import { useToast } from '../../../../components/ToastProvider';

interface ScheduledLecturesSectionProps {
  lectures: LiveLecture[];
  isStaff: boolean;
  loading: boolean;
  onRefresh: () => void;
}

function formatDateBlock(dateStr?: string | null): { month: string; day: string } {
  if (!dateStr) return { month: '---', day: '--' };
  const d = new Date(dateStr);
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    day: String(d.getDate()),
  };
}

function formatTimeRange(dateStr?: string | null, durationMinutes?: number): string {
  if (!dateStr) return 'TBD';
  const start = new Date(dateStr);
  const end = new Date(start.getTime() + (durationMinutes || 60) * 60000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return fmt(start) + ' - ' + fmt(end);
}

const ScheduledLecturesSection: React.FC<ScheduledLecturesSectionProps> = ({
  lectures,
  isStaff,
  loading,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const { push } = useToast();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handlePreview = (lectureId: number) => {
    if (!courseId) return;
    navigate('/courses/' + courseId + '/live-lectures/' + lectureId);
  };

  const handleEdit = async (lecture: LiveLecture) => {
    // For now, navigate to detail page where staff can manage
    if (!courseId) return;
    navigate('/courses/' + courseId + '/live-lectures/' + lecture.id);
  };

  const handleDelete = async (lectureId: number) => {
    if (!window.confirm('Are you sure you want to cancel this lecture?')) return;
    try {
      setDeletingId(lectureId);
      await deleteLiveLecture(lectureId);
      push({ kind: 'success', message: 'Lecture cancelled successfully' });
      onRefresh();
    } catch (err) {
      push({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to cancel lecture' });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <section className="mb-12">
        <h3 className="ll-section-label__text" style={{ marginBottom: '1.5rem' }}>UPCOMING LECTURES</h3>
        <div className="ll-scheduled-list">
          <div className="ll-skeleton ll-skeleton-row"></div>
          <div className="ll-skeleton ll-skeleton-row"></div>
        </div>
      </section>
    );
  }

  if (lectures.length === 0) {
    return (
      <section className="mb-12">
        <h3 className="ll-section-label__text" style={{ marginBottom: '1.5rem' }}>UPCOMING LECTURES</h3>
        <div className="ll-empty">
          <div className="ll-empty__icon">
            <span className="material-symbols-outlined">event_busy</span>
          </div>
          <p>No upcoming lectures scheduled.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h3 className="ll-section-label__text" style={{ marginBottom: '1.5rem' }}>UPCOMING LECTURES</h3>
      <div className="ll-scheduled-list">
        {lectures.map((lecture) => {
          const dateBlock = formatDateBlock(lecture.scheduled_at);
          return (
            <div key={lecture.id} className="ll-scheduled-item">
              <div className="ll-scheduled-item__left">
                <div className="ll-date-block">
                  <span className="ll-date-block__month">{dateBlock.month}</span>
                  <span className="ll-date-block__day">{dateBlock.day}</span>
                </div>
                <div className="ll-scheduled-item__info">
                  <h4 className="ll-scheduled-item__title">{lecture.title}</h4>
                  <div className="ll-scheduled-item__meta">
                    <span>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>schedule</span>
                      {formatTimeRange(lecture.scheduled_at, 90)}
                    </span>
                    <span>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>book</span>
                      {'Lecture'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="ll-scheduled-item__actions">
                {isStaff && (
                  <>
                    <button
                      className="ll-btn ll-btn--ghost"
                      onClick={() => handleEdit(lecture)}
                      title="Edit"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      className="ll-btn ll-btn--ghost ll-btn--ghost-danger"
                      onClick={() => handleDelete(lecture.id)}
                      disabled={deletingId === lecture.id}
                      title="Cancel"
                    >
                      <span className="material-symbols-outlined">
                        {deletingId === lecture.id ? 'hourglass_empty' : 'cancel'}
                      </span>
                    </button>
                  </>
                )}
                <button
                  className="ll-btn ll-btn--outline"
                  onClick={() => handlePreview(lecture.id)}
                >
                  Preview Content
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ScheduledLecturesSection;
