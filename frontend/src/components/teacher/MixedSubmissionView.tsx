import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import './MixedSubmissionView.css';

interface Assignment {
  id: number;
  title: string;
  assignment_type: string;
  max_score: number;
}

interface SubmissionFile {
  id: number;
  storage_path: string;
  filename: string;
  mime_type?: string;
  file_size?: number;
}

interface Submission {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  submitted_at?: string;
  final_score?: number;
  attempt?: number;
  status?: string;
  content?: string;
  files?: SubmissionFile[];
}

interface MixedSubmissionViewProps {
  assignment: Assignment;
  submission: Submission;
  onSelectFile?: (file: SubmissionFile) => void;
}

export default function MixedSubmissionView({
  assignment,
  submission,
  onSelectFile,
}: MixedSubmissionViewProps) {
  const [selectedFile, setSelectedFile] = useState<SubmissionFile | null>(null);

  useEffect(() => {
    if (submission.files && submission.files.length > 0 && !selectedFile) {
      setSelectedFile(submission.files[0]);
    }
  }, [submission.files, selectedFile]);

  const getFileIcon = (mimeType?: string, filename?: string) => {
    if (mimeType?.includes('pdf') || filename?.toLowerCase().endsWith('.pdf')) {
      return { icon: 'picture_as_pdf', color: '#e11d48' };
    }
    if (mimeType?.includes('python') || filename?.toLowerCase().endsWith('.py')) {
      return { icon: 'code', color: '#2563eb' };
    }
    if (mimeType?.includes('javascript') || filename?.toLowerCase().endsWith('.js')) {
      return { icon: 'code', color: '#f59e0b' };
    }
    if (mimeType?.includes('java') || filename?.toLowerCase().endsWith('.java')) {
      return { icon: 'code', color: '#ea580c' };
    }
    if (mimeType?.includes('cpp') || filename?.toLowerCase().endsWith('.cpp')) {
      return { icon: 'code', color: '#0d9488' };
    }
    if (mimeType?.includes('image') || filename?.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
      return { icon: 'image', color: '#10b981' };
    }
    if (mimeType?.includes('ppt') || filename?.toLowerCase().match(/\.(ppt|pptx)$/)) {
      return { icon: 'slideshow', color: '#f97316' };
    }
    if (mimeType?.includes('word') || filename?.toLowerCase().match(/\.(doc|docx)$/)) {
      return { icon: 'description', color: '#3b82f6' };
    }
    if (mimeType?.includes('text') || filename?.toLowerCase().endsWith('.txt')) {
      return { icon: 'article', color: '#6b7280' };
    }
    if (mimeType?.includes('zip') || filename?.toLowerCase().endsWith('.zip')) {
      return { icon: 'folder_zip', color: '#8b5cf6' };
    }
    return { icon: 'insert_drive_file', color: '#64748b' };
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (filename?: string) => {
    if (!filename) return '';
    return filename.split('.').pop()?.toUpperCase() || '';
  };

  const isPDF = (mimeType?: string, filename?: string) => {
    if (mimeType?.includes('pdf')) return true;
    if (filename?.toLowerCase().endsWith('.pdf')) return true;
    return false;
  };

  const isImage = (mimeType?: string, filename?: string) => {
    if (mimeType?.includes('image')) return true;
    if (filename?.match(/\.(png|jpg|jpeg|gif|webp)$/i)) return true;
    return false;
  };

  const handleFileClick = (file: SubmissionFile) => {
    setSelectedFile(file);
    onSelectFile?.(file);
  };

  const renderFilePreview = () => {
    if (!selectedFile) return null;

    if (isPDF(selectedFile.mime_type, selectedFile.filename)) {
      return (
        <div className="file-pdf-preview">
          <div className="pdf-preview-header">
            <span className="pdf-filename">{selectedFile.filename}</span>
            <a
              href={selectedFile.storage_path}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-open-link"
            >
              <span className="material-symbols-outlined">open_in_new</span>
              Open PDF
            </a>
          </div>
          <div className="pdf-embed-container">
            <iframe src={selectedFile.storage_path} title="PDF Viewer" className="pdf-iframe" />
          </div>
        </div>
      );
    }

    if (isImage(selectedFile.mime_type, selectedFile.filename)) {
      return (
        <div className="file-image-preview">
          <img src={selectedFile.storage_path} alt={selectedFile.filename} />
          <a
            href={selectedFile.storage_path}
            target="_blank"
            rel="noopener noreferrer"
            className="image-open-link"
          >
            <span className="material-symbols-outlined">open_in_new</span>
            View Full Size
          </a>
        </div>
      );
    }

    return (
      <div className="file-generic-preview">
        <span className="material-symbols-outlined">description</span>
        <p>Preview not available for this file type</p>
        <a
          href={selectedFile.storage_path}
          target="_blank"
          rel="noopener noreferrer"
          className="preview-link"
        >
          <span className="material-symbols-outlined">download</span>
          Download File
        </a>
      </div>
    );
  };

  const files = submission.files || [];

  return (
    <div className="mixed-submission-view">
      <div className="mixed-submission-header">
        <h3>Submission Files</h3>
        <span className="file-count">{files.length} file(s)</span>
      </div>

      <div className="files-grid">
        {files.map(file => {
          const { icon, color } = getFileIcon(file.mime_type, file.filename);
          return (
            <div
              key={file.id}
              className={`file-card ${selectedFile?.id === file.id ? 'active' : ''}`}
              onClick={() => handleFileClick(file)}
            >
              <div className="file-icon" style={{ backgroundColor: `${color}20`, color }}>
                <span className="material-symbols-outlined">{icon}</span>
              </div>
              <div className="file-details">
                <p className="file-name" title={file.filename}>
                  {file.filename}
                </p>
                <p className="file-meta">
                  {formatFileSize(file.file_size)} • {getFileExtension(file.filename)}
                </p>
              </div>
            </div>
          );
        })}
        {files.length === 0 && (
          <div className="no-files-message">
            <span className="material-symbols-outlined">folder_open</span>
            <p>No files submitted</p>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="preview-container">
          <div className="preview-header">
            <h4>{selectedFile.filename}</h4>
          </div>
          <div className="preview-content">{renderFilePreview()}</div>
        </div>
      )}

      {submission.content && (
        <div className="submission-content-section">
          <h4>Submission Notes</h4>
          <div className="submission-content-text">
            <p>{submission.content}</p>
          </div>
        </div>
      )}

      <div className="submission-history-section">
        <h4>Submission History</h4>
        <div className="history-item">
          <span className="material-symbols-outlined">history</span>
          <div className="history-details">
            <span className="history-attempt">Attempt {submission.attempt || 1}</span>
            <span className="history-date">
              {submission.submitted_at
                ? new Date(submission.submitted_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'N/A'}
            </span>
          </div>
          <span className={`status-badge status-${submission.status || 'pending'}`}>
            {submission.status || 'Pending'}
          </span>
        </div>
      </div>
    </div>
  );
}
