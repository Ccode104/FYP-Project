import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native'
import { RouteProp, useRoute } from '@react-navigation/native'
import { RootStackParamList } from '../types/navigation'

type ResourcesRouteProp = RouteProp<RootStackParamList, 'Resources'>

interface Resource {
  id: number
  title: string
  filename: string
  type: string
  uploaded_at: string
  file_size?: number
}

export default function Resources() {
  const route = useRoute<ResourcesRouteProp>()
  const { courseId } = route.params || {}
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadResources()
  }, [courseId])

  const loadResources = async () => {
    try {
      setLoading(true)
      // This would call an API to get resources for the course
      // For now, show placeholder
      setResources([
        {
          id: 1,
          title: 'Lecture Notes - Chapter 1',
          filename: 'chapter1_notes.pdf',
          type: 'notes',
          uploaded_at: new Date().toISOString(),
          file_size: 2048576, // 2MB
        },
        {
          id: 2,
          title: 'Previous Year Questions',
          filename: 'pyq_2023.pdf',
          type: 'pyq',
          uploaded_at: new Date().toISOString(),
          file_size: 1536000, // 1.5MB
        },
      ])
    } catch (error) {
      console.error('Failed to load resources:', error)
      Alert.alert('Error', 'Failed to load resources')
    } finally {
      setLoading(false)
    }
  }

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'notes': return '📝'
      case 'pyq': return '📄'
      case 'assignment': return '📋'
      default: return '📁'
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const renderResource = ({ item }: { item: Resource }) => (
    <View style={styles.resourceContainer}>
      <View style={styles.resourceHeader}>
        <Text style={styles.resourceIcon}>{getResourceIcon(item.type)}</Text>
        <View style={styles.resourceInfo}>
          <Text style={styles.resourceTitle}>{item.title}</Text>
          <Text style={styles.resourceFilename}>{item.filename}</Text>
        </View>
      </View>

      <View style={styles.resourceMeta}>
        <Text style={styles.resourceSize}>{formatFileSize(item.file_size)}</Text>
        <Text style={styles.resourceDate}>
          {new Date(item.uploaded_at).toLocaleDateString()}
        </Text>
      </View>

      <TouchableOpacity style={styles.downloadButton}>
        <Text style={styles.downloadText}>Download</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Course Resources</Text>
        <Text style={styles.subtitle}>Course {courseId}</Text>
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading resources...</Text>
      ) : resources.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>No resources available</Text>
          <Text style={styles.emptyText}>Resources will be uploaded by your instructor</Text>
        </View>
      ) : (
        <FlatList
          data={resources}
          renderItem={renderResource}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          showsVerticalScrollIndicator={false}
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
    backgroundColor: '#007bff',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    marginTop: 5,
  },
  loading: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  list: {
    flex: 1,
    padding: 20,
  },
  resourceContainer: {
    backgroundColor: 'white',
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resourceIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  resourceFilename: {
    fontSize: 14,
    color: '#666',
  },
  resourceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  resourceSize: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  resourceDate: {
    fontSize: 14,
    color: '#666',
  },
  downloadButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})