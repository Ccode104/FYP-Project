import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/ToastProvider';
import './AssignmentDetails.css';

interface Assignment {
  id: number;
  title: string;
  description?: string;
  assignment_type: string;
  total_points?: number;
  max_score?: number;
  due_at?: string;
  release_at?: string;
  allow_multiple_submissions?: boolean;
  created_at?: string;
  course_offering_id: number;
  course_code?: string;
  course_name?: string;
  faculty_name?: string;
}

export default function AssignmentDetails() {
  const { courseId, assignmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!courseId || !assignmentId) {
      setError('Invalid course or assignment ID');
      setLoading(false);
      return;
    }

    const fetchAssignment = async () => {
      try {
        const data = await apiFetch<Assignment>(`/api/assignments/${assignmentId}`);
        setAssignment(data);
      } catch (err: any) {
        console.error('Failed to fetch assignment:', err);
        setError(err.message || 'Failed to load assignment details');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [courseId, assignmentId]);

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

  const handleSubmitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) {
      toast?.push({ kind: 'error', message: 'Please provide a valid link' });
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/api/submissions/submit/link', {
        method: 'POST',
        body: { assignment_id: Number(assignmentId), url: linkUrl.trim() }
      });
      toast?.push({ kind: 'success', message: 'Assignment submitted successfully!' });
      setLinkUrl('');
    } catch (err: any) {
      console.error('Submission failed:', err);
      toast?.push({ kind: 'error', message: err?.message || 'Submission failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="assignment-details-page">
        <div className="container">
          <div className="loading">Loading assignment details...</div>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="assignment-details-page">
        <div className="container">
          <div className="error">
            <h2>Error</h2>
            <p>{error || 'Assignment not found'}</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/courses/${courseId}`)}
            >
              Back to Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="assignment-details-page">
      <div className="container">
        {/* Header */}
        <div className="assignment-header">
          <button
            className="back-button"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            ← Back to Course
          </button>
          <div className="assignment-title-section">
            <h1>{assignment.title}</h1>
            <div className="assignment-meta">
              <span className="course-info">
                {assignment.course_code} - {assignment.course_name}
              </span>
              {assignment.faculty_name && (
                <span className="faculty-info">
                  Instructor: {assignment.faculty_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Assignment Info Cards */}
        <div className="assignment-info-grid">
          <div className="info-card">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
            </div>
            <div className="card-content">
              <h3>Assignment Type</h3>
              <p>{getAssignmentTypeDisplay(assignment.assignment_type)}</p>
            </div>
          </div>

          <div className="info-card">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10,8 16,12 10,16 10,8"/>
              </svg>
            </div>
            <div className="card-content">
              <h3>Points</h3>
              <p>{assignment.total_points || assignment.max_score || 100} points</p>
            </div>
          </div>

          {assignment.due_at && (
            <div className="info-card">
              <div className="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <div className="card-content">
                <h3>Due Date</h3>
                <p>{new Date(assignment.due_at).toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="info-card">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23,4 23,10 17,10"/>
                <polyline points="1,20 1,14 7,14"/>
                <path d="M20.49,9A9,9 0 0,0 5.64,5.64L1,10m22,4l-4.64,4.36A9,9 0 0,1 3.51,15"/>
              </svg>
            </div>
            <div className="card-content">
              <h3>Multiple Submissions</h3>
              <p>{assignment.allow_multiple_submissions ? 'Allowed' : 'Not Allowed'}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {assignment.description && (
          <div className="description-section">
            <h2>Description</h2>
            <div className="description-content">
              {assignment.description}
            </div>
          </div>
        )}

        {/* Submission Instructions */}
        <div className="instructions-section">
          <h2>Submission Instructions</h2>
          <div className="instructions-content">
            <div className="instruction-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11,4H4a2,2 0 0 0-2,2v14a2,2 0 0 0,2,2h14a2,2 0 0 0,2-2V13"/>
                <path d="M18.5,2.5a2.121,2.121 0 0,1 3,3L12,15l-4,1,1-4,9.5-9.5z"/>
              </svg>
            </div>
            <div className="instruction-text">
              {getSubmissionInstructions(assignment.assignment_type)}
            </div>
          </div>
        </div>

        {/* Submission Form for Link-based Assignments */}
        {(assignment.assignment_type === 'pdf' || assignment.assignment_type === 'ppt' || assignment.assignment_type === 'mixed') && user?.role === 'student' && (
          <div className="submission-section">
            <h2>Submit Assignment</h2>
            <form onSubmit={handleSubmitLink} className="submission-form">
              <div className="form-group">
                <label htmlFor="submission-link">
                  {assignment.assignment_type === 'mixed' ? 'GitHub Repository URL' : 'Google Drive Shareable Link'}
                </label>
                <input
                  id="submission-link"
                  type="url"
                  className="form-input"
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
              <button
                type="submit"
                className="btn btn-submit-link"
                disabled={!linkUrl.trim() || submitting}
              >
                {submitting ? 'Submitting...' : `Submit ${assignment.assignment_type === 'mixed' ? 'Repository' : assignment.assignment_type.toUpperCase()}`}
              </button>
            </form>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          {assignment.assignment_type === 'code' && user?.role === 'student' && (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/courses/${courseId}/assignments/${assignmentId}/editor`)}
            >
              Open Code Editor
            </button>
          )}

          <button
            className="btn"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            Back to Assignments
          </button>
        </div>
      </div>
    </div>
  );
}