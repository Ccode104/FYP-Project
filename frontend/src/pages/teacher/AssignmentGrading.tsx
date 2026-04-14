import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import './AssignmentGrading.css';

interface Assignment {
  id: number;
  title: string;
  description?: string;
  assignment_type: string;
  max_score: number;
  due_at?: string;
  course_name?: string;
  course_code?: string;
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
  student_name: string;
  student_email: string;
  github_repo?: string;
  submitted_at?: string;
  score?: number;
  final_score?: number;
  status?: string;
  comments?: string;
  files?: SubmissionFile[];
  attempt?: number;
  content?: string;
  is_late?: boolean;
}

interface RubricItem {
  name: string;
  score: number;
  maxScore: number;
}

export default function AssignmentGrading() {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rubrics, setRubrics] = useState<RubricItem[]>([
    { name: 'Logic', score: 25, maxScore: 30 },
    { name: 'Style', score: 18, maxScore: 20 },
    { name: 'Analysis', score: 42, maxScore: 50 },
  ]);
  const [selectedFile, setSelectedFile] = useState<SubmissionFile | null>(null);

  useEffect(() => {
    if (!courseId || !assignmentId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const assignmentData = await apiFetch<Assignment>(`/api/assignments/${assignmentId}`);
        setAssignment(assignmentData);
        setScore(assignmentData.max_score || 100);

        const submissionsData = await apiFetch<{ submissions: Submission[] }>(
          `/api/assignments/${assignmentId}/submissions`
        );
        const subs = submissionsData.submissions || [];
        setSubmissions(subs);

        if (subs.length > 0) {
          const pending = subs.find(s => !s.final_score) || subs[0];
          setSelectedSubmission(pending);
          setScore(pending.final_score || pending.score || 0);
          setFeedback(pending.comments || '');
          if (pending.files && pending.files.length > 0) {
            setSelectedFile(pending.files[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load:', err);
        setError('Failed to load assignment data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, assignmentId]);

  const handleGrade = async (publish: boolean = false) => {
    if (!selectedSubmission) return;

    setSaving(true);
    try {
      await apiFetch(`/api/assignments/submissions/${selectedSubmission.id}/grade`, {
        method: 'POST',
        body: JSON.stringify({
          score,
          comments: feedback,
          status: publish ? 'graded' : 'pending',
        }),
      });

      setSubmissions(prev =>
        prev.map(s =>
          s.id === selectedSubmission.id
            ? {
                ...s,
                final_score: score,
                comments: feedback,
                status: publish ? 'graded' : 'pending',
              }
            : s
        )
      );
      setSelectedSubmission(prev =>
        prev ? { ...prev, final_score: score, comments: feedback } : null
      );
    } catch (err) {
      console.error('Failed to grade:', err);
      setError('Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  const updateRubric = (index: number, newScore: number) => {
    setRubrics(prev => prev.map((r, i) => (i === index ? { ...r, score: newScore } : r)));
    const total = rubrics.reduce((sum, r) => sum + (r.index === index ? newScore : r.score), 0);
    setScore(total);
  };

  const getFileIcon = (mimeType?: string, filename?: string) => {
    if (mimeType?.includes('pdf') || filename?.toLowerCase().endsWith('.pdf')) {
      return { icon: 'description', color: 'rose' };
    }
    if (mimeType?.includes('python') || filename?.toLowerCase().endsWith('.py')) {
      return { icon: 'code', color: 'blue' };
    }
    if (mimeType?.includes('image') || filename?.match(/\.(png|jpg|jpeg|gif)$/i)) {
      return { icon: 'image', color: 'emerald' };
    }
    if (mimeType?.includes('ppt') || filename?.toLowerCase().endsWith('.pptx')) {
      return { icon: 'slideshow', color: 'orange' };
    }
    return { icon: 'description', color: 'slate' };
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (filename?: string) => {
    if (!filename) return '';
    const ext = filename.split('.').pop()?.toUpperCase() || '';
    return ext;
  };

  const isPDF = (mimeType?: string, filename?: string) => {
    if (mimeType?.includes('pdf')) return true;
    if (filename?.toLowerCase().endsWith('.pdf')) return true;
    return false;
  };

  const getSubmissionFiles = () => {
    if (!selectedSubmission?.files || selectedSubmission.files.length === 0) return [];
    return selectedSubmission.files;
  };

  const renderFilePreview = () => {
    if (!selectedFile) return null;

    // Handle GitHub type - show repo link
    if (
      selectedFile.filename === 'repository' ||
      selectedFile.storage_path?.includes('github.com')
    ) {
      return (
        <div className="github-preview">
          <div className="github-repo-card">
            <span className="material-symbols-outlined">inventory_2</span>
            <h3>GitHub Repository</h3>
            <p className="repo-url">{selectedFile.storage_path}</p>
            <a
              href={selectedFile.storage_path}
              target="_blank"
              rel="noopener noreferrer"
              className="repo-open-link"
            >
              <span className="material-symbols-outlined">open_in_new</span>
              Open Repository
            </a>
          </div>
        </div>
      );
    }

    if (isPDF(selectedFile.mime_type, selectedFile.filename)) {
      return (
        <div className="file-pdf-preview">
          <div className="pdf-preview-header">
            <a
              href={selectedFile.storage_path}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-open-link"
            >
              <span className="material-symbols-outlined">open_in_new</span>
              Open PDF in New Tab
            </a>
          </div>
          <div className="pdf-embed-container">
            <iframe src={selectedFile.storage_path} title="PDF Viewer" className="pdf-iframe" />
          </div>
        </div>
      );
    }

    if (
      selectedFile.mime_type?.includes('image') ||
      selectedFile.filename?.match(/\.(png|jpg|jpeg|gif)$/i)
    ) {
      return (
        <div className="file-image-preview">
          <img src={selectedFile.storage_path} alt={selectedFile.filename} />
        </div>
      );
    }

    return (
      <div className="file-generic-preview">
        <span className="material-symbols-outlined">description</span>
        <p>Preview not available</p>
        <a
          href={selectedFile.storage_path}
          target="_blank"
          rel="noopener noreferrer"
          className="preview-link"
        >
          Open in new tab
        </a>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="grading-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="submission-review-page">
      {/* Top Header */}
      <header className="submission-header">
        <div className="header-left">
          <div className="header-course">
            {assignment?.course_code}: {assignment?.course_name}
          </div>
          <h1 className="header-title">{assignment?.title}</h1>
          <div className="header-meta">
            <span className="student-name">{selectedSubmission?.student_name}</span>
            <span className="separator">•</span>
            <span className="submit-date">
              {selectedSubmission?.submitted_at
                ? new Date(selectedSubmission.submitted_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'N/A'}
            </span>
            {selectedSubmission?.is_late && <span className="late-badge">Late</span>}
          </div>
        </div>
        <div className="header-right">
          <button
            className="nav-btn"
            onClick={() => {
              const currentIndex = submissions.findIndex(s => s.id === selectedSubmission?.id);
              if (currentIndex > 0) {
                const prev = submissions[currentIndex - 1];
                setSelectedSubmission(prev);
                setScore(prev.final_score || prev.score || 0);
                setFeedback(prev.comments || '');
                if (prev.files && prev.files.length > 0) {
                  setSelectedFile(prev.files[0]);
                }
              }
            }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            className="nav-btn"
            onClick={() => {
              const currentIndex = submissions.findIndex(s => s.id === selectedSubmission?.id);
              if (currentIndex < submissions.length - 1) {
                const next = submissions[currentIndex + 1];
                setSelectedSubmission(next);
                setScore(next.final_score || next.score || 0);
                setFeedback(next.comments || '');
                if (next.files && next.files.length > 0) {
                  setSelectedFile(next.files[0]);
                }
              }
            }}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="submission-workspace">
        {/* Content Panel */}
        <div className="content-panel">
          {/* Files Section */}
          <section className="files-section">
            <h3 className="section-title">Files</h3>
            <div className="files-grid">
              {getSubmissionFiles().map((file, idx) => {
                const { icon, color } = getFileIcon(file.mime_type, file.filename);
                return (
                  <div
                    key={file.id}
                    className={`file-card ${selectedFile?.id === file.id ? 'active' : ''}`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <div className={`file-icon ${color}`}>
                      <span className="material-symbols-outlined">{icon}</span>
                    </div>
                    <div className="file-details">
                      <p className="file-name">{file.filename}</p>
                      <p className="file-meta">
                        {formatFileSize(file.file_size)} • {getFileExtension(file.filename)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {getSubmissionFiles().length === 0 && <p className="no-files">No files submitted</p>}
            </div>
          </section>

          {/* File Preview */}
          {selectedFile && (
            <section className="preview-section">
              <div className="preview-header">
                <h3 className="section-title">Submission Content</h3>
                <button className="expand-btn">Expand</button>
              </div>
              <div className="preview-content">{renderFilePreview()}</div>
            </section>
          )}

          {/* Student Comments */}
          {selectedSubmission?.content && (
            <section className="comments-section">
              <h3 className="section-title">Student Comments</h3>
              <div className="student-comments">
                <p>{selectedSubmission.content}</p>
              </div>
            </section>
          )}

          {/* History */}
          <section className="history-section">
            <h3 className="section-title">History</h3>
            <div className="history-list">
              {submissions
                .filter(s => s.attempt)
                .map((sub, idx) => (
                  <div
                    key={sub.id}
                    className={`history-item ${idx === 0 ? 'latest' : ''}`}
                    onClick={() => {
                      setSelectedSubmission(sub);
                      setScore(sub.final_score || sub.score || 0);
                      setFeedback(sub.comments || '');
                      if (sub.files && sub.files.length > 0) {
                        setSelectedFile(sub.files[0]);
                      }
                    }}
                  >
                    <span className={`dot ${idx === 0 ? 'active' : ''}`}></span>
                    <span className="attempt-label">
                      Attempt {sub.attempt} {idx === 0 ? '(Latest)' : ''}
                    </span>
                    <span className="attempt-date">
                      {sub.submitted_at
                        ? new Date(sub.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : ''}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        </div>

        {/* Grading Sidebar */}
        <aside className="grading-sidebar-panel">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Assessment</h3>

            <div className="score-display">
              <div className="score-value">
                <span className="score-number">{score}</span>
                <span className="score-divider">/</span>
                <span className="score-max">{assignment?.max_score || 100}</span>
              </div>
              <p className="score-label">Current Grade</p>
            </div>

            <div className="rubric-section">
              {rubrics.map((rubric, idx) => (
                <div key={idx} className="rubric-item">
                  <div className="rubric-header">
                    <span className="rubric-name">{rubric.name}</span>
                    <span className="rubric-score">
                      {rubric.score}/{rubric.maxScore}
                    </span>
                  </div>
                  <div className="rubric-bar">
                    <div
                      className="rubric-fill"
                      style={{ width: `${(rubric.score / rubric.maxScore) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="feedback-section">
              <label className="feedback-label">Feedback</label>
              <textarea
                className="feedback-input"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Type private comment..."
                rows={5}
              />
            </div>

            <div className="action-buttons">
              <button
                className="btn-submit-grade"
                onClick={() => handleGrade(true)}
                disabled={saving}
              >
                {saving ? 'Submitting...' : 'Submit Final Grade'}
              </button>
              <button className="btn-revision" onClick={() => handleGrade(false)} disabled={saving}>
                Request Revision
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="submission-footer">
        <span>© 2024 Unified Academic</span>
        <div className="footer-links">
          <a href="#">Support</a>
          <a href="#">Legal</a>
        </div>
      </footer>
    </div>
  );
}
