import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Assignment {
  id: number;
  title: string;
  assignment_type?: string;
  is_quiz?: boolean;
  due_at?: string;
  isSubmitted?: boolean;
}

interface AssignmentCardProps {
  assignment: Assignment;
  userRole?: string;
  onPress?: () => void;
  onAction?: () => void;
  onViewDetails?: () => void;
  actionLabel?: string;
}

export default function AssignmentCard({
  assignment,
  userRole,
  onPress,
  onAction,
  onViewDetails,
  actionLabel
}: AssignmentCardProps) {
  const { theme } = useTheme();


  const getTypeIcon = () => {
    try {
      if (assignment?.assignment_type === 'code') return '💻';
      if (assignment?.assignment_type === 'quiz' || assignment?.is_quiz) return '📝';
      if (assignment?.assignment_type === 'file' || assignment?.assignment_type === 'pdf') return '📄';
      if (assignment?.assignment_type === 'ppt') return '📊';
      if (assignment?.assignment_type === 'mixed') return '🔗';
      return '📄';
    } catch (error) {
      console.error('❌ [ERROR] Error in getTypeIcon:', error);
      return '📄';
    }
  };

  const getTypeLabel = () => {
    if (assignment?.assignment_type === 'code') return 'Code';
    if (assignment?.assignment_type === 'quiz') return 'Quiz';
    if (assignment?.assignment_type === 'file') return 'PDF';
    if (assignment?.assignment_type === 'pdf') return 'PDF';
    if (assignment?.assignment_type === 'ppt') return 'PPT';
    if (assignment?.assignment_type === 'mixed') return 'Mixed';
    if (assignment?.is_quiz) return 'Quiz';
    return 'Assignment';
  };

  const handlePress = () => {
    if (userRole === 'student' &&
        (assignment?.assignment_type === 'pdf' || assignment?.assignment_type === 'ppt' || assignment?.assignment_type === 'mixed')) {
      onPress?.();
    }
  };

  const isOverdue = assignment?.due_at && new Date(assignment.due_at) < new Date() && !assignment?.isSubmitted;
  const isDueSoon = assignment?.due_at && !assignment?.isSubmitted &&
    new Date(assignment.due_at).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000; // Within 24 hours

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: isOverdue ? theme.error : isDueSoon ? '#ffa726' : theme.border,
          borderWidth: isOverdue || isDueSoon ? 2 : 1,
        }
      ]}
      onPress={handlePress}
      activeOpacity={userRole === 'student' &&
        (assignment?.assignment_type === 'pdf' || assignment?.assignment_type === 'ppt' || assignment?.assignment_type === 'mixed') ? 0.8 : 1}
    >
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeIcon}>{getTypeIcon()}</Text>
          <Text style={[styles.typeText, { color: theme.text }]}>{getTypeLabel()}</Text>
        </View>
        <View style={styles.statusContainer}>
          {userRole === 'student' && assignment?.isSubmitted && (
            <View style={[styles.submittedBadge, { backgroundColor: theme.success }]}>
              <Text style={[styles.submittedText, { color: theme.bg }]}>✓ Submitted</Text>
            </View>
          )}
          {isOverdue && (
            <View style={[styles.overdueBadge, { backgroundColor: theme.error }]}>
              <Text style={[styles.overdueText, { color: theme.bg }]}>Overdue</Text>
            </View>
          )}
          {isDueSoon && !isOverdue && (
            <View style={[styles.dueSoonBadge, { backgroundColor: '#ffa726' }]}>
              <Text style={[styles.dueSoonText, { color: theme.bg }]}>Due Soon</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {assignment?.title || 'Untitled Assignment'}
      </Text>

      {assignment?.due_at && (
        <View style={styles.dueSection}>
          <Text style={[styles.dueIcon, {
            color: isOverdue ? theme.error : isDueSoon ? '#ffa726' : theme['text-secondary']
          }]}>
            📅
          </Text>
          <Text style={[styles.dueText, {
            color: isOverdue ? theme.error : isDueSoon ? '#ffa726' : theme['text-secondary'],
            fontWeight: isOverdue || isDueSoon ? '600' : '400'
          }]}>
            Due: {new Date(assignment.due_at).toLocaleDateString()}
            {isDueSoon && !isOverdue && ' (Soon)'}
          </Text>
        </View>
      )}

      {userRole === 'student' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, {
              backgroundColor: assignment?.isSubmitted ? theme.success :
                             isOverdue ? theme.error :
                             theme.primary
            }]}
            onPress={onAction}
          >
            <Text style={[styles.actionText, { color: theme.bg }]}>
              {assignment?.is_quiz ? 'Start Quiz' :
               assignment?.assignment_type === 'code' ? (assignment?.isSubmitted ? 'View Submission' : 'Code Editor') :
               assignment?.assignment_type === 'pdf' ? 'Submit PDF' :
               assignment?.assignment_type === 'ppt' ? 'Submit PPT' :
               assignment?.assignment_type === 'mixed' ? 'Submit Repository' : 'View Details'}
            </Text>
            <Text style={[styles.arrowIcon, { color: theme.bg }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryAction, {
              borderColor: theme.secondary,
              backgroundColor: theme.secondary
            }]}
            onPress={onViewDetails}
          >
            <Text style={[styles.secondaryActionText, { color: theme.text }]}>View Details</Text>
            <Text style={[styles.arrowIcon, { color: theme.text }]}>→</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeIcon: {
    fontSize: 16,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  submittedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  submittedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  overdueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overdueText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dueSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dueSoonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  dueSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dueIcon: {
    fontSize: 14,
  },
  dueText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrowIcon: {
    fontSize: 14,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});