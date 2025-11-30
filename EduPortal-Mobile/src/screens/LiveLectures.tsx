import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native'
import { getLiveLecturesByCourse } from '../services/liveLectures'

interface LiveLecture {
  id: number
  title: string
  description?: string
  scheduled_at: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
}

export default function LiveLectures() {
  const [lectures, setLectures] = useState<LiveLecture[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLectures()
  }, [])

  const loadLectures = async () => {
    try {
      setLoading(true)
      // For demo, use course ID 1
      const data = await getLiveLecturesByCourse(1)
      setLectures(data)
    } catch (error) {
      Alert.alert('Error', 'Failed to load lectures')
    } finally {
      setLoading(false)
    }
  }

  const renderLecture = ({ item }: { item: LiveLecture }) => (
    <View style={styles.lectureContainer}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>
      <Text style={styles.date}>{new Date(item.scheduled_at).toLocaleString()}</Text>
      <TouchableOpacity style={styles.joinButton}>
        <Text style={styles.joinText}>Join Lecture</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Live Lectures</Text>

      {loading ? (
        <Text style={styles.loading}>Loading lectures...</Text>
      ) : lectures.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📹</Text>
          <Text style={styles.emptyTitle}>No live lectures</Text>
          <Text style={styles.emptyText}>Check back later for upcoming lectures</Text>
        </View>
      ) : (
        <FlatList
          data={lectures}
          renderItem={renderLecture}
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
  header: {
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
    marginBottom: 5,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  lectureContainer: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  status: {
    fontSize: 12,
    color: '#007bff',
    marginBottom: 5,
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  joinButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinText: {
    color: 'white',
    fontWeight: '600',
  },
})