import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { apiFetch } from '../services/api';

interface AssignmentSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: {
    id: number;
    title: string;
    assignment_type: string;
  } | null;
  onSuccess?: () => void;
}

export default function AssignmentSubmissionModal({
  isOpen,
  onClose,
  assignment,
  onSuccess
}: AssignmentSubmissionModalProps) {
  const { theme } = useTheme();
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Guard against null assignment
  if (!assignment) {
    return null;
  }

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
            setLinkUrl('');
            onClose();
            onSuccess?.();
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

  const handleClose = () => {
    if (!submitting) {
      setLinkUrl('');
      onClose();
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
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Submit Assignment</Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={submitting}
              style={styles.closeButton}
            >
              <Text style={[styles.closeText, { color: theme['text-secondary'] }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.instructionCard, { backgroundColor: theme['bg-secondary'] }]}>
              <Text style={[styles.instructionTitle, { color: theme.text }]}>Submission Instructions</Text>
              <Text style={[styles.instructionText, { color: theme['text-secondary'] }]}>
                {getSubmissionInstructions(assignment.assignment_type)}
              </Text>
            </View>

            <View style={styles.form}>
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
                  onPress={handleClose}
                  disabled={submitting}
                >
                  <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    {
                      backgroundColor: validateUrl(linkUrl.trim(), assignment.assignment_type) && !submitting
                        ? theme.primary
                        : theme['text-secondary']
                    }
                  ]}
                  onPress={handleSubmit}
                  disabled={!validateUrl(linkUrl.trim(), assignment.assignment_type) || submitting}
                >
                  <Text style={[styles.submitText, { color: theme.bg }]}>
                    {submitting ? 'Submitting...' : `Submit ${assignment.assignment_type === 'mixed' ? 'Repository' : assignment.assignment_type.toUpperCase()}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 16,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
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
});