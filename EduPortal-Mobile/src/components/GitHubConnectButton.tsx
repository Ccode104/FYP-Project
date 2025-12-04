import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { apiFetch } from '../services/api';
import { StyleSheet } from 'react-native';


interface GitHubConnectButtonProps {
  onConnectionChange?: (connected: boolean, username?: string) => void;
  style?: any;
}

export default function GitHubConnectButton({
  onConnectionChange,
  style
}: GitHubConnectButtonProps) {
  const { theme } = useTheme();
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'connecting'>('checking');
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check GitHub connection status
  const checkGitHubConnection = useCallback(async () => {
    try {
      setConnectionStatus('checking');
      // Fetch user profile to check GitHub connection
      const response = await apiFetch<{ profile: any }>('/users/profile');
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

      console.log('GitHub Connect: Initiating OAuth flow');
      // Get OAuth URL from backend
      const response = await apiFetch<{ authUrl: string; state: string }>('/auth/github');
      console.log('GitHub Connect: Received authUrl:', response.authUrl);

      // Open OAuth URL in browser
      const supported = await Linking.canOpenURL(response.authUrl);
      console.log('GitHub Connect: Can open URL:', supported);
      if (supported) {
        await Linking.openURL(response.authUrl);
        // Show instructions to user
        Alert.alert(
          'Complete GitHub Connection',
          'Please complete the GitHub authorization in your browser. Once done, return to the app and the connection status will be updated.',
          [{ text: 'OK' }]
        );
        // Keep connecting status briefly, then check again
        setTimeout(() => {
          checkGitHubConnection();
        }, 2000);
      } else {
        Alert.alert('Error', 'Cannot open browser for GitHub authentication');
        setConnectionStatus('disconnected');
      }
    } catch (err: any) {
      console.error('GitHub Connect: Error initiating OAuth:', err);
      Alert.alert('Error', err.message || 'Failed to initiate GitHub connection');
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect GitHub
  const disconnectGitHub = async () => {
    Alert.alert(
      'Disconnect GitHub',
      'Are you sure you want to disconnect your GitHub account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await apiFetch('/auth/github', { method: 'DELETE' });
              setConnectionStatus('disconnected');
              setGithubUsername(null);
              onConnectionChange?.(false);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to disconnect GitHub');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
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
  const getButtonStyle = () => {
    let backgroundColor = theme.surface;
    let borderColor = theme.border;

    if (connectionStatus === 'connected') {
      backgroundColor = theme.success + '20';
      borderColor = theme.success;
    } else if (connectionStatus === 'connecting' || connectionStatus === 'checking') {
      backgroundColor = theme.primary + '20';
      borderColor = theme.primary;
    }

    return [styles.button, { backgroundColor, borderColor }];
  };

  // Get text color based on status
  const getTextColor = () => {
    if (connectionStatus === 'connected') {
      return theme.success;
    } else if (connectionStatus === 'connecting' || connectionStatus === 'checking') {
      return theme.primary;
    } else {
      return theme.text;
    }
  };

  // Initial check
  useEffect(() => {
    checkGitHubConnection();
  }, [checkGitHubConnection]);

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={handlePress}
      disabled={isLoading || connectionStatus === 'checking'}
      activeOpacity={0.7}
    >
      <View style={styles.buttonContent}>
        {(connectionStatus === 'connecting' || connectionStatus === 'checking') && (
          <ActivityIndicator
            size="small"
            color={connectionStatus === 'connecting' ? theme.primary : theme['text-secondary']}
            style={styles.spinner}
          />
        )}
        <Text style={[styles.buttonText, { color: getTextColor() }]}>
          {getButtonText()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  spinner: {
    marginRight: 8,
  },
});