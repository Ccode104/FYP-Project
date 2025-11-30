import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { getMyProgress, ProgressRow } from '../services/progress';

const { width } = Dimensions.get('window');

interface CourseProgress {
  courseId: number;
  courseName: string;
  totalScore: number;
  totalMax: number;
  percentage: number;
  activities: ProgressRow[];
}

export default function ProgressScreen() {
  const [progressData, setProgressData] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const data = await getMyProgress();
      const grouped = groupProgressByCourse(data.rows || []);
      setProgressData(grouped);
    } catch (err: any) {
      setError(err.message || 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  const groupProgressByCourse = (rows: ProgressRow[]): CourseProgress[] => {
    const grouped: { [key: number]: ProgressRow[] } = {};

    rows.forEach(row => {
      if (!grouped[row.course_offering_id]) {
        grouped[row.course_offering_id] = [];
      }
      grouped[row.course_offering_id].push(row);
    });

    return Object.entries(grouped).map(([courseId, activities]) => {
      const totalMax = activities.reduce((sum, activity) => sum + (activity.max_score || 0), 0);
      const totalScore = activities.reduce((sum, activity) => sum + (activity.score || 0), 0);
      const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

      return {
        courseId: parseInt(courseId),
        courseName: `Course ${courseId}`,
        totalScore,
        totalMax,
        percentage,
        activities
      };
    });
  };

  const ProgressBar = ({ percentage }: { percentage: number }) => (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBar, { width: `${percentage}%` }]} />
      <Text style={styles.progressText}>{percentage}%</Text>
    </View>
  );

  const ProgressChart = ({ data }: { data: CourseProgress[] }) => {
    const maxPercentage = Math.max(...data.map(d => d.percentage));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Course Progress Overview</Text>
        {data.map((course, index) => (
          <View key={course.courseId} style={styles.chartBar}>
            <Text style={styles.chartLabel}>Course {course.courseId}</Text>
            <View style={styles.chartBarContainer}>
              <View
                style={[
                  styles.chartBarFill,
                  {
                    width: `${(course.percentage / maxPercentage) * 100}%`,
                    backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                  }
                ]}
              />
            </View>
            <Text style={styles.chartValue}>{course.percentage}%</Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading progress...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Progress</Text>
        <Text style={styles.subtitle}>Track your learning journey</Text>
      </View>

      {progressData.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No progress data yet</Text>
          <Text style={styles.emptyText}>Complete assignments and quizzes to see your progress</Text>
        </View>
      ) : (
        <>
          <ProgressChart data={progressData} />

          <View style={styles.coursesSection}>
            <Text style={styles.sectionTitle}>Course Details</Text>
            {progressData.map((course) => (
              <View key={course.courseId} style={styles.courseCard}>
                <View style={styles.courseHeader}>
                  <Text style={styles.courseName}>{course.courseName}</Text>
                  <Text style={styles.courseScore}>
                    {course.totalScore} / {course.totalMax} points
                  </Text>
                </View>

                <ProgressBar percentage={course.percentage} />

                <View style={styles.activitiesList}>
                  <Text style={styles.activitiesTitle}>Activities:</Text>
                  {course.activities.map((activity, index) => (
                    <View key={index} style={styles.activityItem}>
                      <Text style={styles.activityName}>
                        {activity.activity_title || `Activity ${activity.activity_id}`}
                      </Text>
                      <Text style={styles.activityScore}>
                        {activity.score ?? 0} / {activity.max_score ?? 0}
                      </Text>
                      <Text style={styles.activityType}>{activity.activity_type}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
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
    color: '#333',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  chartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: '600',
  },
  chartBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginHorizontal: 10,
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 10,
  },
  chartValue: {
    width: 40,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  coursesSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  courseCard: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  courseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  courseScore: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 25,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'center',
    marginBottom: 15,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 12,
    position: 'absolute',
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  activitiesList: {
    marginTop: 10,
  },
  activitiesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  activityName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  activityScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
    marginHorizontal: 10,
  },
  activityType: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
});