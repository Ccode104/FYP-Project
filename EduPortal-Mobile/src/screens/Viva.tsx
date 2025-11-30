import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native'
import { getVivaSessions, VivaSession } from '../services/viva'

export default function Viva() {
  const [sessions, setSessions] = useState<VivaSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const data = await getVivaSessions()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to load viva sessions:', error)
      Alert.alert('Error', 'Failed to load viva sessions')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#ffc107'
      case 'in_progress': return '#007bff'
      case 'completed': return '#28a745'
      case 'cancelled': return '#dc3545'
      default: return '#666'
    }
  }

  const renderSession = ({ item }: { item: VivaSession }) => (
    <View style={styles.sessionContainer}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {item.description && (
        <Text style={styles.sessionDescription}>{item.description}</Text>
      )}

      <View style={styles.sessionMeta}>
        <Text style={styles.metaText}>Scheduled: {new Date(item.scheduled_at).toLocaleString()}</Text>
        <Text style={styles.metaText}>Duration: {item.duration_minutes} minutes</Text>
        <Text style={styles.metaText}>Max Students: {item.max_students}</Text>
      </View>

      <TouchableOpacity style={styles.joinButton}>
        <Text style={styles.joinText}>
          {item.status === 'scheduled' ? 'Join Session' :
           item.status === 'in_progress' ? 'Enter Session' :
           'View Results'}
        </Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Viva Sessions</Text>
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading viva sessions...</Text>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎤</Text>
          <Text style={styles.emptyTitle}>No viva sessions</Text>
          <Text style={styles.emptyText}>Viva sessions will appear here when scheduled</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
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
  sessionContainer: {
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'capitalize',
  },
  sessionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  sessionMeta: {
    marginBottom: 15,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  joinButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})