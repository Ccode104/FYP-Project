import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';

interface GitHubConnectButtonProps {
  onConnectionChange?: (connected: boolean, username?: string) => void;
  className?: string;
}

export default function GitHubConnectButton({
  onConnectionChange,
  className = ''
}: GitHubConnectButtonProps) {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'connecting'>('checking');
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check GitHub connection status
  const checkGitHubConnection = useCallback(async () => {
    try {
      setConnectionStatus('checking');
      // Fetch user profile to check GitHub connection
      const response = await apiFetch<{ profile: any }>('/api/users/profile');
      const profile = response.profile;

      if (profile.github_connected && profile.github_username) {
        setGithubUsername(profile.github_username);
        setConnectionStatus('connected');
        onConnectionChange?.(true, profile.github_username);
      } else {
        setConnectionStatus('disconnected');
        setGithubUsername(null);
        onConnectionChange?.(false);
      }
    } catch (err: any) {
      setConnectionStatus('disconnected');
      setGithubUsername(null);
      onConnectionChange?.(false);
    }
  }, [onConnectionChange]);

  // Initiate GitHub OAuth flow
  const connectGitHub = async () => {
    try {
      setIsLoading(true);
      setConnectionStatus('connecting');

      // Get OAuth URL from backend
      const response = await apiFetch<{ authUrl: string; state: string }>('/api/auth/github');

      // Open OAuth URL in new window
      const authWindow = window.open(
        response.authUrl,
        'github-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!authWindow) {
        alert('Please allow popups for this site to connect GitHub');
        setConnectionStatus('disconnected');
        return;
      }

      // Poll for completion
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);
          // Wait a bit for backend to process, then check connection
          setTimeout(() => {
            checkGitHubConnection();
          }, 2000);
        }
      }, 1000);

    } catch (err: any) {
      alert('Failed to initiate GitHub connection: ' + (err.message || 'Unknown error'));
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect GitHub
  const disconnectGitHub = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub account?')) {
      return;
    }

    try {
      setIsLoading(true);
      await apiFetch('/api/auth/github', { method: 'DELETE' });
      setConnectionStatus('disconnected');
      setGithubUsername(null);
      onConnectionChange?.(false);
    } catch (err: any) {
      alert('Failed to disconnect GitHub: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle button press
  const handlePress = () => {
    if (connectionStatus === 'connected') {
      disconnectGitHub();
    } else if (connectionStatus === 'disconnected') {
      connectGitHub();
    }
  };

  // Get button text based on status
  const getButtonText = () => {
    switch (connectionStatus) {
      case 'checking':
        return 'Checking...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return githubUsername ? `Connected to @${githubUsername}` : 'Connected';
      case 'disconnected':
        return 'Connect GitHub';
      default:
        return 'Connect GitHub';
    }
  };

  // Get button style based on status
  const getButtonClasses = () => {
    let baseClasses = 'btn github-connect-btn';
    let statusClasses = '';

    if (connectionStatus === 'connected') {
      statusClasses = 'btn-success';
    } else if (connectionStatus === 'connecting' || connectionStatus === 'checking') {
      statusClasses = 'btn-primary';
    } else {
      statusClasses = 'btn-outline-secondary';
    }

    return `${baseClasses} ${statusClasses} ${className}`.trim();
  };

  // Initial check
  useEffect(() => {
    checkGitHubConnection();
  }, [checkGitHubConnection]);

  return (
    <button
      className={getButtonClasses()}
      onClick={handlePress}
      disabled={isLoading || connectionStatus === 'checking'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minHeight: '44px',
        fontSize: '14px',
        fontWeight: '500'
      }}
    >
      {(connectionStatus === 'connecting' || connectionStatus === 'checking') && (
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      )}
      <span>{getButtonText()}</span>
    </button>
  );
}