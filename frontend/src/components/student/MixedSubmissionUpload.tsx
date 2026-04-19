import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useToast } from '../ToastProvider';
import './MixedSubmissionUpload.css';

interface MixedSubmissionUploadProps {
  assignmentId?: string | number;
  onSubmitSuccess?: () => void;
}

interface UploadedFile {
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
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
  const [uploadToDrive, setUploadToDrive] = useState(false);
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
    checkGoogleStatus();
  }, []);

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

  const getFileIcon = (file: File) => {
    const name = file.name.toLowerCase();
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

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('assignmentId', effectiveAssignmentId);
      if (content.trim()) {
        formData.append('content', content);
      }
      if (uploadToDrive && googleConnected) {
        formData.append('uploadToDrive', 'true');
      }

      files.forEach((uploadFile, index) => {
        formData.append('files', uploadFile.file);
      });

      const token = localStorage.getItem('auth:token') || '';
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      const url = `${apiBase.replace(/\/+$/, '')}/api/submissions/submit/mixed`;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = event => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded * 100) / event.total);
            setFiles(prev =>
              prev.map((f, i) =>
                i < files.length ? { ...f, progress: percent, status: 'uploading' as const } : f
              )
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setFiles(prev =>
              prev.map(f => ({ ...f, status: 'completed' as const, progress: 100 }))
            );
            resolve();
          } else {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.error || `Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));

        xhr.open('POST', url);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      push({ kind: 'success', message: 'Assignment submitted successfully!' });

      setTimeout(() => {
        onSubmitSuccess?.();
      }, 1000);
    } catch (error) {
      console.error('Submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit assignment';
      push({ kind: 'error', message: errorMessage });

      setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const })));
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

      {files.length > 0 && (
        <div className="files-list">
          <h4>Selected Files ({files.length})</h4>
          {files.map((uploadFile, index) => {
            const { icon, color } = getFileIcon(uploadFile.file);
            return (
              <div key={index} className={`file-item ${uploadFile.status}`}>
                {uploadFile.preview ? (
                  <div className="file-preview-thumb">
                    <img src={uploadFile.preview} alt={uploadFile.file.name} />
                  </div>
                ) : (
                  <div className="file-icon" style={{ backgroundColor: `${color}20`, color }}>
                    <span className="material-symbols-outlined">{icon}</span>
                  </div>
                )}
                <div className="file-info">
                  <span className="file-name">{uploadFile.file.name}</span>
                  <span className="file-size">{formatFileSize(uploadFile.file.size)}</span>
                  {uploadFile.status === 'uploading' && (
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${uploadFile.progress}%` }} />
                    </div>
                  )}
                </div>
                {uploadFile.status === 'completed' && (
                  <span className="material-symbols-outlined success-icon">check_circle</span>
                )}
                {uploadFile.status === 'error' && (
                  <span className="material-symbols-outlined error-icon">error</span>
                )}
                {uploadFile.status === 'pending' && (
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={e => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

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
            <label className="drive-option">
              <input
                type="checkbox"
                checked={uploadToDrive}
                onChange={e => setUploadToDrive(e.target.checked)}
                disabled={files.length === 0}
              />
              <span className="material-symbols-outlined">cloud</span>
              Upload to Google Drive (gives teacher access)
            </label>
          ) : (
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
          )}
        </div>
      )}

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
