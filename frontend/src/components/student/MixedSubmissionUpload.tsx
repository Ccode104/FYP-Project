import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch, apiForm } from '../../services/api';
import { useToast } from '../ToastProvider';
import './MixedSubmissionUpload.css';

interface MixedSubmissionUploadProps {
  assignmentId?: string | number;
  onSubmitSuccess?: () => void;
}

interface UploadedFile {
  id?: number | string;
  file?: File;
  name: string;
  size: number;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  isExisting?: boolean;
}

export default function MixedSubmissionUpload({
  assignmentId: propAssignmentId,
  onSubmitSuccess,
}: MixedSubmissionUploadProps) {
  const { courseId, assignmentId: urlAssignmentId } = useParams<{
    courseId: string;
    assignmentId: string;
  }>();
  const effectiveAssignmentId = urlAssignmentId || String(propAssignmentId || '');
  const { push } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isCheckingGoogle, setIsCheckingGoogle] = useState(true);

  useEffect(() => {
    const checkGoogleStatus = async () => {
      try {
        const token = localStorage.getItem('auth:token') || '';
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
        const response = await fetch(`${apiBase.replace(/\/+$/, '')}/api/auth/google/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setGoogleConnected(data.connected);
      } catch (error) {
        console.error('Failed to check Google status:', error);
      } finally {
        setIsCheckingGoogle(false);
      }
    };

    const loadExistingSubmission = async () => {
      try {
        const data = await apiFetch<any[]>(
          `/api/student/assignments/${effectiveAssignmentId}/submissions`
        );
        if (data && data.length > 0) {
          const latest = data[0];
          if (latest.content) {
            setContent(latest.content);
          }
          if (latest.files && latest.files.length > 0) {
            const existingFiles: UploadedFile[] = latest.files.map((f: any) => ({
              id: f.id,
              name: f.filename,
              size: f.file_size || 0,
              progress: 100,
              status: 'completed',
              isExisting: true,
            }));
            setFiles(existingFiles);
          }
        }
      } catch (error) {
        console.error('Failed to load existing submission:', error);
      }
    };

    checkGoogleStatus();
    if (effectiveAssignmentId) {
      loadExistingSubmission();
    }
  }, [effectiveAssignmentId]);

  const allowedTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const allowedExtensions = [
    '.pdf',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.txt',
    '.zip',
    '.xls',
    '.xlsx',
    '.doc',
    '.docx',
    '.py',
    '.js',
    '.java',
    '.cpp',
    '.c',
    '.h',
  ];

  const getFileIcon = (fileName: string) => {
    const name = fileName.toLowerCase();
    if (name.endsWith('.pdf')) return { icon: 'picture_as_pdf', color: '#e11d48' };
    if (
      name.endsWith('.png') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.gif') ||
      name.endsWith('.webp')
    ) {
      return { icon: 'image', color: '#10b981' };
    }
    if (
      name.endsWith('.py') ||
      name.endsWith('.js') ||
      name.endsWith('.java') ||
      name.endsWith('.cpp') ||
      name.endsWith('.c') ||
      name.endsWith('.h')
    ) {
      return { icon: 'code', color: '#2563eb' };
    }
    if (name.endsWith('.zip')) return { icon: 'folder_zip', color: '#8b5cf6' };
    if (name.endsWith('.xls') || name.endsWith('.xlsx'))
      return { icon: 'table_chart', color: '#10b981' };
    if (name.endsWith('.doc') || name.endsWith('.docx'))
      return { icon: 'description', color: '#3b82f6' };
    return { icon: 'insert_drive_file', color: '#64748b' };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
        push({ kind: 'error', message: `File type not allowed: ${file.name}` });
        return false;
      }
      if (file.size > 100 * 1024 * 1024) {
        push({ kind: 'error', message: `File too large (max 100MB): ${file.name}` });
        return false;
      }
      return true;
    });

    const newFileObjects: UploadedFile[] = validFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      progress: 0,
      status: 'pending' as const,
    }));

    setFiles(prev => [...prev, ...newFileObjects]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSubmit = async () => {
    if (files.length === 0 && !content.trim()) {
      push({ kind: 'error', message: 'Please add at least one file or provide content' });
      return;
    }

    if (files.some(f => !f.isExisting) && !googleConnected) {
      push({ kind: 'error', message: 'Please connect Google Drive to upload new files.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('assignmentId', effectiveAssignmentId);
      formData.append('assignment_id', effectiveAssignmentId);
      formData.append('content', content);
      formData.append('uploadToDrive', 'true');
      
      files.forEach(f => {
        if (f.file) {
          formData.append('files', f.file);
        } else if (f.isExisting && f.id) {
          formData.append('existingFileIds', String(f.id));
        }
      });

      await apiForm<any>('/api/submissions/submit/mixed', formData);

      setFiles(prev => prev.map(f => ({ ...f, status: 'completed' as const, progress: 100 })));
      push({ kind: 'success', message: 'Assignment submitted successfully!' });
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to submit assignment';
      push({ kind: 'error', message: errorMessage });
      setFiles(prev => prev.map(f => (f.status === 'uploading' ? { ...f, status: 'error' as const } : f)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mixed-submission-upload">
      <div className="upload-header">
        <h3>Submit Assignment</h3>
        <p>Upload multiple files including PDFs, code files, images, and documents</p>
      </div>

      <div className="submission-layout">
        <div className="left-pane">
          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedExtensions.join(',')}
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            <div className="drop-zone-content">
              <span className="material-symbols-outlined cloud-icon">cloud_upload</span>
              <p>Drag and drop files here</p>
              <span className="or-text">or</span>
              <button type="button" className="browse-btn">
                Browse Files
              </button>
              <p className="hint-text">
                Supported: PDF, Images, Code files, Documents, ZIP (max 100MB each)
              </p>
            </div>
          </div>

          <div className="content-section">
            <label htmlFor="submission-content">Additional Notes (optional)</label>
            <textarea
              id="submission-content"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Add any notes or comments about your submission..."
              rows={4}
            />
          </div>

          {!isCheckingGoogle && (
            <div className="google-drive-section">
              {googleConnected ? (
                <div className="drive-connected-badge">
                  <span className="material-symbols-outlined">check_circle</span>
                  Google Drive Connected (Files will be stored here)
                </div>
              ) : (
                <div className="drive-connect-prompt">
                  {files.some(f => !f.isExisting) && (
                    <p className="warning-text">
                      <span className="material-symbols-outlined">warning</span>
                      Google Drive connection is required to upload files.
                    </p>
                  )}
                  <button
                    type="button"
                    className="connect-google-btn"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('auth:token') || '';
                        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
                        const response = await fetch(`${apiBase.replace(/\/+$/, '')}/api/auth/google`, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        const data = await response.json();
                        if (data.authUrl) {
                          window.location.href = data.authUrl;
                        }
                      } catch (error) {
                        push({ kind: 'error', message: 'Failed to initiate Google connection' });
                      }
                    }}
                  >
                    <span className="material-symbols-outlined">link</span>
                    Connect Google Drive
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="right-pane">
          <div className="files-list-container">
            <h4>Selected Files ({files.length})</h4>
            {files.length > 0 ? (
              <div className="files-list">
                {files.map((uploadFile, index) => {
                  const { icon, color } = getFileIcon(uploadFile.name);
                  return (
                    <div key={index} className={`file-item ${uploadFile.status}`}>
                      {uploadFile.preview ? (
                        <div className="file-preview-thumb">
                          <img src={uploadFile.preview} alt={uploadFile.name} />
                        </div>
                      ) : (
                        <div className="file-icon" style={{ backgroundColor: `${color}20`, color }}>
                          <span className="material-symbols-outlined">{icon}</span>
                        </div>
                      )}
                      <div className="file-info">
                        <span className="file-name" title={uploadFile.name}>
                          {uploadFile.name}
                        </span>
                        <span className="file-size">{formatFileSize(uploadFile.size)}</span>
                        {uploadFile.status === 'uploading' && (
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${uploadFile.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {uploadFile.status !== 'uploading' && (
                        <div className="file-actions">
                          {uploadFile.status === 'completed' && (
                            <span className="material-symbols-outlined success-icon" title="Submitted">check_circle</span>
                          )}
                          {uploadFile.status === 'error' && (
                            <span className="material-symbols-outlined error-icon" title="Error">error</span>
                          )}
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={e => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                            title="Remove from submission"
                          >
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-files-placeholder">
                <span className="material-symbols-outlined">description</span>
                <p>No files selected yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="submit-actions">
        <button
          type="button"
          className="submit-btn"
          onClick={handleSubmit}
          disabled={isSubmitting || (files.length === 0 && !content.trim())}
        >
          {isSubmitting ? (
            <>
              <span className="loading-spinner-small"></span>
              Submitting...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">send</span>
              Submit Assignment
            </>
          )}
        </button>
      </div>
    </div>
  );
}
