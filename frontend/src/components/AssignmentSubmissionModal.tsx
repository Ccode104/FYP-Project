import React, { useState } from 'react';
import Modal from './Modal';
import { apiFetch } from '../services/api';
import { useToast } from './ToastProvider';

interface AssignmentSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: {
    id: number;
    title: string;
    assignment_type: string;
  };
}

export default function AssignmentSubmissionModal({
  isOpen,
  onClose,
  assignment
}: AssignmentSubmissionModalProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const getSubmissionInstructions = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'Upload your PDF file to Google Drive, make it publicly accessible, and submit the shareable link.';
      case 'ppt':
        return 'Upload your PPT file to Google Drive, make it publicly accessible, and submit the shareable link.';
      case 'mixed':
        return 'Create a GitHub repository with your project files, make it public, and submit the repository URL.';
      default:
        return 'Submit your assignment according to the instructions provided.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) {
      toast?.push({ kind: 'error', message: 'Please provide a valid link' });
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/api/submissions/submit/link', {
        method: 'POST',
        body: { assignment_id: assignment.id, url: linkUrl.trim() }
      });
      toast?.push({ kind: 'success', message: 'Assignment submitted successfully!' });
      setLinkUrl('');
      onClose();
    } catch (err: any) {
      console.error('Submission failed:', err);
      toast?.push({ kind: 'error', message: err?.message || 'Submission failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setLinkUrl('');
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Submit Assignment"
    >
      <div style={{
        padding: '20px',
        background: 'rgba(15, 23, 42, 0.95)',
        color: '#ffffff',
        borderRadius: '8px'
      }}>
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '8px',
          border: '1px solid rgba(71, 85, 105, 0.5)'
        }}>
          <h4 style={{
            margin: '0 0 10px 0',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            Submission Instructions
          </h4>
          <p style={{
            margin: 0,
            color: '#cbd5e1',
            lineHeight: '1.5',
            fontSize: '14px'
          }}>
            {getSubmissionInstructions(assignment.assignment_type)}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="submission-link"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#ffffff',
                fontSize: '14px'
              }}
            >
              {assignment.assignment_type === 'mixed' ? 'GitHub Repository URL' : 'Google Drive Shareable Link'}
            </label>
            <input
              id="submission-link"
              type="url"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(71, 85, 105, 0.5)',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: 'rgba(30, 41, 59, 0.8)',
                color: '#ffffff',
                outline: 'none'
              }}
              placeholder={
                assignment.assignment_type === 'mixed'
                  ? 'https://github.com/username/repository'
                  : 'https://drive.google.com/file/d/.../view?usp=sharing'
              }
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn"
              onClick={handleClose}
              disabled={submitting}
              style={{
                background: 'rgba(51, 65, 85, 0.8)',
                color: '#ffffff',
                border: '1px solid rgba(71, 85, 105, 0.5)',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!linkUrl.trim() || submitting}
              style={{
                background: '#ff6b35',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: linkUrl.trim() && !submitting ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                opacity: (!linkUrl.trim() || submitting) ? 0.6 : 1
              }}
            >
              {submitting ? 'Submitting...' : `Submit ${assignment.assignment_type === 'mixed' ? 'Repository' : assignment.assignment_type.toUpperCase()}`}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}