import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { getVideosByCourseOffering } from '../services/videos'

interface Video {
  id: number
  title: string
  description?: string
  url: string
  uploaded_at: string
}

export default function Videos() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVideos()
  }, [])

  const loadVideos = async () => {
    try {
      setLoading(true)
      const data = await getVideosByCourseOffering(1)
      setVideos(data)
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false)
    }
  }

  const renderVideo = ({ item }: { item: Video }) => (
    <View style={styles.videoContainer}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
      <TouchableOpacity style={styles.playButton}>
        <Text style={styles.playText}>Play Video</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Course Videos</Text>

      {loading ? (
        <Text style={styles.loading}>Loading videos...</Text>
      ) : videos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎥</Text>
          <Text style={styles.emptyTitle}>No videos available</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          renderItem={renderVideo}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', margin: 20 },
  loading: { textAlign: 'center', marginTop: 20 },
  emptyState: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold' },
  list: { flex: 1 },
  videoContainer: { backgroundColor: 'white', margin: 10, padding: 15, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  description: { fontSize: 14, color: '#666', marginBottom: 10 },
  playButton: { backgroundColor: '#dc3545', padding: 10, borderRadius: 8, alignItems: 'center' },
  playText: { color: 'white', fontWeight: '600' },
})