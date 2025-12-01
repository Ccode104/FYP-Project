import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { RootStackParamList } from '../types/navigation'
import { listMyCourses } from '../services/courses'
import CourseCard from '../components/CourseCard'
import ThemeToggle from '../components/ThemeToggle'

interface Course {
  id: number
  code: string
  title: string
  description?: string
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const { theme } = useTheme()
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
    <View style={[styles.mainContainer, { backgroundColor: theme.bg }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <View style={styles.headerRight}>
              <ThemeToggle />
              <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
                <View style={[styles.avatar, { backgroundColor: '#ff6b35' }]}>
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>My Courses</Text>

          {loading ? (
            <Text style={[styles.loading, { color: theme['text-secondary'] }]}>Loading courses...</Text>
          ) : courses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No enrolled courses</Text>
              <Text style={[styles.emptyText, { color: theme['text-secondary'] }]}>Enroll in courses to get started</Text>
            </View>
          ) : (
            courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onPress={() => handleCoursePress(course)}
              />
            ))
          )}

          <TouchableOpacity
            style={[styles.enrollButton, { backgroundColor: theme.success }]}
            onPress={() => navigation.navigate('Courses' as any)}
          >
            <Text style={[styles.enrollText, { color: theme.bg }]}>Browse & Enroll in Courses</Text>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileButton: {
    padding: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
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
  enrollButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  enrollText: {
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