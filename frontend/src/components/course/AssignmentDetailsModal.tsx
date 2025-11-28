import React from 'react';
import Modal from '../Modal';

interface AssignmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
}

export default function AssignmentDetailsModal({
  isOpen,
  onClose,
  assignment
}: AssignmentDetailsModalProps) {
  if (!assignment) return null;

  const getAssignmentTypeDisplay = (type: string) => {
    switch (type) {
      case 'code':
        return 'Code Assignment';
      case 'pdf':
        return 'PDF Submission';
      case 'ppt':
        return 'PPT Submission';
      case 'mixed':
        return 'Mixed Submission';
      case 'file':
        return 'File Submission';
      default:
        return 'Assignment';
    }
  };

  const getSubmissionInstructions = (type: string) => {
    switch (type) {
      case 'code':
        return 'Use the built-in code editor to write and submit your solution. Your code will be automatically tested against predefined test cases.';
      case 'pdf':
        return 'Upload your PDF file to Google Drive, make it publicly accessible, and submit the shareable link.';
      case 'ppt':
        return 'Upload your PPT file to Google Drive, make it publicly accessible, and submit the shareable link.';
      case 'mixed':
        return 'Create a GitHub repository with your project files, make it public, and submit the repository URL.';
      case 'file':
        return 'Upload your file to Google Drive, make it publicly accessible, and submit the shareable link.';
      default:
        return 'Submit your assignment according to the instructions provided.';
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={`${assignment.title} - Details`}>
      <div style={{ maxWidth: '600px', padding: '20px' }}>
        {/* Assignment Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <span style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold',
              background: 'var(--primary)',
              color: 'white'
            }}>
              {getAssignmentTypeDisplay(assignment.assignment_type)}
            </span>
            <span style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '14px',
              background: 'var(--secondary)',
              color: 'var(--text-primary)'
            }}>
              {assignment.total_points || assignment.max_score || 100} points
            </span>
          </div>

          <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
            {assignment.title}
          </h2>

          {assignment.due_at && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-secondary)',
              fontSize: '14px'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Due: {new Date(assignment.due_at).toLocaleString()}
            </div>
          )}
        </div>

        {/* Description */}
        {assignment.description && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
              Description
            </h3>
            <div style={{
              padding: '16px',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              lineHeight: '1.6',
              color: 'var(--text-primary)'
            }}>
              {assignment.description}
            </div>
          </div>
        )}

        {/* Submission Instructions */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
            Submission Instructions
          </h3>
          <div style={{
            padding: '16px',
            background: '#e8f4fd',
            borderRadius: '8px',
            border: '1px solid #3b82f6',
            lineHeight: '1.6',
            color: 'var(--text-primary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ marginTop: '2px', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                {getSubmissionInstructions(assignment.assignment_type)}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
            Additional Information
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div style={{
              padding: '12px',
              background: 'var(--bg-secondary)',
              borderRadius: '6px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Assignment Type
              </div>
              <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                {getAssignmentTypeDisplay(assignment.assignment_type)}
              </div>
            </div>

            <div style={{
              padding: '12px',
              background: 'var(--bg-secondary)',
              borderRadius: '6px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Maximum Score
              </div>
              <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                {assignment.total_points || assignment.max_score || 100} points
              </div>
            </div>

            {assignment.allow_multiple_submissions && (
              <div style={{
                padding: '12px',
                background: 'var(--bg-secondary)',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Submissions
                </div>
                <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                  Multiple allowed
                </div>
              </div>
            )}

            {assignment.created_at && (
              <div style={{
                padding: '12px',
                background: 'var(--bg-secondary)',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Created
                </div>
                <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                  {new Date(assignment.created_at).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          paddingTop: '20px',
          borderTop: '1px solid var(--border)'
        }}>
          <button
            className="btn"
            onClick={onClose}
            style={{ padding: '8px 16px' }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}