import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { apiFetch } from '../services/api';
import { useToast } from './ToastProvider';
import GitHubConnectButton from './GitHubConnectButton';
import GitHubRepositorySelector from './GitHubRepositorySelector';

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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isGitHubConnected, setIsGitHubConnected] = useState<boolean | null>(null);
  const [selectedRepository, setSelectedRepository] = useState<any>(null);
  const toast = useToast();

  // Check GitHub connection status when modal opens
  useEffect(() => {
    if (isOpen && assignment?.assignment_type === 'mixed') {
      checkGitHubConnection();
    }
  }, [isOpen, assignment]);

  // Check GitHub connection status
  const checkGitHubConnection = async () => {
    try {
      const response = await apiFetch<{ profile: any }>('/api/users/profile');
      const profile = response.profile;
      const connected = profile.github_connected && profile.github_username;
      setIsGitHubConnected(connected);
    } catch (err) {
      setIsGitHubConnected(false);
    }
  };

  // Handle GitHub connection change
  const handleGitHubConnectionChange = (connected: boolean) => {
    setIsGitHubConnected(connected);
  };

  // Handle repository selection
  const handleRepositorySelect = (repository: any) => {
    setSelectedRepository(repository);
  };

  const getSubmissionInstructions = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'Upload your PDF document file. The file will be stored securely on our servers.';
      case 'ppt':
        return 'Upload your PowerPoint presentation file (.ppt or .pptx). The file will be stored securely on our servers.';
      case 'mixed':
        return 'Submit your project deliverables: optionally connect GitHub for code repository, and upload a ZIP file containing project materials (reports, presentations, documentation, etc.).';
      default:
        return 'Submit your assignment according to the instructions provided.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (assignment.assignment_type === 'mixed') {
      // Mixed assignments: Support both GitHub repository AND file upload
      if (!selectedRepository && !uploadedFile) {
        toast?.push({ kind: 'error', message: 'Please select a GitHub repository or upload project materials (ZIP file)' });
        return;
      }

      setSubmitting(true);
      try {
        // Submit GitHub repository if selected
        if (selectedRepository) {
          await apiFetch('/api/submissions/submit/github-repo', {
            method: 'POST',
            body: { assignment_id: assignment.id, repo_url: selectedRepository.html_url }
          });
        }

        // Submit project materials file if uploaded
        if (uploadedFile) {
          const formData = new FormData();
          formData.append('assignment_id', assignment.id.toString());
          formData.append('files', uploadedFile);

          // Use fetch directly for file upload since apiFetch doesn't handle FormData
          const token = localStorage.getItem('auth:token');
          const response = await fetch('/api/submissions/submit/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'File upload failed');
          }
        }

        toast?.push({ kind: 'success', message: 'Project submitted successfully!' });
        setSelectedRepository(null);
        setUploadedFile(null);
        onClose();
      } catch (err: any) {
        console.error('Submission failed:', err);
        toast?.push({ kind: 'error', message: err?.message || 'Submission failed. Please try again.' });
      } finally {
        setSubmitting(false);
      }
    } else {
      // Non-mixed assignments: File upload for PDF/PPT
      if (!uploadedFile) {
        toast?.push({ kind: 'error', message: 'Please select a file to upload' });
        return;
      }

      setSubmitting(true);
      try {
        const formData = new FormData();
        formData.append('assignment_id', assignment.id.toString());
        formData.append('files', uploadedFile);

        // Use fetch directly for file upload
        const token = localStorage.getItem('auth:token');
        const response = await fetch('/api/submissions/submit/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'File upload failed');
        }

        toast?.push({ kind: 'success', message: 'Assignment submitted successfully!' });
        setUploadedFile(null);
        onClose();
      } catch (err: any) {
        console.error('Submission failed:', err);
        toast?.push({ kind: 'error', message: err?.message || 'Submission failed. Please try again.' });
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    setUploadedFile(null);
    setSelectedRepository(null);
    onClose();
  };

  const modalActions = (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
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
        type="button"
        onClick={handleSubmit}
        disabled={
          assignment.assignment_type === 'mixed'
            ? !( (selectedRepository || uploadedFile) && !submitting )
            : !uploadedFile || submitting
        }
        style={{
          background: (
            assignment.assignment_type === 'mixed'
              ? ( (selectedRepository || uploadedFile) && !submitting )
              : (uploadedFile && !submitting)
          )
            ? '#ff6b35'
            : '#6c757d',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          cursor: (
            assignment.assignment_type === 'mixed'
              ? ( (selectedRepository || uploadedFile) && !submitting )
              : (uploadedFile && !submitting)
          ) ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          fontWeight: '500',
          opacity: (
            assignment.assignment_type === 'mixed'
              ? ( (selectedRepository || uploadedFile) && !submitting )
              : (uploadedFile && !submitting)
          ) ? 1 : 0.6
        }}
      >
        {submitting ? 'Submitting...' : `Submit ${assignment.assignment_type === 'mixed' ? 'Repository' : assignment.assignment_type.toUpperCase()}`}
      </button>
    </div>
  );

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Submit Assignment"
      actions={modalActions}
    >
      <div style={{
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

        {assignment.assignment_type === 'mixed' ? (
          <>
            {/* GitHub Integration Section for Mixed Assignments */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#ffffff',
                fontSize: '14px'
              }}>
                GitHub Repository Submission
              </label>

              {isGitHubConnected === null ? (
                <div style={{
                  padding: '16px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p style={{ margin: '8px 0 0 0', color: '#cbd5e1', fontSize: '14px' }}>
                    Checking GitHub connection...
                  </p>
                </div>
              ) : isGitHubConnected ? (
                <GitHubRepositorySelector
                  onRepositorySelect={handleRepositorySelect}
                  selectedRepository={selectedRepository}
                />
              ) : (
                <div style={{
                  padding: '16px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <p style={{ margin: '0 0 12px 0', color: '#cbd5e1', fontSize: '14px' }}>
                    Connect your GitHub account to optionally submit a repository as part of your project.
                  </p>
                  <GitHubConnectButton
                    onConnectionChange={handleGitHubConnectionChange}
                  />
                </div>
              )}
            </div>

            {/* File Upload for Mixed Assignments (ZIP files) */}
            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="file-upload"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              >
                Project Materials (ZIP file)
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".zip"
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                disabled={submitting}
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
              />
              <p style={{ margin: '8px 0 0 0', color: '#cbd5e1', fontSize: '12px' }}>
                Upload a ZIP file containing your project materials (reports, presentations, documentation, code, etc.)
              </p>
              {uploadedFile && (
                <p style={{ margin: '4px 0 0 0', color: '#10b981', fontSize: '12px' }}>
                  Selected: {uploadedFile.name}
                </p>
              )}
            </div>
          </>
        ) : (
          /* File Upload for non-mixed assignments (PDF, PPT, etc.) */
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="file-upload"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#ffffff',
                fontSize: '14px'
              }}
            >
              {assignment.assignment_type === 'pdf' ? 'PDF File' : assignment.assignment_type === 'ppt' ? 'PowerPoint File' : 'File Upload'}
            </label>
            <input
              id="file-upload"
              type="file"
              accept={assignment.assignment_type === 'pdf' ? '.pdf' : assignment.assignment_type === 'ppt' ? '.ppt,.pptx' : '*'}
              onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
              disabled={submitting}
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
            />
            <p style={{ margin: '8px 0 0 0', color: '#cbd5e1', fontSize: '12px' }}>
              {assignment.assignment_type === 'pdf'
                ? 'Upload your PDF document'
                : assignment.assignment_type === 'ppt'
                ? 'Upload your PowerPoint presentation (.ppt or .pptx)'
                : 'Upload your assignment file'
              }
            </p>
            {uploadedFile && (
              <p style={{ margin: '4px 0 0 0', color: '#10b981', fontSize: '12px' }}>
                Selected: {uploadedFile.name}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}