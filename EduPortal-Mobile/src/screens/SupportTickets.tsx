import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native'
import { getUserTickets, SupportTicket } from '../services/support'

export default function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const data = await getUserTickets()
      setTickets(data.tickets || [])
    } catch (error) {
      console.error('Failed to load tickets:', error)
      Alert.alert('Error', 'Failed to load support tickets')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#ffc107'
      case 'in_progress': return '#007bff'
      case 'resolved': return '#28a745'
      case 'closed': return '#6c757d'
      default: return '#666'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#dc3545'
      case 'high': return '#fd7e14'
      case 'medium': return '#ffc107'
      case 'low': return '#28a745'
      default: return '#666'
    }
  }

  const renderTicket = ({ item }: { item: SupportTicket }) => (
    <View style={styles.ticketContainer}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>

      <Text style={styles.ticketDescription}>{item.description}</Text>

      <View style={styles.ticketMeta}>
        <Text style={styles.category}>Category: {item.category.replace('_', ' ')}</Text>
        <Text style={[styles.priority, { color: getPriorityColor(item.priority) }]}>
          Priority: {item.priority}
        </Text>
      </View>

      <Text style={styles.createdAt}>
        Created: {new Date(item.created_at).toLocaleString()}
      </Text>

      {item.assigned_to_name && (
        <Text style={styles.assignedTo}>Assigned to: {item.assigned_to_name}</Text>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Support Tickets</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <Text style={styles.loading}>Loading tickets...</Text>
        ) : tickets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyTitle}>No support tickets</Text>
            <Text style={styles.emptyText}>Create a ticket if you need help</Text>
          </View>
        ) : (
          <FlatList
            data={tickets}
            renderItem={renderTicket}
            keyExtractor={(item) => item.id.toString()}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <TouchableOpacity style={styles.createButton}>
          <Text style={styles.createText}>Create New Ticket</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    padding: 20,
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
  },
  list: {
    flex: 1,
  },
  ticketContainer: {
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
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  ticketTitle: {
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
  ticketDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  ticketMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  category: {
    fontSize: 12,
    color: '#666',
  },
  priority: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  createdAt: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  assignedTo: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})