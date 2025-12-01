import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import AssignmentCard from '../components/AssignmentCard';
import { getStudentAssignments } from '../services/assignments';

interface Assignment {
  id: number;
  title: string;
  assignment_type?: string;
  is_quiz?: boolean;
  due_at?: string;
  isSubmitted?: boolean;
  course_offering_id?: number;
}

export default function AssignmentsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionModalVisible, setSubmissionModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    if (user) {
      loadAssignments();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const data = await getStudentAssignments();
      setAssignments(data as Assignment[]);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      Alert.alert('Error', 'Failed to load assignments');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentAction = (assignment: Assignment) => {
    if (assignment.is_quiz) {
      // Navigate to quiz
      navigation.navigate('Quizzes' as any);
    } else if (assignment.assignment_type === 'code') {
      // Navigate to code editor
      navigation.navigate('CourseDetails', { offeringId: assignment.course_offering_id?.toString() || '' });
    } else if (assignment.assignment_type === 'pdf' || assignment.assignment_type === 'ppt' || assignment.assignment_type === 'mixed') {
      // Show submission modal
      setSelectedAssignment(assignment);
      setSubmissionModalVisible(true);
    }
  };

  const handleViewDetails = (assignment: Assignment) => {
    // Navigate to detailed assignment view
    navigation.navigate('AssignmentDetails', { assignmentId: assignment.id.toString() });
  };

  const handleSubmitAssignment = () => {
    // Handle submission logic here
    Alert.alert('Success', 'Assignment submitted successfully!');
    setSubmissionModalVisible(false);
    setSelectedAssignment(null);
    // Reload assignments to update submission status
    loadAssignments();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.title, { color: theme.text }]}>Assignments</Text>

      {loading ? (
        <Text style={[styles.loading, { color: theme['text-secondary'] }]}>Loading assignments...</Text>
      ) : assignments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No assignments</Text>
          <Text style={[styles.emptyText, { color: theme['text-secondary'] }]}>You don't have any assignments yet, or you may need to log in to view them.</Text>
        </View>
      ) : (
        assignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            userRole="student"
            onPress={() => handleAssignmentAction(assignment)}
            onAction={() => handleAssignmentAction(assignment)}
            onViewDetails={() => handleViewDetails(assignment)}
            actionLabel={
              assignment.is_quiz ? 'Start Quiz' :
              assignment.assignment_type === 'code' ? (assignment.isSubmitted ? 'View Submission' : 'Code Editor') :
              assignment.assignment_type === 'pdf' ? 'Submit PDF' :
              assignment.assignment_type === 'ppt' ? 'Submit PPT' : 'View Details'
            }
          />
        ))
      )}

      {/* Submission Modal */}
      {selectedAssignment && (
        <Modal
          visible={submissionModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSubmissionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Submit {selectedAssignment.assignment_type?.toUpperCase()}
              </Text>
              <Text style={[styles.modalText, { color: theme['text-secondary'] }]}>
                {selectedAssignment.assignment_type === 'mixed'
                  ? 'Submit your GitHub repository URL'
                  : `Submit your ${selectedAssignment.assignment_type?.toUpperCase()} file`}
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
                  onPress={() => setSubmissionModalVisible(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton, { backgroundColor: theme.primary }]}
                  onPress={handleSubmitAssignment}
                >
                  <Text style={[styles.submitButtonText, { color: theme.bg }]}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  loading: {
    textAlign: 'center',
    marginTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  emptyText: {
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    // backgroundColor is set dynamically
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});