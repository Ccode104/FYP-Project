import React, { useState, useRef, useCallback } from 'react';
import { useToast } from '../components/ToastProvider';
import './DriveUpload.css'; // Reusing styles

interface YouTubeUploadProps {
  courseOfferingId: string | number;
  onUploadSuccess: () => void;
  onClose: () => void;
}

export default function YouTubeUpload({
  courseOfferingId,
  onUploadSuccess,
  onClose,
}: YouTubeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { push } = useToast();

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      if (!selectedFile.type.startsWith('video/')) {
        push({ kind: 'error', message: 'Please select a valid video file' });
        return;
      }
      setFile(selectedFile);
      setUploadProgress(0);
      if (!title) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    },
    [push, title]
  );

  const handleUpload = useCallback(async () => {
    if (!file || !title.trim() || !courseOfferingId) {
      push({ kind: 'error', message: 'Please fill all required fields' });
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', title);
      formData.append('course_offering_id', String(courseOfferingId));
      if (description.trim()) {
        formData.append('description', description);
      }

      const token = localStorage.getItem('auth:token') || '';
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      const url = `${apiBase.replace(/\/+$/, '').replace(/\/api$/, '')}/api/videos/upload-youtube`;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = event => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'));
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      push({ kind: 'success', message: 'Video uploaded successfully to YouTube (Unlisted)!' });
      setTimeout(onUploadSuccess, 1000);
    } catch (error: any) {
      push({ kind: 'error', message: error.message });
    } finally {
      setIsUploading(false);
    }
  }, [file, title, description, courseOfferingId, push, onUploadSuccess]);

  return (
    <div className="drive-upload-container youtube-upload">
      <h3 className="drive-upload-title">Upload Video to YouTube</h3>
      <p className="drive-upload-subtitle">
        The video will be uploaded to your YouTube channel as <strong>Unlisted</strong>.
      </p>

      <div
        className={`drive-upload-dropzone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files[0]); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} style={{ display: 'none' }} />
        {file ? (
          <div className="drive-upload-file-info">
            <div className="drive-upload-file-icon">🎥</div>
            <div className="drive-upload-file-details">
              <div className="drive-upload-file-name">{file.name}</div>
            </div>
            <button type="button" className="drive-upload-remove-btn" onClick={(e) => { e.stopPropagation(); setFile(null); }} disabled={isUploading}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        ) : (
          <div className="drive-upload-dropzone-content">
            <div className="drive-upload-dropzone-icon">▶️</div>
            <p>Drag and drop a video file here or click to browse</p>
          </div>
        )}
      </div>

      <div className="drive-upload-form">
        <div className="drive-upload-form-group">
          <label>Title *</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={isUploading} />
        </div>
        <div className="drive-upload-form-group">
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} disabled={isUploading} rows={3} />
        </div>
      </div>

      {isUploading && (
        <div className="drive-upload-progress-container">
          <div className="drive-upload-progress-bar">
            <div className="drive-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p>Uploading to YouTube... {uploadProgress}%</p>
        </div>
      )}

      <div className="drive-upload-actions">
        <button type="button" onClick={onClose} className="drive-upload-btn-cancel" disabled={isUploading}>Cancel</button>
        <button type="button" onClick={handleUpload} className="drive-upload-btn-submit" disabled={!file || !title.trim() || isUploading}>
          {isUploading ? 'Uploading...' : 'Upload to YouTube'}
        </button>
      </div>
    </div>
  );
}
