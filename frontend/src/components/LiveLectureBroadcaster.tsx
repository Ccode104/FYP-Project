import React, { useState } from 'react';
import { createLiveLecture } from '../services/liveLectures';

interface LiveLectureBroadcasterProps {
  courseOfferingId: string;
  onLectureCreated: () => void;
  onClose: () => void;
}

const LiveLectureBroadcaster: React.FC<LiveLectureBroadcasterProps> = ({
  courseOfferingId,
  onLectureCreated,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter a title for the lecture');
      return;
    }

    setIsLoading(true);
    try {
      await createLiveLecture({
        title: title.trim(),
        description: description.trim() || undefined,
        course_offering_id: parseInt(courseOfferingId),
        scheduled_at: scheduledAt || undefined,
      });

      onLectureCreated();
    } catch (error: unknown) {
      console.error('Error creating live lecture:', error);
      alert(error?.message || 'Failed to create live lecture');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="live-lecture-broadcaster">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Lecture Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Introduction to Data Structures"
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of the lecture content..."
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Scheduled Time (Optional)
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
          <small style={{ color: '#666', fontSize: '12px' }}>
            Leave empty to start immediately
          </small>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              background: '#007bff',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {isLoading ? 'Creating...' : 'Create Lecture'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: '20px', padding: '16px', background: '#f8f9fa', borderRadius: '4px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>How it works:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#666' }}>
          <li>Create a lecture with a title and optional description</li>
          <li>Set a scheduled time or leave empty to start immediately</li>
          <li>Once created, click "Start" to begin the live session</li>
          <li>Students will be able to join the live lecture</li>
          <li>Use your camera and microphone to broadcast</li>
        </ul>
      </div>
    </div>
  );
};

export default LiveLectureBroadcaster;
