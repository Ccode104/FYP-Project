import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { listMyOfferings } from '../services/courses'
import { getPendingRequests, respondToRequest, AccessRequest } from '../services/quizPermissions'
import { RootStackParamList } from '../types/navigation'
import SidebarNav from '../components/SidebarNav'

export default function TeacherDashboard() {
  const { user, logout } = useAuth()
  const { theme } = useTheme()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  interface CourseOffering {
    id: number
    course_code: string
    course_title: string
    term: string
    section?: string
  }

  const [offerings, setOfferings] = useState<CourseOffering[]>([])
  const [loading, setLoading] = useState(true)
  const [quizRequests, setQuizRequests] = useState<AccessRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  const sidebarTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'courses', label: 'Courses', icon: '📚' },
    { id: 'assignments', label: 'Assignments', icon: '📝' },
    { id: 'quizzes', label: 'Quizzes', icon: '📋' },
    { id: 'progress', label: 'Progress', icon: '📊' },
    { id: 'resources', label: 'Resources', icon: '📁' },
  ]

  const loadQuizRequests = async () => {
    try {
      setLoadingRequests(true)
      const data = await getPendingRequests()
      setQuizRequests(data.requests)
    } catch (error) {
      console.error('Failed to load quiz requests:', error)
    } finally {
      setLoadingRequests(false)
    }
  }

  const handleRespondToRequest = async (requestId: number, action: 'approve' | 'reject', message?: string) => {
    try {
      await respondToRequest(requestId, action, message)
      loadQuizRequests()
      Alert.alert('Success', `Request ${action}d successfully!`)
    } catch (error: any) {
      console.error('Failed to respond to request:', error)
      Alert.alert('Error', error.message || 'Failed to process request')
    }
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    switch (tabId) {
      case 'courses':
        navigation.navigate('Courses' as any)
        break
      case 'assignments':
        navigation.navigate('Assignments' as any)
        break
      case 'quizzes':
        navigation.navigate('Quizzes' as any)
        break
      case 'progress':
        navigation.navigate('Progress' as any)
        break
      case 'resources':
        navigation.navigate('Resources' as any)
        break
      default:
        // Stay on dashboard
        break
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const offeringsData = await listMyOfferings()
        setOfferings(offeringsData as CourseOffering[])
        loadQuizRequests()
      } catch (error) {
        console.error("Failed to load data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const renderOffering = ({ item }: { item: CourseOffering }) => (
    <TouchableOpacity
      style={styles.offeringItem}
      onPress={() => navigation.navigate('CourseDetails', { offeringId: item.id.toString() })}
    >
      <View style={styles.offeringContent}>
        <Text style={styles.offeringTitle}>
          {item.course_code} — {item.course_title}
        </Text>
        <Text style={styles.offeringSubtitle}>
          {item.term}
          {item.section ? ` - ${item.section}` : ''} • Offering #{item.id}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.manageButton}
        onPress={() => navigation.navigate('CourseDetails', { offeringId: item.id.toString() })}
      >
        <Text style={styles.manageText}>Manage</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )

  const renderQuizRequest = ({ item }: { item: AccessRequest }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestContent}>
        <Text style={styles.requestTitle}>
          {item.ta_name} → {item.quiz_title}
        </Text>
        <Text style={styles.requestSubtitle}>
          {item.course_code} — {item.course_title} • Request: {item.request_type} access
        </Text>
        <Text style={styles.requestMeta}>
          Requested: {new Date(item.requested_at).toLocaleDateString()}
        </Text>
        <Text style={styles.requestMeta}>
          TA: {item.ta_email}
        </Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleRespondToRequest(item.id, 'approve')}
        >
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => {
            Alert.prompt(
              'Rejection Reason',
              'Optional rejection message:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reject',
                  onPress: (message?: string) => handleRespondToRequest(item.id, 'reject', message)
                }
              ]
            )
          }}
        >
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <SidebarNav
        tabs={sidebarTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Text style={[styles.actionText, { color: theme.bg }]}>👤 Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Text style={[styles.actionText, { color: theme.bg }]}>🚫 Suspended Quizzes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Text style={[styles.actionText, { color: theme.bg }]}>📊 Proctoring Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>My Offerings</Text>
          <Text style={[styles.sectionCount, { color: theme['text-secondary'] }]}>{offerings.length} offerings</Text>
        </View>

        <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {loading ? (
            <Text style={styles.loadingText}>Loading offerings...</Text>
          ) : offerings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>No offerings yet</Text>
              <Text style={styles.emptyDescription}>Create an offering from existing courses</Text>
            </View>
          ) : (
            <FlatList
              data={offerings}
              renderItem={renderOffering}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quiz Access Requests</Text>
          <Text style={styles.sectionCount}>{quizRequests.length} pending</Text>
        </View>

        <View style={styles.sectionContent}>
          <View style={styles.requestsHeader}>
            <Text style={styles.requestsTitle}>Pending TA Requests</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={loadQuizRequests}>
              <Text style={styles.refreshText}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingRequests ? (
            <Text style={styles.loadingText}>Loading requests...</Text>
          ) : quizRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptyDescription}>No TA quiz access requests at this time</Text>
            </View>
          ) : (
            <FlatList
              data={quizRequests}
              renderItem={renderQuizRequest}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          )}
        </View>
      </View>

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.error }]} onPress={logout}>
        <Text style={[styles.logoutText, { color: theme.bg }]}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.9,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    margin: 20,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionContent: {
    borderRadius: 10,
    padding: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
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
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  offeringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  offeringContent: {
    flex: 1,
  },
  offeringTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  offeringSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  manageButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  manageText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  requestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  requestsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  refreshText: {
    fontSize: 14,
  },
  requestItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  requestContent: {
    marginBottom: 10,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  requestSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  requestMeta: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  approveButton: {
    backgroundColor: '#28a745',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  approveText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  rejectText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  logoutButton: {
    margin: 20,
    padding: 15,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})