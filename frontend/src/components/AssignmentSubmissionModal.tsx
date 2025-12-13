import React, { useState, useEffect, useCallback } from 'react';
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
    allow_github_repo?: boolean;
    file_size_limit_mb?: number;
  };
  onSubmitSuccess?: () => void;
}

interface SelectedRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  updated_at: string | null;
  private: boolean | null;
  fork: boolean | null;
  // add other properties as needed
}

interface FullAssignment {
  file_size_limit_mb?: number;
}

interface Profile {
  github_connected?: boolean;
  github_username?: string;
}

export default function AssignmentSubmissionModal({
  isOpen,
  onClose,
  assignment,
  onSubmitSuccess
}: AssignmentSubmissionModalProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isGitHubConnected, setIsGitHubConnected] = useState<boolean | null>(null);
  const [selectedRepository, setSelectedRepository] = useState<SelectedRepository | null>(null);
  const [fullAssignment, setFullAssignment] = useState<FullAssignment | null>(null);
  const toast = useToast();

  // Fetch full assignment details
  const fetchFullAssignment = useCallback(async () => {
    try {
      const response = await apiFetch<FullAssignment>(`/api/assignments/${assignment.id}`);
      setFullAssignment(response);
    } catch (error) {
      console.error('Failed to fetch assignment details:', error);
    }
  }, [assignment.id]);

  // Fetch full assignment details and check GitHub connection when modal opens
  useEffect(() => {
    if (isOpen && assignment?.id) {
      fetchFullAssignment();
      if (assignment?.allow_github_repo) {
        checkGitHubConnection();
      }
    }
  }, [isOpen, assignment, fetchFullAssignment]);

  // Check GitHub connection status
  const checkGitHubConnection = async () => {
    try {
      const response = await apiFetch<{ profile: Profile }>('/api/users/profile');
      const profile = response.profile;
      const connected = !!(profile.github_connected && profile.github_username);
      setIsGitHubConnected(connected);
    } catch {
      setIsGitHubConnected(false);
    }
  };

  // Handle GitHub connection change
  const handleGitHubConnectionChange = (connected: boolean) => {
    setIsGitHubConnected(connected);
  };

  // Handle repository selection
  const handleRepositorySelect = (repository: unknown) => {
    console.log('DEBUG: Modal received repository selection:', (repository as SelectedRepository).name);
    const repo = repository as SelectedRepository;
    setSelectedRepository({ ...repo, id: repo.id || 0 });
  };

  const getSubmissionInstructions = () => {
    const limitText = fullAssignment?.file_size_limit_mb
      ? ` Maximum file size: ${fullAssignment.file_size_limit_mb} MB per file.`
      : '';

    if (assignment.allow_github_repo) {
      return `Submit your assignment: optionally connect a GitHub repository, and upload multiple files containing your work.${limitText}`;
    } else {
      return `Upload one or more files for your assignment. All files will be stored securely on our servers.${limitText}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check file size limit for all uploaded files
    if (uploadedFiles.length > 0 && fullAssignment?.file_size_limit_mb) {
      for (const file of uploadedFiles) {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > fullAssignment.file_size_limit_mb) {
          toast?.push({
            kind: 'error',
            message: `File "${file.name}" size (${fileSizeMB.toFixed(2)} MB) exceeds the limit of ${fullAssignment.file_size_limit_mb} MB`
          });
          return;
        }
      }
    }

    // All assignments now support multiple files and optionally GitHub repo
    const hasGitHubOption = assignment.allow_github_repo;
    const hasFiles = uploadedFiles.length > 0;
    const hasRepository = !!selectedRepository;

    if (!hasRepository && !hasFiles) {
      const message = hasGitHubOption
        ? 'Please select a GitHub repository or upload files'
        : 'Please upload at least one file';
      toast?.push({ kind: 'error', message });
      return;
    }

    setSubmitting(true);
    try {
      // Submit GitHub repository if selected and allowed
      if (hasRepository && hasGitHubOption) {
        await apiFetch('/api/submissions/submit/github-repo', {
          method: 'POST',
          body: { assignment_id: assignment.id, repo_url: selectedRepository.html_url }
        });
      }

      // Submit files if uploaded
      if (hasFiles) {
        const formData = new FormData();
        formData.append('assignment_id', assignment.id.toString());
        uploadedFiles.forEach((file) => {
          formData.append('files', file);
        });

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

      toast?.push({ kind: 'success', message: 'Assignment submitted successfully!' });
      setSelectedRepository(null);
      setUploadedFiles([]);
      onSubmitSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error('Submission failed:', err);
      toast?.push({ kind: 'error', message: err instanceof Error ? err.message : 'Submission failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setUploadedFiles([]);
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
          assignment.allow_github_repo
            ? !( (selectedRepository || uploadedFiles.length > 0) && !submitting )
            : !(uploadedFiles.length > 0 && !submitting)
        }
        style={{
          background: (
            assignment.allow_github_repo
              ? ( (selectedRepository || uploadedFiles.length > 0) && !submitting )
              : (uploadedFiles.length > 0 && !submitting)
          )
            ? '#ff6b35'
            : '#6c757d',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          cursor: (
            assignment.allow_github_repo
              ? ( (selectedRepository || uploadedFiles.length > 0) && !submitting )
              : (uploadedFiles.length > 0 && !submitting)
          ) ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          fontWeight: '500',
          opacity: (
            assignment.allow_github_repo
              ? ( (selectedRepository || uploadedFiles.length > 0) && !submitting )
              : (uploadedFiles.length > 0 && !submitting)
          ) ? 1 : 0.6
        }}
      >
        {submitting ? 'Submitting...' : 'Submit Assignment'}
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
            {getSubmissionInstructions()}
          </p>
        </div>

        {/* GitHub Repository Section (if enabled) */}
        {assignment.allow_github_repo && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#ffffff',
              fontSize: '14px'
            }}>
              GitHub Repository (Optional)
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                selectedRepository={selectedRepository as any}
              />
            ) : (
              <div style={{
                padding: '16px',
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <p style={{ margin: '0 0 12px 0', color: '#cbd5e1', fontSize: '14px' }}>
                  Connect your GitHub account to optionally submit a repository.
                </p>
                <GitHubConnectButton
                  onConnectionChange={handleGitHubConnectionChange}
                />
              </div>
            )}
          </div>
        )}

        {/* File Upload Section */}
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
            Files
          </label>
          <input
            id="file-upload"
            type="file"
            multiple
            onChange={(e) => setUploadedFiles(Array.from(e.target.files || []))}
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
            Upload one or more files for your assignment
          </p>
          {uploadedFiles.length > 0 && (
            <div style={{ margin: '4px 0 0 0' }}>
              <p style={{ color: '#10b981', fontSize: '12px', margin: '0 0 4px 0' }}>
                Selected files:
              </p>
              {uploadedFiles.map((file, index) => (
                <p key={index} style={{ color: '#10b981', fontSize: '12px', margin: '2px 0' }}>
                  • {file.name}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
