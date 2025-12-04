import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { apiFetch } from '../services/api';
import GitHubConnectButton from '../components/GitHubConnectButton';
import GitHubRepositorySelector from '../components/GitHubRepositorySelector';

type AssignmentSubmissionScreenRouteProp = RouteProp<RootStackParamList, 'AssignmentSubmission'>;

export default function AssignmentSubmissionScreen() {
  const route = useRoute<AssignmentSubmissionScreenRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { assignment } = route.params;

  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isGitHubConnected, setIsGitHubConnected] = useState<boolean | null>(null);
  const [selectedRepository, setSelectedRepository] = useState<any>(null);
  const [submissionMode, setSubmissionMode] = useState<'manual' | 'github'>('manual');

  // Check GitHub connection status when component mounts for mixed assignments
  useEffect(() => {
    if (assignment.assignment_type === 'mixed') {
      checkGitHubConnection();
    }
  }, [assignment]);

  const getSubmissionInstructions = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'Upload your PDF file to Google Drive, make it publicly accessible, and submit the shareable link.';
      case 'ppt':
        return 'Upload your PPT file to Google Drive, make it publicly accessible, and submit the shareable link.';
      case 'mixed':
        return 'Create a GitHub repository with your project files, make it public, and submit the repository URL.';
      default:
        return 'Submit your assignment according to the instructions provided.';
    }
  };

  // Check GitHub connection status
  const checkGitHubConnection = async () => {
    try {
      const response = await apiFetch<{ profile: any }>('/users/profile');
      const profile = response.profile;
      const connected = profile.github_connected && profile.github_username;
      setIsGitHubConnected(connected);
      if (connected) {
        setSubmissionMode('github');
      }
    } catch (err) {
      setIsGitHubConnected(false);
    }
  };

  // Handle GitHub connection change
  const handleGitHubConnectionChange = (connected: boolean) => {
    setIsGitHubConnected(connected);
    if (connected) {
      setSubmissionMode('github');
    } else {
      setSubmissionMode('manual');
    }
  };

  // Handle repository selection
  const handleRepositorySelect = (repository: any) => {
    setSelectedRepository(repository);
    setSubmissionMode('github');
  };

  const validateUrl = (url: string, type: string) => {
    if (!url.trim()) return false;

    try {
      const urlObj = new URL(url);

      if (type === 'mixed') {
        // GitHub repository URL validation
        return urlObj.hostname === 'github.com' && urlObj.pathname.split('/').filter(p => p).length >= 2;
      } else {
        // Google Drive shareable link validation
        return urlObj.hostname === 'drive.google.com' || urlObj.hostname === 'docs.google.com';
      }
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    // Handle GitHub repository submission
    if (assignment.assignment_type === 'mixed' && submissionMode === 'github') {
      if (!selectedRepository) {
        Alert.alert('Error', 'Please select a GitHub repository');
        return;
      }

      setSubmitting(true);
      try {
        await apiFetch('/submissions/submit/github-repo', {
          method: 'POST',
          body: { assignment_id: assignment.id, repo_url: selectedRepository.html_url }
        });

        Alert.alert('Success', 'Assignment submitted successfully!', [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            }
          }
        ]);
      } catch (err: any) {
        console.error('GitHub submission failed:', err);
        const errorMessage = err?.message || 'Submission failed. Please try again.';
        Alert.alert('Submission Failed', errorMessage);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Handle manual URL submission (fallback)
    const trimmedUrl = linkUrl.trim();

    if (!trimmedUrl) {
      Alert.alert('Error', 'Please provide a valid link');
      return;
    }

    if (!validateUrl(trimmedUrl, assignment.assignment_type)) {
      const expectedType = assignment.assignment_type === 'mixed' ? 'GitHub repository' : 'Google Drive shareable link';
      Alert.alert('Invalid Link', `Please provide a valid ${expectedType} URL.`);
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/submissions/submit/link', {
        method: 'POST',
        body: { assignment_id: assignment.id, url: trimmedUrl }
      });

      Alert.alert('Success', 'Assignment submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          }
        }
      ]);
    } catch (err: any) {
      console.error('Submission failed:', err);
      const errorMessage = err?.message || 'Submission failed. Please try again.';
      Alert.alert('Submission Failed', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getPlaceholder = () => {
    if (assignment.assignment_type === 'mixed') {
      return 'https://github.com/username/repository';
    } else {
      return 'https://drive.google.com/file/d/.../view?usp=sharing';
    }
  };

  const getLabel = () => {
    return assignment.assignment_type === 'mixed' ? 'GitHub Repository URL' : 'Google Drive Shareable Link';
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Submit Assignment</Text>
        <Text style={[styles.subtitle, { color: theme['text-secondary'] }]}>{assignment.title}</Text>
      </View>

      <View style={[styles.instructionCard, { backgroundColor: theme['bg-secondary'] }]}>
        <Text style={[styles.instructionTitle, { color: theme.text }]}>Submission Instructions</Text>
        <Text style={[styles.instructionText, { color: theme['text-secondary'] }]}>
          {getSubmissionInstructions(assignment.assignment_type)}
        </Text>
      </View>

      <View style={styles.form}>
        {assignment.assignment_type === 'mixed' ? (
          <>
            {/* GitHub Integration Section */}
            <Text style={[styles.label, { color: theme.text }]}>
              GitHub Repository Submission
            </Text>

            {isGitHubConnected === null ? (
              <View style={[styles.loadingContainer, { backgroundColor: theme['bg-secondary'] }]}>
                <Text style={[styles.loadingText, { color: theme['text-secondary'] }]}>
                  Checking GitHub connection...
                </Text>
              </View>
            ) : isGitHubConnected ? (
              <GitHubRepositorySelector
                onRepositorySelect={handleRepositorySelect}
                selectedRepository={selectedRepository}
              />
            ) : (
              <View style={[styles.githubConnectContainer, { backgroundColor: theme['bg-secondary'] }]}>
                <Text style={[styles.githubConnectText, { color: theme['text-secondary'] }]}>
                  Connect your GitHub account to select repositories directly, or enter a repository URL manually below.
                </Text>
                <GitHubConnectButton
                  onConnectionChange={handleGitHubConnectionChange}
                  style={styles.githubConnectButton}
                />
              </View>
            )}

            {/* Manual URL Input as Fallback */}
            <View style={styles.divider}>
              <Text style={[styles.dividerText, { color: theme['text-secondary'] }]}>
                Or enter repository URL manually
              </Text>
            </View>
          </>
        ) : null}

        <Text style={[styles.label, { color: theme.text }]}>
          {getLabel()}
        </Text>
        <View style={[styles.inputContainer, { borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, {
              backgroundColor: theme.bg,
              color: theme.text
            }]}
            value={linkUrl}
            onChangeText={setLinkUrl}
            placeholder={getPlaceholder()}
            placeholderTextColor={theme['text-secondary']}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            multiline={false}
            editable={!submitting}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
            disabled={submitting}
          >
            <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: (
                  (assignment.assignment_type === 'mixed' && submissionMode === 'github' && selectedRepository) ||
                  (validateUrl(linkUrl.trim(), assignment.assignment_type))
                ) && !submitting
                  ? theme.primary
                  : theme['text-secondary']
              }
            ]}
            onPress={handleSubmit}
            disabled={
              !(
                (assignment.assignment_type === 'mixed' && submissionMode === 'github' && selectedRepository) ||
                (validateUrl(linkUrl.trim(), assignment.assignment_type))
              ) || submitting
            }
          >
            <Text style={[styles.submitText, { color: theme.bg }]}>
              {submitting ? 'Submitting...' : `Submit ${assignment.assignment_type === 'mixed' ? 'Repository' : assignment.assignment_type.toUpperCase()}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  instructionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  input: {
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  githubConnectContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  githubConnectText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  githubConnectButton: {
    marginBottom: 8,
  },
  divider: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
  },
});