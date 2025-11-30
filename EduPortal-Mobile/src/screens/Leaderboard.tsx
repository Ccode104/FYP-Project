import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native'
import { getLeaderboard } from '../services/gamification'

interface LeaderboardEntry {
  id: number
  name: string
  email: string
  total_points: number
  rank: number
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      const data = await getLeaderboard()
      setLeaderboard(data.leaderboard || [])
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
      Alert.alert('Error', 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <View style={[styles.entryContainer, index < 3 && styles.topEntry]}>
      <View style={styles.rankContainer}>
        <Text style={[styles.rank, index < 3 && styles.topRank]}>
          {index + 1}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.email}>{item.email}</Text>
      </View>
      <View style={styles.pointsContainer}>
        <Text style={styles.points}>{item.total_points}</Text>
        <Text style={styles.pointsLabel}>points</Text>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Top performers</Text>
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading leaderboard...</Text>
      ) : leaderboard.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>No data available</Text>
          <Text style={styles.emptyText}>Complete activities to earn points!</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          renderItem={renderEntry}
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
    padding: 10,
  },
  entryContainer: {
    backgroundColor: 'white',
    marginVertical: 5,
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
  topEntry: {
    backgroundColor: '#fff3cd',
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  topRank: {
    color: '#ffc107',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  points: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28a745',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#666',
  },
})