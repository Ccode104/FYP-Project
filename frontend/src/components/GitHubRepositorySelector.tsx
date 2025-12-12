import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  updated_at: string;
  private: boolean;
  fork: boolean;
}

interface GitHubRepositorySelectorProps {
  onRepositorySelect: (repository: GitHubRepository) => void;
  selectedRepository?: GitHubRepository | null;
  className?: string;
}

interface RepositoriesResponse {
  repositories: GitHubRepository[];
  pagination: {
    page: number;
    per_page: number;
    has_more: boolean;
  };
}

export default function GitHubRepositorySelector({
  onRepositorySelect,
  selectedRepository,
  className = ''
}: GitHubRepositorySelectorProps) {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGitHubConnected, setIsGitHubConnected] = useState<boolean | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Check GitHub connection status
  const checkGitHubConnection = useCallback(async () => {
    console.log('DEBUG: Checking GitHub connection...');
    try {
      // Try to fetch repositories to check if GitHub is connected
      await apiFetch<RepositoriesResponse>('/api/github/repositories?page=1&per_page=1');
      console.log('DEBUG: GitHub connected');
      setIsGitHubConnected(true);
    } catch (err: any) {
      console.log('DEBUG: GitHub connection check failed:', err.message);
      if (err.message?.includes('GitHub not connected')) {
        setIsGitHubConnected(false);
      } else {
        setIsGitHubConnected(null); // Other error, assume connected but API issue
      }
    }
  }, []);

  // Fetch repositories from API
  const fetchRepositories = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      console.log('DEBUG: Fetching repositories...');
      const response = await apiFetch<RepositoriesResponse>(
        `/api/github/repositories?page=1&per_page=100&sort=updated&direction=desc`
      );

      const newRepos = response.repositories;
      console.log('DEBUG: Fetched repositories:', newRepos.length);
      setRepositories(newRepos);
      setFilteredRepositories([]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch repositories');
      console.error('Error fetching repositories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter repositories based on search query
  const filterRepositories = useCallback((query: string) => {
    console.log('DEBUG: Filtering repos with query:', query, 'repos length:', repositories.length);
    if (!query.trim()) {
      setFilteredRepositories([]);
      setShowDropdown(false);
      return;
    }

    const filtered = repositories.filter(repo =>
      repo.name.toLowerCase().includes(query.toLowerCase()) ||
      repo.description?.toLowerCase().includes(query.toLowerCase()) ||
      repo.language?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3); // Limit to 3 results
    console.log('DEBUG: Filtered repos:', filtered.length);
    setFilteredRepositories(filtered);
    setShowDropdown(filtered.length > 0);
  }, [repositories]);

  // Handle search input change
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    filterRepositories(text);
  };

  // Handle repository selection
  const handleRepositorySelect = (repository: GitHubRepository) => {
    console.log('DEBUG: Repository selected:', repository.name);
    onRepositorySelect(repository);
    setShowDropdown(false);
    setSearchQuery(repository.name); // Show selected repo name in input
  };


  // Initial load
  useEffect(() => {
    checkGitHubConnection();
  }, [checkGitHubConnection]);

  useEffect(() => {
    if (isGitHubConnected) {
      fetchRepositories();
    }
  }, [isGitHubConnected, fetchRepositories]);


  if (isGitHubConnected === null) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted mt-2">Checking GitHub connection...</p>
      </div>
    );
  }

  return (
    <div className={`github-repo-selector ${className}`} style={{ position: 'relative' }}>
      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim() && filteredRepositories.length > 0) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => {
            // Delay hiding to allow click on dropdown items
            setTimeout(() => setShowDropdown(false), 200);
          }}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: '#ffffff',
            color: '#333'
          }}
        />

        {/* Dropdown */}
        {showDropdown && filteredRepositories.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#ffffff',
              border: '1px solid #dee2e6',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto'
            }}
          >
            {filteredRepositories.map((repo) => (
              <div
                key={repo.id}
                onMouseDown={() => handleRepositorySelect(repo)}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid #f8f9fa',
                  cursor: 'pointer',
                  backgroundColor: selectedRepository?.id === repo.id ? '#e7f3ff' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = selectedRepository?.id === repo.id ? '#e7f3ff' : '#ffffff';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>
                    {repo.name}
                  </div>
                  {repo.description && (
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
                      {repo.description.length > 60 ? `${repo.description.substring(0, 60)}...` : repo.description}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    {repo.language && <span>{repo.language} • </span>}
                    Updated {formatDate(repo.updated_at)}
                    {repo.private && <span> • Private</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Repository Display */}
      {selectedRepository && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#e7f3ff',
          border: '1px solid #007bff',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#007bff'
        }}>
          <strong>Selected:</strong> {selectedRepository.name}
          {selectedRepository.description && (
            <div style={{ fontSize: '12px', marginTop: '4px', color: '#0056b3' }}>
              {selectedRepository.description}
            </div>
          )}
        </div>
      )}

      {/* Loading/Error States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '12px', color: '#666' }}>
          Loading repositories...
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: '12px', color: '#dc3545' }}>
          {error}
        </div>
      )}

      {!loading && !error && repositories.length === 0 && (
        <div style={{ textAlign: 'center', padding: '12px', color: '#666' }}>
          No repositories found. Make sure your GitHub account is connected and has public repositories.
        </div>
      )}
    </div>
  );
}


// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'today';
  if (diffDays === 2) return 'yesterday';
  if (diffDays <= 7) return `${diffDays - 1} days ago`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`;
  return `${Math.ceil(diffDays / 365)} years ago`;
}