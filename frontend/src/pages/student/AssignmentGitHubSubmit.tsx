import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import './AssignmentGitHubSubmit.css';

interface Assignment {
  id: number;
  title: string;
  description: string;
  course_code: string;
  course_name: string;
  due_at: string;
  max_score: number;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  private: boolean;
  updated_at: string;
}

interface Submission {
  id: number;
  submitted_at: string;
  status: string;
  repo_url?: string;
  repo_name?: string;
}

export default function AssignmentGitHubSubmit() {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // GitHub state
  const [githubConnected, setGitHubConnected] = useState(false);
  const [githubUsername, setGitHubUsername] = useState<string | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  // Existing submission
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(true);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!courseId || !assignmentId) return;
    // Save return URL for after OAuth
    sessionStorage.setItem(
      'github_auth_return_url',
      `/courses/${courseId}/assignments/${assignmentId}/submit-github`
    );

    async function init() {
      await loadAssignmentAndGitHub();
      checkGitHubConnection();
      await loadExistingSubmission();
    }
    init();
  }, [courseId, assignmentId]);

  async function loadExistingSubmission() {
    setLoadingSubmission(true);
    try {
      const data = await apiFetch<Submission[]>(
        `/api/student/assignments/${assignmentId}/submissions`
      );
      if (data && data.length > 0) {
        const latest = data[0];
        setExistingSubmission({
          id: latest.id,
          submitted_at: latest.submitted_at,
          status: latest.status,
          repo_url: (latest as any).repo_url,
          repo_name: (latest as any).repo_name,
        });
      }
    } catch (err) {
      console.error('Failed to load submission:', err);
    } finally {
      setLoadingSubmission(false);
    }
  }

  async function handleRemoveSubmission() {
    if (!existingSubmission?.id) return;
    if (
      !confirm('Are you sure you want to remove this submission? You will need to submit again.')
    ) {
      return;
    }

    setRemoving(true);
    try {
      await apiFetch(`/api/submissions/${existingSubmission.id}`, {
        method: 'DELETE',
      });
      setExistingSubmission(null);
      setSubmitSuccess(false);
    } catch (err) {
      console.error('Failed to remove submission:', err);
      alert('Failed to remove submission. Please try again.');
      // Reload to check actual state
      await loadExistingSubmission();
    } finally {
      setRemoving(false);
    }
  }

  useEffect(() => {
    if (searchTerm) {
      const filtered = repos.filter(
        repo =>
          repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          repo.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredRepos(filtered);
    } else {
      setFilteredRepos(repos);
    }
  }, [searchTerm, repos]);

  async function loadAssignmentAndGitHub() {
    if (!courseId || !assignmentId) return;

    try {
      const data = await apiFetch<Assignment>(`/api/assignments/${assignmentId}`);
      setAssignment(data);
    } catch (err) {
      console.error('Failed to load assignment:', err);
    } finally {
      setLoading(false);
    }
  }

  async function checkGitHubConnection() {
    setLoadingRepos(true);
    setRepoError(null);
    try {
      const data = await apiFetch<{ repositories: GitHubRepo[] }>('/api/github/repositories');
      setRepos(data.repositories || []);
      setFilteredRepos(data.repositories || []);
      setGitHubConnected(true);
      // Try to get username from first repo
      if (data.repositories && data.repositories.length > 0) {
        const username = data.repositories[0].full_name.split('/')[0];
        setGitHubUsername(username);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load repos';
      if (errorMsg.includes('GitHub not connected') || errorMsg.includes('401')) {
        setGitHubConnected(false);
        setRepoError('Connect your GitHub account to submit');
      } else {
        setRepoError(errorMsg);
      }
    } finally {
      setLoadingRepos(false);
    }
  }

  async function initiateGitHubOAuth() {
    try {
      // Call the backend to get OAuth URL (includes auth token)
      const data = await apiFetch<{ authUrl: string }>('/api/auth/github');
      if (data.authUrl) {
        // Redirect to GitHub OAuth
        window.location.href = data.authUrl;
      }
    } catch (err) {
      console.error('Failed to initiate GitHub OAuth:', err);
      alert('Failed to connect GitHub. Please try again.');
    }
  }

  async function handleSubmitRepo(e: React.FormEvent) {
    e.preventDefault();
    if (!assignmentId || !selectedRepo) return;

    setSubmitting(true);
    try {
      await apiFetch('/api/submissions/submit/github-repo', {
        method: 'POST',
        body: {
          assignment_id: Number(assignmentId),
          repo_url: selectedRepo.html_url,
          branch: 'main',
        },
      });
      // Reload existing submission to show "Already Submitted" section
      await loadExistingSubmission();
      setSubmitSuccess(false);
    } catch (err) {
      console.error('Failed to submit repo:', err);
      alert('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="assignment-github-submit">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!assignment) {
    return <div>Assignment not found</div>;
  }

  return (
    <div className="assignment-github-submit">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to={`/courses/${courseId}/assignments`}>Assignments</Link>
        <span>/</span>
        <span>GitHub Submission</span>
      </div>

      {/* Hero */}
      <div className="hero">
        <div className="hero-badge">GitHub Assignment</div>
        <div className="hero-meta">
          {assignment.course_code} • {assignment.course_name}
        </div>
        <h1>{assignment.title}</h1>
        {assignment.description && <p className="hero-note">{assignment.description}</p>}
      </div>

      {/* Existing Submission Status */}
      {!loadingSubmission && existingSubmission && !submitSuccess && (
        <div className="existing-submission">
          <div className="existing-submission-header">
            <span className="material-symbols-outlined">check_circle</span>
            <h3>Already Submitted</h3>
          </div>
          <div className="existing-submission-details">
            {existingSubmission.repo_name && (
              <div className="existing-submission-repo">
                <span className="label">Repository:</span>
                <span className="value">{existingSubmission.repo_name}</span>
              </div>
            )}
            {existingSubmission.repo_url && (
              <div className="existing-submission-url">
                <span className="label">URL:</span>
                <a href={existingSubmission.repo_url} target="_blank" rel="noopener noreferrer">
                  {existingSubmission.repo_url}
                </a>
              </div>
            )}
            <div className="existing-submission-date">
              <span className="label">Submitted:</span>
              <span className="value">
                {new Date(existingSubmission.submitted_at).toLocaleString()}
              </span>
            </div>
            <div className="existing-submission-status">
              <span className="label">Status:</span>
              <span className={`value status-${existingSubmission.status}`}>
                {existingSubmission.status}
              </span>
            </div>
            <div className="existing-submission-actions" style={{ marginTop: '16px' }}>
              <button
                className="remove-submission-btn"
                onClick={handleRemoveSubmission}
                disabled={removing}
              >
                {removing ? 'Removing...' : 'Remove Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {submitSuccess && !existingSubmission && (
        <div className="success-message">
          <div className="success-icon">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <h2>Repository Submitted Successfully!</h2>
          <p>
            Your submission for <strong>{selectedRepo?.name}</strong> has been recorded.
          </p>
          <div className="success-actions">
            <button
              className="submit-button"
              onClick={() => navigate(`/courses/${courseId}/assignments`)}
            >
              Back to Assignments
            </button>
          </div>
        </div>
      )}

      <div className="grid">
        {/* GitHub Submission Form */}
        <div className="github-form">
          <div className="form-header">
            <div className="github-icon-section">
              <div className="github-logo">
                <svg viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02 .005 2.047 .138 3.006 .404 2.291-1.552 3.297-1.23 3.297-1.23 .653 1.653 .242 2.874 .118 3.176 .77 .84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921 .43 .372 .823 1.102 .823 2.222v3.293c0 .319 .192 .694 .801 .576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <div>
                <h3>GitHub Submission</h3>
                <p className="text-xs">Select a repository to submit</p>
              </div>
            </div>
          </div>

          {/* GitHub Connection Status */}
          {!githubConnected && !loadingRepos && (
            <div className="github-connect-section">
              <div className="connect-prompt">
                <span className="material-symbols-outlined">link</span>
                <p>Connect your GitHub account to submit assignments</p>
              </div>
              <button type="button" className="connect-github-btn" onClick={initiateGitHubOAuth}>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="currentColor"
                    d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02 .005 2.047 .138 3.006 .404 2.291-1.552 3.297-1.23 3.297-1.23 .653 1.653 .242 2.874 .118 3.176 .77 .84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921 .43 .372 .823 1.102 .823 2.222v3.293c0 .319 .192 .694 .801 .576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                  />
                </svg>
                Connect GitHub
              </button>
              {repoError && <p className="error-text">{repoError}</p>}
            </div>
          )}

          {/* Load Repos Button */}
          {githubConnected && repos.length === 0 && !loadingRepos && !existingSubmission && (
            <div className="load-repos-section">
              <button type="button" className="load-repos-btn" onClick={checkGitHubConnection}>
                Load Your Repositories
              </button>
            </div>
          )}

          {/* Loading Repos */}
          {loadingRepos && (
            <div className="loading-repos">
              <div className="spinner"></div>
              <p>Loading your repositories...</p>
            </div>
          )}

          {/* Repository List */}
          {githubConnected && repos.length > 0 && !existingSubmission && (
            <form onSubmit={handleSubmitRepo}>
              {/* Search */}
              <div className="repo-search">
                <span className="material-symbols-outlined">search</span>
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Repo List */}
              <div className="repo-list">
                {filteredRepos.length === 0 ? (
                  <p className="no-repos">No repositories found</p>
                ) : (
                  filteredRepos.map(repo => (
                    <div
                      key={repo.id}
                      className={`repo-item ${selectedRepo?.id === repo.id ? 'selected' : ''}`}
                      onClick={() => setSelectedRepo(repo)}
                    >
                      <div className="repo-info">
                        <span className="repo-name">
                          {repo.private && (
                            <span className="material-symbols-outlined lock-icon">lock</span>
                          )}
                          {repo.name}
                        </span>
                        <span className="repo-description">
                          {repo.description || 'No description'}
                        </span>
                      </div>
                      <div className="repo-meta">
                        {repo.language && <span className="repo-language">{repo.language}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Submit */}
              <div className="submit-actions">
                <button
                  type="submit"
                  className="submit-button"
                  disabled={submitting || !selectedRepo}
                >
                  {submitting ? 'Submitting...' : 'Submit Repository'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Stats Card */}
        <div className="stats-card">
          <h3>Assignment Details</h3>
          <div className="stat-row">
            <span>Due Date</span>
            <span>{new Date(assignment.due_at).toLocaleDateString()}</span>
          </div>
          <div className="stat-row">
            <span>Max Score</span>
            <span>{assignment.max_score} points</span>
          </div>
          <div className="stat-row">
            <span>Type</span>
            <span>GitHub Repository</span>
          </div>

          {githubConnected && githubUsername && (
            <div className="connected-github">
              <span className="material-symbols-outlined">check_circle</span>
              <span>Connected as @{githubUsername}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
