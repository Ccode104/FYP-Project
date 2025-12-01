import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Course {
  id: number;
  title: string;
  description?: string;
  code?: string;
  assignmentsPast?: any[];
  assignmentsPresent?: any[];
}

interface CourseCardProps {
  course: Course;
  onPress: () => void;
  pendingAssignments?: number;
  pendingQuizzes?: number;
  unreadNotifications?: number;
}

export default function CourseCard({
  course,
  onPress,
  pendingAssignments,
  pendingQuizzes,
  unreadNotifications
}: CourseCardProps) {
  const { theme } = useTheme();

  const accents = ['blue', 'green', 'purple', 'orange', 'pink', 'cyan'] as const;
  const hash = Array.from(course.id.toString()).reduce((s, c) => s + c.charCodeAt(0), 0);
  const accentKey = accents[hash % accents.length];
  const accentColor = theme.accent[accentKey];

  // Calculate progress based on assignments
  const totalAssignments = (course.assignmentsPast?.length || 0) + (course.assignmentsPresent?.length || 0);
  const completedAssignments = course.assignmentsPast?.length || 0;
  const progressPercentage = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  // Use provided counts or fallback to course data
  const pendingCount = pendingAssignments ?? course.assignmentsPresent?.length ?? 0;
  const quizCount = pendingQuizzes ?? 0;
  const notificationCount = unreadNotifications ?? 0;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow.split(' ')[1]?.includes('rgba') ? '#000' : '#000',
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: theme['primary-light'], borderColor: accentColor }]}>
          <Text style={[styles.iconText, { color: accentColor }]}>📚</Text>
        </View>
        {notificationCount > 0 && (
          <View style={[styles.notificationBadge, { backgroundColor: theme['primary-light'] }]}>
            <Text style={[styles.notificationText, { color: theme.primary }]}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{course.title}</Text>
        {course.description && (
          <Text style={[styles.cardDescription, { color: theme['text-secondary'] }]}>{course.description}</Text>
        )}

        {totalAssignments > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={[styles.progressLabel, { color: theme.muted }]}>Progress</Text>
              <Text style={[styles.progressValue, { color: theme.primary }]}>{progressPercentage}%</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme['bg-secondary'] }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%`, backgroundColor: theme.primary }
                ]}
              />
            </View>
          </View>
        )}

        <View style={styles.cardStats}>
          <View style={styles.cardStat}>
            <Text style={[styles.statIcon, { color: theme['text-secondary'] }]}>📄</Text>
            <Text style={[styles.statText, { color: theme['text-secondary'] }]}>
              {pendingCount} pending assignment{pendingCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.cardStat}>
            <Text style={[styles.statIcon, { color: theme['text-secondary'] }]}>📝</Text>
            <Text style={[styles.statText, { color: theme['text-secondary'] }]}>
              {quizCount} pending quiz{quizCount !== 1 ? 'zes' : ''}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
        <Text style={[styles.cardAction, { color: theme.primary }]}>View Course</Text>
        <Text style={[styles.arrowIcon, { color: theme.primary }]}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'column',
    minHeight: 240,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  iconText: {
    fontSize: 20,
  },
  notificationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  notificationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    flex: 1,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressSection: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    fontSize: 16,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 16,
  },
  cardAction: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrowIcon: {
    fontSize: 16,
  },
});