import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { getTADashboardData } from '../services/ta'

export default function TADashboard() {
  const { user, logout } = useAuth()
  const navigation = useNavigation()

  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const data = await getTADashboardData()
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalPendingTasks =
    (dashboardData?.pendingAssignments?.length || 0) +
    (dashboardData?.pendingQuizzes?.length || 0) +
    (dashboardData?.pendingViva?.length || 0)

  const renderPendingItem = ({ item, type }: { item: any, type: string }) => (
    <TouchableOpacity
      style={styles.pendingItem}
      onPress={() => navigation.navigate('CourseDetails', { offeringId: item.id.toString() })}
    >
      <View style={styles.pendingContent}>
        <Text style={styles.pendingTitle}>{item.title}</Text>
        <Text style={styles.pendingSubtitle}>
          {item.course_code} — {item.course_title}
        </Text>
        <Text style={styles.pendingMeta}>
          {type === 'assignment' && `Ungraded: ${item.ungraded_count}/${item.total_submissions}`}
          {type === 'quiz' && `Ungraded: ${item.ungraded_attempts}/${item.total_attempts}`}
          {type === 'viva' && `Pending: ${item.pending_participants}/${item.total_participants}`}
        </Text>
      </View>
      <TouchableOpacity style={styles.manageButton}>
        <Text style={styles.manageText}>Manage</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )

  const renderCourse = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.courseItem}
      onPress={() => navigation.navigate('CourseDetails', { offeringId: item.id.toString() })}
    >
      <View style={styles.courseContent}>
        <Text style={styles.courseTitle}>
          {item.course_code} — {item.course_title}
        </Text>
        <Text style={styles.courseSubtitle}>
          {item.term} {item.section ? `Section ${item.section}` : ''} • Role: {item.role}
        </Text>
      </View>
      <TouchableOpacity style={styles.manageButton}>
        <Text style={styles.manageText}>Manage</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back, {user?.name}!</Text>
        <Text style={styles.subtitle}>Manage your TA duties and grade student work</Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>👤 Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>🤖 AI Assistant</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>📊 Proctoring Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Impact</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📝</Text>
            <Text style={styles.statValue}>{dashboardData?.stats?.total_graded_assignments || 0}</Text>
            <Text style={styles.statLabel}>Assignments Graded</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={styles.statValue}>{dashboardData?.stats?.total_graded_quizzes || 0}</Text>
            <Text style={styles.statLabel}>Quizzes Graded</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎤</Text>
            <Text style={styles.statValue}>{dashboardData?.stats?.total_graded_viva || 0}</Text>
            <Text style={styles.statLabel}>Viva Graded</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>
              {(dashboardData?.stats?.students_helped_assignments || 0) +
               (dashboardData?.stats?.students_helped_quizzes || 0) +
               (dashboardData?.stats?.students_helped_viva || 0)}
            </Text>
            <Text style={styles.statLabel}>Students Helped</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Tasks</Text>
          <Text style={styles.sectionCount}>{totalPendingTasks} pending</Text>
        </View>

        <View style={styles.tasksContainer}>
          <View style={styles.taskSection}>
            <Text style={styles.taskTitle}>Assignments to Grade</Text>
            {dashboardData?.pendingAssignments?.length > 0 ? (
              <FlatList
                data={dashboardData.pendingAssignments}
                renderItem={(item) => renderPendingItem({ ...item, type: 'assignment' })}
                keyExtractor={(item) => `assignment-${item.id}`}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.noTasks}>No assignments pending</Text>
            )}
          </View>

          <View style={styles.taskSection}>
            <Text style={styles.taskTitle}>Quizzes to Grade</Text>
            {dashboardData?.pendingQuizzes?.length > 0 ? (
              <FlatList
                data={dashboardData.pendingQuizzes}
                renderItem={(item) => renderPendingItem({ ...item, type: 'quiz' })}
                keyExtractor={(item) => `quiz-${item.id}`}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.noTasks}>No quizzes pending</Text>
            )}
          </View>

          <View style={styles.taskSection}>
            <Text style={styles.taskTitle}>Upcoming Viva Sessions</Text>
            {dashboardData?.pendingViva?.length > 0 ? (
              <FlatList
                data={dashboardData.pendingViva}
                renderItem={(item) => renderPendingItem({ ...item, type: 'viva' })}
                keyExtractor={(item) => `viva-${item.id}`}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.noTasks}>No viva sessions</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Courses Assisted</Text>
          <Text style={styles.sectionCount}>{dashboardData?.courses?.length || 0} courses</Text>
        </View>

        <View style={styles.sectionContent}>
          {dashboardData?.courses?.length > 0 ? (
            <FlatList
              data={dashboardData.courses}
              renderItem={renderCourse}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noCourses}>No courses assigned</Text>
          )}
        </View>
      </View>

      </ScrollView>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  container: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#ffc107',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  sectionContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  tasksContainer: {
    gap: 15,
  },
  taskSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pendingContent: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  pendingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pendingMeta: {
    fontSize: 12,
    color: '#999',
  },
  manageButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  manageText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  courseContent: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  courseSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  noTasks: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
    fontStyle: 'italic',
  },
  noCourses: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
    fontStyle: 'italic',
  },
  logoutButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    margin: 20,
    padding: 15,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})