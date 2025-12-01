import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/navigation'

interface Quiz {
  id: number;
  title: string;
  due_at?: string;
  release_at?: string;
  is_proctored?: boolean;
  time_limit?: number;
  isSubmitted?: boolean;
  isViolated?: boolean;
  quiz_id?: number;
}

interface QuizCardProps {
  quiz: Quiz;
  userRole?: string;
  onStartQuiz?: () => void;
  onViewResults?: () => void;
}

export default function QuizCard({
  quiz,
  userRole,
  onStartQuiz,
  onViewResults
}: QuizCardProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.quizInfo}>
          <Text style={[styles.title, { color: theme.text }]}>{quiz.title}</Text>
          {quiz.is_proctored && (
            <View style={styles.proctoredBadge}>
              <Text style={styles.proctoredText}>🔒 PROCTORED</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.quizDetails}>
        {quiz.due_at && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailIcon, { color: theme['text-secondary'] }]}>📅</Text>
            <Text style={[styles.detailText, { color: theme['text-secondary'] }]}>
              Due: {new Date(quiz.due_at).toLocaleDateString()}
            </Text>
          </View>
        )}

        {quiz.is_proctored && quiz.time_limit && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailIcon, { color: theme['text-secondary'] }]}>⏱️</Text>
            <Text style={[styles.detailText, { color: theme['text-secondary'] }]}>
              Time limit: {quiz.time_limit} minutes
            </Text>
          </View>
        )}

        {quiz.isSubmitted && (
          <View style={[styles.submittedBadge, { backgroundColor: theme.success }]}>
            <Text style={[styles.submittedText, { color: theme.bg }]}>✓ Submitted</Text>
          </View>
        )}

        {quiz.isViolated && (
          <View style={styles.violatedBadge}>
            <Text style={styles.violatedText}>🚫 SUSPENDED</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {quiz.isViolated ? null : quiz.isSubmitted ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.viewResultsButton, { backgroundColor: theme.primary }]}
            onPress={onViewResults}
          >
            <Text style={[styles.actionText, { color: theme.bg }]}>View Results</Text>
          </TouchableOpacity>
        ) : quiz.is_proctored ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.desktopOnlyButton, { backgroundColor: theme.error }]}
            onPress={() => {
              // Show message that proctored quizzes can only be taken on desktop
              alert('Proctored quizzes can only be taken on the desktop website for security reasons.');
            }}
          >
            <Text style={[styles.actionText, { color: theme.bg }]}>Desktop Only</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.startQuizButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('QuizTake', { quizId: quiz.id.toString() })}
          >
            <Text style={[styles.actionText, { color: theme.bg }]}>Start Quiz</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
    marginBottom: 12,
  },
  quizInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    lineHeight: 22,
  },
  proctoredBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proctoredText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  quizDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submittedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  submittedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  violatedBadge: {
    backgroundColor: '#ef4444',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  violatedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  startQuizButton: {
    // backgroundColor is set dynamically
  },
  viewResultsButton: {
    // backgroundColor is set dynamically
  },
  desktopOnlyButton: {
    // backgroundColor is set dynamically
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});