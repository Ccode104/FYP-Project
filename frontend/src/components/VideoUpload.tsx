import { useState, useRef, useCallback } from 'react';
import { uploadVideo } from '../services/videos';
import { useToast } from './ToastProvider';
import './VideoUpload.css';

interface VideoUploadProps {
  courseOfferingId: string | number;
  onUploadSuccess?: (video: any) => void;
  onClose?: () => void;
}

export default function VideoUpload({ courseOfferingId, onUploadSuccess, onClose }: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { push } = useToast();

  // Handle file selection
  const handleFileSelect = useCallback((selectedFile: File) => {
    // Validate file type
    if (!selectedFile.type.startsWith('video/')) {
      push({ kind: 'error', message: 'Please select a valid video file' });
      return;
    }

    // Validate file size (500MB max)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (selectedFile.size > maxSize) {
      push({ kind: 'error', message: 'Video file size must be less than 500MB' });
      return;
    }

    setFile(selectedFile);
    setUploadedVideo(null);
    setUploadProgress(0);
  }, [push]);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  // Handle upload
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
      // Create FormData
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', title);
      formData.append('course_offering_id', String(courseOfferingId));
      if (description.trim()) {
        formData.append('description', description);
      }
      // Upload with progress tracking
      const response = await uploadVideo(formData, (progressData: any) => {
        setUploadProgress(progressData.percentCompleted || 0);
      });
      // Success
      setUploadedVideo(response.video);
      push({ kind: 'success', message: 'Video uploaded successfully!' });
      // Call success callback if provided
      if (onUploadSuccess) {
        onUploadSuccess(response.video);
      }
      // Reset form after a delay
      setTimeout(() => {
        setFile(null);
        setTitle('');
        setDescription('');
        setUploadProgress(0);
        setUploadedVideo(null);
        if (onClose) {
          onClose();
        }
      }, 3000);
    } catch (error: any) {
      console.error('Upload error:', error, error?.response?.data);
      const backendMsg = error?.response?.data;
      const message = typeof backendMsg === 'string'
        ? backendMsg
        : backendMsg && typeof backendMsg.error === 'string'
          ? backendMsg.error + (backendMsg.message ? (': ' + backendMsg.message) : '')
          : backendMsg && Object.keys(backendMsg).length
            ? JSON.stringify(backendMsg)
            : error?.message || 'Failed to upload video';
      push({ kind: 'error', message });
    } finally {
      setIsUploading(false);
    }
  }, [file, title, description, courseOfferingId, push, onUploadSuccess, onClose]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format duration
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
    <div className="video-upload-container">
      <h2 className="video-upload-title">Upload Video Lecture</h2>

      {/* Drag and Drop Area */}
      <div
        className={`video-upload-dropzone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
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
          <div className="file-info">
            <div className="file-icon">🎥</div>
            <div className="file-details">
              <div className="file-name">{file.name}</div>
              <div className="file-size">{formatFileSize(file.size)}</div>
            </div>
          </div>
        ) : (
          <div className="dropzone-content">
            <div className="dropzone-icon">📤</div>
            <p className="dropzone-text">Drag and drop a video file here</p>
            <p className="dropzone-subtext">or click to browse</p>
            <p className="dropzone-hint">Supported formats: MP4, WebM, MOV, AVI, MKV (Max 500MB)</p>
          </div>
        )}
      </div>

      {/* Form Fields */}
      <div className="video-upload-form">
        <div className="form-group">
          <label htmlFor="video-title">Title *</label>
          <input
            id="video-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            disabled={isUploading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="video-description">Description</label>
          <textarea
            id="video-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter video description (optional)"
            rows={4}
            disabled={isUploading}
          />
        </div>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="upload-progress-container">
          <div className="upload-progress-bar">
            <div
              className="upload-progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="upload-progress-text">
            Uploading... {uploadProgress}%
          </div>
        </div>
      )}

      {/* Success Message and Video Preview */}
      {uploadedVideo && !isUploading && (
        <div className="upload-success">
          <div className="success-message">
            <span className="success-icon">✅</span>
            <span>Video uploaded successfully!</span>
          </div>
          <div className="video-preview">
            <h3>Video Preview</h3>
            <div className="video-info">
              <p><strong>Title:</strong> {uploadedVideo.title}</p>
              {uploadedVideo.description && (
                <p><strong>Description:</strong> {uploadedVideo.description}</p>
              )}
              {uploadedVideo.duration && (
                <p><strong>Duration:</strong> {formatDuration(uploadedVideo.duration)}</p>
              )}
              <p><strong>Uploaded:</strong> {new Date(uploadedVideo.upload_timestamp).toLocaleString()}</p>
            </div>
            <div className="video-player-container">
              <video
                src={uploadedVideo.video_url}
                controls
                className="video-preview-player"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="video-upload-actions">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={isUploading}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleUpload}
          className="btn-primary"
          disabled={!file || !title.trim() || isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </div>
    </div>
  );
}

