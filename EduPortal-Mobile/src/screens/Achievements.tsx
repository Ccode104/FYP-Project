import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList } from 'react-native'
import { getUserAchievements, getAllAchievements } from '../services/gamification'

interface Achievement {
  id: number
  name: string
  description: string
  icon?: string
  points: number
  unlocked_at?: string
}

export default function Achievements() {
  const [userAchievements, setUserAchievements] = useState<Achievement[]>([])
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAchievements()
  }, [])

  const loadAchievements = async () => {
    try {
      setLoading(true)
      const [userData, allData] = await Promise.all([
        getUserAchievements(),
        getAllAchievements()
      ])
      setUserAchievements((userData as any).achievements || [])
      setAllAchievements((allData as any).achievements || [])
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false)
    }
  }

  const renderAchievement = ({ item }: { item: Achievement }) => {
    const isUnlocked = userAchievements.some(a => a.id === item.id)

    return (
      <View style={[styles.achievementContainer, !isUnlocked && styles.locked]}>
        <Text style={styles.icon}>{item.icon || '🏆'}</Text>
        <View style={styles.achievementInfo}>
          <Text style={[styles.name, !isUnlocked && styles.lockedText]}>{item.name}</Text>
          <Text style={[styles.description, !isUnlocked && styles.lockedText]}>{item.description}</Text>
          <Text style={[styles.points, !isUnlocked && styles.lockedText]}>{item.points} points</Text>
          {isUnlocked && item.unlocked_at && (
            <Text style={styles.unlockedAt}>Unlocked {new Date(item.unlocked_at).toLocaleDateString()}</Text>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Achievements</Text>

      {loading ? (
        <Text style={styles.loading}>Loading achievements...</Text>
      ) : (
        <FlatList
          data={allAchievements}
          renderItem={renderAchievement}
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
  },
  loading: {
    textAlign: 'center',
    marginTop: 20,
  },
  list: {
    flex: 1,
  },
  achievementContainer: {
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
  locked: {
    opacity: 0.6,
  },
  icon: {
    fontSize: 32,
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  points: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  lockedText: {
    color: '#999',
  },
  unlockedAt: {
    fontSize: 12,
    color: '#28a745',
    marginTop: 5,
  },
})