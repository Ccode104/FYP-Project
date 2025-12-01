import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native'
import { listCourses, enrollStudent } from '../services/courses'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import CourseCard from '../components/CourseCard'

interface Course {
  id: number
  code: string
  title: string
  description?: string
}

export default function CoursesScreen() {
  const { user } = useAuth()
  const { theme } = useTheme()
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
    <CourseCard
      course={item}
      onPress={() => handleEnroll(item.id)}
    />
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>Available Courses</Text>

      {loading ? (
        <Text style={[styles.loading, { color: theme['text-secondary'] }]}>Loading courses...</Text>
      ) : courses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No courses available</Text>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 20,
  },
  loading: {
    textAlign: 'center',
    marginTop: 20,
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
  },
  list: {
    flex: 1,
  },
})