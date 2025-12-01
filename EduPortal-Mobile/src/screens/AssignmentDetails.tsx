import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';
import AssignmentComments from '../components/AssignmentComments';

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

type AssignmentDetailsRouteProp = RouteProp<RootStackParamList, 'AssignmentDetails'>;

export default function AssignmentDetails() {
  const route = useRoute<AssignmentDetailsRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { assignmentId } = route.params;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignmentId) {
      setError('Invalid assignment ID');
      setLoading(false);
      return;
    }

    const fetchAssignment = async () => {
      try {
        const data = await apiFetch<Assignment>(`/assignments/${assignmentId}`);
        setAssignment(data);
      } catch (err: any) {
        console.error('Failed to fetch assignment:', err);
        setError(err.message || 'Failed to load assignment details');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [assignmentId]);

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

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading assignment details...</Text>
      </View>
    );
  }

  if (error || !assignment) {
    return (
      <View style={styles.container}>
        <View style={styles.error}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error || 'Assignment not found'}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Assignment Info Cards */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <View style={styles.cardIcon}>
            <Text style={styles.iconText}>📄</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Assignment Type</Text>
            <Text style={styles.cardText}>{getAssignmentTypeDisplay(assignment.assignment_type)}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardIcon}>
            <Text style={styles.iconText}>🎯</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Points</Text>
            <Text style={styles.cardText}>{assignment.total_points || assignment.max_score || 100} points</Text>
          </View>
        </View>

        {assignment.due_at && (
          <View style={styles.infoCard}>
            <View style={styles.cardIcon}>
              <Text style={styles.iconText}>📅</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Due Date</Text>
              <Text style={styles.cardText}>{new Date(assignment.due_at).toLocaleString()}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <View style={styles.cardIcon}>
            <Text style={styles.iconText}>🔄</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Multiple Submissions</Text>
            <Text style={styles.cardText}>{assignment.allow_multiple_submissions ? 'Allowed' : 'Not Allowed'}</Text>
          </View>
        </View>
      </View>

      {/* Description */}
      {assignment.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.descriptionContent}>
            <Text style={styles.descriptionText}>{assignment.description}</Text>
          </View>
        </View>
      )}

      {/* Submission Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Submission Instructions</Text>
        <View style={styles.instructionsContent}>
          <View style={styles.instructionIcon}>
            <Text style={styles.iconText}>📝</Text>
          </View>
          <Text style={styles.instructionText}>
            {getSubmissionInstructions(assignment.assignment_type)}
          </Text>
        </View>
      </View>

      {/* Assignment Comments */}
      <View style={styles.section}>
        <AssignmentComments assignmentId={assignment.id} />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {assignment.assignment_type === 'code' && user?.role === 'student' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              // Navigate to code editor (placeholder for now)
              Alert.alert('Code Editor', 'Code editor would open here');
            }}
          >
            <Text style={styles.primaryButtonText}>Open Code Editor</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Back to Assignments</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loading: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
  error: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    marginBottom: 12,
  },
  iconText: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  descriptionContent: {
    // Additional styling if needed
  },
  descriptionText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  instructionsContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  actionButtons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#dee2e6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
});