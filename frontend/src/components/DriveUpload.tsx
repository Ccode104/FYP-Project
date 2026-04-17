import React, { useState, useRef, useCallback } from 'react';
import { useToast } from '../components/ToastProvider';
import './DriveUpload.css';

interface DriveUploadProps {
  courseOfferingId: string | number;
  onUploadSuccess: () => void;
  onClose: () => void;
}

interface UploadProgress {
  percentCompleted: number;
  progressEvent: ProgressEvent;
}

export default function DriveUpload({
  courseOfferingId,
  onUploadSuccess,
  onClose,
}: DriveUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState<{
    id: number;
    title: string;
    video_url: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { push } = useToast();

  // Handle file selection
  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      // Validate file type
      if (!selectedFile.type.startsWith('video/')) {
        push({ kind: 'error', message: 'Please select a valid video file' });
        return;
      }

      // Validate file size (2GB max for Drive)
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (selectedFile.size > maxSize) {
        push({ kind: 'error', message: 'Video file size must be less than 2GB' });
        return;
      }

      setFile(selectedFile);
      setUploadedVideo(null);
      setUploadProgress(0);
      // Auto-fill title from filename
      if (!title) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    },
    [push, title]
  );

  // Handle drag and drop
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  // Handle upload with XHR for progress tracking
  const handleUpload = useCallback(async () => {
    if (!file) {
      push({ kind: 'error', message: 'Please select a video file' });
      return;
    }
    if (!title.trim()) {
      push({ kind: 'error', message: 'Please enter a title for the video' });
      return;
    }
    if (!courseOfferingId) {
      push({ kind: 'error', message: 'Course offering ID is required' });
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
      const url = `${apiBase.replace(/\/+$/, '').replace(/\/api$/, '')}/api/videos/upload`;

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
          const status = xhr.status;
          const respText = xhr.responseText;
          let data: unknown = {};
          try {
            data = respText ? JSON.parse(respText) : {};
          } catch {
            data = { error: respText };
          }
          if (status >= 200 && status < 300) {
            resolve();
          } else {
            const err = new Error((data as { error?: string }).error || `HTTP ${status}`) as Error;
            (err as any).response = { data };
            reject(err);
          }
        };

        xhr.onerror = () => reject(new Error('Network error while uploading video'));
        xhr.send(formData);
      });

      // After successful upload, fetch video data (or use response)
      // We'll just call success and let parent reload videos
      push({ kind: 'success', message: 'Video uploaded successfully to Google Drive!' });
      setTimeout(() => {
        onUploadSuccess();
      }, 1000);
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload video';
      push({ kind: 'error', message: errorMessage });
    } finally {
      setIsUploading(false);
    }
  }, [file, title, description, courseOfferingId, push, onUploadSuccess]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Format duration (basic from file size if needed, but actual duration comes from Drive)
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="drive-upload-container">
      <h3 className="drive-upload-title">Upload Video to Google Drive</h3>
      <p className="drive-upload-subtitle">
        Select a video file to upload. The video will be stored in your Google Drive and associated
        with this course.
      </p>

      {/* Drag and Drop Area */}
      <div
        className={`drive-upload-dropzone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        {file ? (
          <div className="drive-upload-file-info">
            <div className="drive-upload-file-icon">🎥</div>
            <div className="drive-upload-file-details">
              <div className="drive-upload-file-name">{file.name}</div>
              <div className="drive-upload-file-size">{formatFileSize(file.size)}</div>
            </div>
            <button
              type="button"
              className="drive-upload-remove-btn"
              onClick={e => {
                e.stopPropagation();
                setFile(null);
                setUploadProgress(0);
              }}
              disabled={isUploading}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        ) : (
          <div className="drive-upload-dropzone-content">
            <div className="drive-upload-dropzone-icon">☁️</div>
            <p className="drive-upload-dropzone-text">Drag and drop a video file here</p>
            <p className="drive-upload-dropzone-subtext">or click to browse</p>
            <p className="drive-upload-dropzone-hint">
              Supported formats: MP4, WebM, MOV, AVI, MKV (Max 2GB)
            </p>
          </div>
        )}
      </div>

      {/* Form Fields */}
      <div className="drive-upload-form">
        <div className="drive-upload-form-group">
          <label htmlFor="video-title">Title *</label>
          <input
            id="video-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter video title"
            disabled={isUploading}
            required
          />
        </div>

        <div className="drive-upload-form-group">
          <label htmlFor="video-description">Description</label>
          <textarea
            id="video-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Enter video description (optional)"
            rows={3}
            disabled={isUploading}
          />
        </div>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="drive-upload-progress-container">
          <div className="drive-upload-progress-bar">
            <div className="drive-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <div className="drive-upload-progress-text">Uploading... {uploadProgress}%</div>
        </div>
      )}

      {/* Success Message and Video Preview */}
      {uploadedVideo && !isUploading && (
        <div className="drive-upload-success">
          <div className="drive-upload-success-message">
            <span className="drive-upload-success-icon">✅</span>
            <span>Video uploaded successfully!</span>
          </div>
          <div className="drive-upload-video-preview">
            <h4>Video Ready</h4>
            <p>
              <strong>Title:</strong> {uploadedVideo.title}
            </p>
            <p>
              <strong>ID:</strong> {uploadedVideo.id}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="drive-upload-actions">
        <button
          type="button"
          onClick={onClose}
          className="drive-upload-btn-cancel"
          disabled={isUploading}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleUpload}
          className="drive-upload-btn-submit"
          disabled={!file || !title.trim() || isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </div>
    </div>
  );
}
