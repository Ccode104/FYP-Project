import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { LiveLecture } from '../../../../features/live-lecture/api/liveLectures';

interface LectureTableProps {
  lectures: LiveLecture[];
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function getSessionDurationMinutes(lecture: LiveLecture): number {
  if (!lecture.started_at) return 0;
  const start = new Date(lecture.started_at).getTime();
  const end = lecture.ended_at ? new Date(lecture.ended_at).getTime() : Date.now();
  return Math.max(0, Math.round((end - start) / 60000));
}

function attendancePercent(lecture: LiveLecture): number {
  // Use average attendance as a proxy, or fallback to a reasonable estimate
  const avg = lecture.average_attendance_minutes || 0;
  // Assume 90 min lecture baseline for percentage calculation
  return Math.min(100, Math.round((avg / 90) * 100));
}

const LectureTable: React.FC<LectureTableProps> = ({ lectures }) => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();

  const handleView = (lectureId: number) => {
    if (!courseId) return;
    navigate(`/courses/${courseId}/live-lectures/${lectureId}`);
  };

  return (
    <div className="ll-table-wrap">
      <table className="ll-table">
        <thead>
          <tr>
            <th>SESSION TOPIC</th>
            <th>DATE</th>
            <th>DURATION</th>
            <th>ATTENDANCE</th>
            <th className="ll-table__actions" style={{ textAlign: 'right' }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {lectures.map(lecture => {
            const pct = attendancePercent(lecture);
            return (
              <tr key={lecture.id}>
                <td>
                  <div className="ll-table__topic">
                    <span className="material-symbols-outlined ll-table__topic-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
                      video_file
                    </span>
                    <span className="ll-table__topic-text">{lecture.title}</span>
                  </div>
                </td>
                <td>{formatDate(lecture.ended_at || lecture.scheduled_at)}</td>
                <td>{formatDuration(getSessionDurationMinutes(lecture))}</td>
                <td>
                  <div className="ll-attendance">
                    <div className="ll-attendance__bar">
                      <div
                        className="ll-attendance__fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="ll-attendance__text">{pct}%</span>
                  </div>
                </td>
                <td>
                  <div className="ll-table__actions">
                    <button
                      className="ll-table__action"
                      onClick={() => handleView(lecture.id)}
                    >
                      View Recording
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>play_circle</span>
                    </button>
                    <button
                      className="ll-table__action ll-table__action--muted"
                      onClick={() => handleView(lecture.id)}
                    >
                      Analytics
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>bar_chart</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LectureTable;
