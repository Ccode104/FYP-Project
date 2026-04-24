import React from 'react';
import LiveLectureBroadcaster from '../../../../components/LiveLectureBroadcaster';

interface ScheduleLectureModalProps {
  open: boolean;
  courseId: string;
  onClose: () => void;
  onCreated: () => void;
}

const ScheduleLectureModal: React.FC<ScheduleLectureModalProps> = ({
  open,
  courseId,
  onClose,
  onCreated,
}) => {
  if (!open) return null;

  return (
    <div className="ll-modal-overlay" onClick={onClose}>
      <div className="ll-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ll-modal__header">
          <h3 className="ll-modal__title">Schedule New Lecture</h3>
          <button className="ll-modal__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="ll-modal__body">
          <LiveLectureBroadcaster
            courseOfferingId={courseId}
            onLectureCreated={() => {
              onCreated();
              onClose();
            }}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default ScheduleLectureModal;
