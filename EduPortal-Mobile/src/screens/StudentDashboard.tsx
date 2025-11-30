import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useAuth } from '../contexts/AuthContext'
import { RootStackParamList } from '../types/navigation'
import { listMyCourses } from '../services/courses'

interface Course {
  id: number
  code: string
  title: string
  description?: string
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      setLoading(true)
      const data = await listMyCourses()
      setCourses(data as Course[])
    } catch (error) {
      console.error('Failed to load courses:', error)
      Alert.alert('Error', 'Failed to load courses')
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  const handleCoursePress = (course: Course) => {
    navigation.navigate('CourseDetails', { offeringId: course.id.toString() })
  }

  const handleProfilePress = () => {
    setShowProfileMenu(true)
  }

  const handleLogout = () => {
    setShowProfileMenu(false)
    logout()
  }

  const handleMessaging = () => {
    setShowProfileMenu(false)
    navigation.navigate('Messaging')
  }

  const handleAchievements = () => {
    setShowProfileMenu(false)
    navigation.navigate('Achievements')
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome, {user?.name}!</Text>
          <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
            <Text style={styles.profileText}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>My Courses</Text>

          {loading ? (
            <Text style={styles.loading}>Loading courses...</Text>
          ) : courses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>No enrolled courses</Text>
              <Text style={styles.emptyText}>Enroll in courses to get started</Text>
            </View>
          ) : (
            courses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={styles.courseCard}
                onPress={() => handleCoursePress(course)}
              >
                <Text style={styles.courseCode}>{course.code}</Text>
                <Text style={styles.courseTitle}>{course.title}</Text>
                {course.description && (
                  <Text style={styles.courseDescription}>{course.description}</Text>
                )}
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={styles.enrollButton} onPress={() => navigation.navigate('Courses')}>
            <Text style={styles.enrollText}>Browse & Enroll in Courses</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showProfileMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={styles.profileMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={handleMessaging}>
              <Text style={styles.menuText}>Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleAchievements}>
              <Text style={styles.menuText}>Achievements</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.menuText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Text style={styles.menuText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileButton: {
    padding: 10,
  },
  profileText: {
    color: 'white',
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  loading: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
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
    color: '#333',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
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
  courseCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 5,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  courseDescription: {
    fontSize: 14,
    color: '#666',
  },
  enrollButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  enrollText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  profileMenu: {
    backgroundColor: 'white',
    marginTop: 80,
    marginRight: 20,
    borderRadius: 8,
    padding: 10,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
})