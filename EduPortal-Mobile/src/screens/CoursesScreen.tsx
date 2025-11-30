import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native'
import { listCourses, enrollStudent } from '../services/courses'
import { useAuth } from '../contexts/AuthContext'

interface Course {
  id: number
  code: string
  title: string
  description?: string
}

export default function CoursesScreen() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      setLoading(true)
      const data = await listCourses()
      setCourses(data as Course[])
    } catch (error) {
      Alert.alert('Error', 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (courseId: number) => {
    if (!user?.id) return

    try {
      await enrollStudent(courseId, parseInt(user.id))
      Alert.alert('Success', 'Enrolled successfully!')
      // Refresh courses or navigate back
    } catch (error) {
      Alert.alert('Error', 'Failed to enroll')
    }
  }

  const renderCourse = ({ item }: { item: Course }) => (
    <View style={styles.courseCard}>
      <View style={styles.courseInfo}>
        <Text style={styles.courseCode}>{item.code}</Text>
        <Text style={styles.courseTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.courseDescription}>{item.description}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.enrollButton}
        onPress={() => handleEnroll(item.id)}
      >
        <Text style={styles.enrollText}>Enroll</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Available Courses</Text>

      {loading ? (
        <Text style={styles.loading}>Loading courses...</Text>
      ) : courses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>No courses available</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourse}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 20,
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
    flex: 1,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  list: {
    flex: 1,
  },
  courseCard: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseInfo: {
    flex: 1,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  enrollText: {
    color: 'white',
    fontWeight: '600',
  },
})