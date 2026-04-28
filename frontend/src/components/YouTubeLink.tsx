import React, { useState } from 'react';
import { useToast } from '../components/ToastProvider';
import { apiFetch } from '../services/api';

interface YouTubeLinkProps {
  courseOfferingId: string | number;
  onSuccess: () => void;
  onClose: () => void;
}

export default function YouTubeLink({
  courseOfferingId,
  onSuccess,
  onClose,
}: YouTubeLinkProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { push } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim() || !title.trim()) {
      push({ kind: 'error', message: 'Title and YouTube URL are required' });
      return;
    }

    // Basic YouTube URL validation
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (!match || match[2].length !== 11) {
      push({ kind: 'error', message: 'Invalid YouTube URL' });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch('/api/videos/youtube', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          course_offering_id: courseOfferingId,
          video_url: url,
        }),
      });

      push({ kind: 'success', message: 'YouTube video linked successfully!' });
      onSuccess();
    } catch (err: any) {
      push({ kind: 'error', message: err.message || 'Failed to link YouTube video' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="youtube-link-container">
      <div className="youtube-link-header">
        <span className="material-symbols-outlined youtube-icon">smart_display</span>
        <div>
          <h3>Link YouTube Video</h3>
          <p>Add an unlisted or public YouTube video to your course.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="youtube-link-form">
        <div className="form-group">
          <label htmlFor="yt-url">YouTube Video URL *</label>
          <input
            id="yt-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="yt-title">Video Title *</label>
          <input
            id="yt-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a descriptive title"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="yt-desc">Description (Optional)</label>
          <textarea
            id="yt-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this video about?"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <div className="privacy-notice">
          <span className="material-symbols-outlined">lock</span>
          <p>
            <strong>Pro Tip:</strong> For privacy, set your YouTube video to <strong>"Unlisted"</strong>. 
            This way, only students with the link can watch it, and it won't appear in public searches.
          </p>
        </div>

        <div className="youtube-link-actions">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Linking...' : 'Link Video'}
          </button>
        </div>
      </form>

      <style dangerouslySetInnerHTML={{ __html: `
        .youtube-link-container {
          padding: 10px;
        }
        .youtube-link-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 1px solid #f1f5f9;
        }
        .youtube-icon {
          font-size: 40px;
          color: #ef4444;
        }
        .youtube-link-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #1e293b;
        }
        .youtube-link-header p {
          margin: 5px 0 0;
          font-size: 0.875rem;
          color: #64748b;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          color: #334155;
        }
        .form-group input, .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: border-color 0.2s;
        }
        .form-group input:focus, .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .privacy-notice {
          display: flex;
          gap: 12px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 25px;
        }
        .privacy-notice span {
          color: #0369a1;
          font-size: 20px;
        }
        .privacy-notice p {
          margin: 0;
          font-size: 0.85rem;
          color: #0c4a6e;
          line-height: 1.4;
        }
        .youtube-link-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }
        .btn-secondary {
          padding: 10px 20px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-primary {
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-primary:disabled {
          background: #94a3b8;
          cursor: not-allowed;
        }
      `}} />
    </div>
  );
}
