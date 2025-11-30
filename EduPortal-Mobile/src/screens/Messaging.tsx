import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native'
import { getMessages, sendMessage, Message, getUsersForMessaging } from '../services/messages'

interface User {
  id: number
  name: string
  email: string
  role: string
}

export default function Messaging() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    loadMessages()
    loadUsers()
  }, [])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const data = await getMessages()
      setMessages(data.messages)
    } catch (error) {
      Alert.alert('Error', 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const data = await getUsersForMessaging()
      setUsers(data)
    } catch (error) {
      // Ignore error for users
    }
  }

  const handleSendMessage = async () => {
    if (!selectedUser || !subject.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill all fields')
      return
    }

    try {
      await sendMessage(selectedUser.id, subject, content)
      setSubject('')
      setContent('')
      setSelectedUser(null)
      loadMessages()
      Alert.alert('Success', 'Message sent successfully')
    } catch (error) {
      Alert.alert('Error', 'Failed to send message')
    }
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={styles.messageContainer}>
      <View style={styles.messageHeader}>
        <Text style={styles.sender}>{item.sender_name || 'Unknown'}</Text>
        <Text style={styles.date}>{new Date(item.sent_at).toLocaleString()}</Text>
      </View>
      <Text style={styles.subject}>{item.subject}</Text>
      <Text style={styles.content}>{item.content}</Text>
    </View>
  )

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[styles.userItem, selectedUser?.id === item.id && styles.selectedUser]}
      onPress={() => setSelectedUser(item)}
    >
      <Text style={styles.userName}>{item.name}</Text>
      <Text style={styles.userRole}>{item.role}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.composeContainer}>
        <Text style={styles.title}>Compose Message</Text>

        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.usersList}
        />

        {selectedUser && (
          <Text style={styles.selectedText}>To: {selectedUser.name}</Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="Subject"
          value={subject}
          onChangeText={setSubject}
        />

        <TextInput
          style={[styles.input, styles.contentInput]}
          placeholder="Message content"
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.sendButton, (!selectedUser || !subject.trim() || !content.trim()) && styles.disabledButton]}
          onPress={handleSendMessage}
          disabled={!selectedUser || !subject.trim() || !content.trim()}
        >
          <Text style={styles.sendButtonText}>Send Message</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.inboxTitle}>Inbox</Text>

      {loading ? (
        <Text style={styles.loading}>Loading messages...</Text>
      ) : messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✉️</Text>
          <Text style={styles.emptyTitle}>No messages</Text>
          <Text style={styles.emptyText}>Your inbox is empty</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messagesList}
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
  composeContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 10,
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
    marginBottom: 15,
  },
  usersList: {
    marginBottom: 15,
  },
  userItem: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginRight: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedUser: {
    backgroundColor: '#007bff',
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
  },
  userRole: {
    fontSize: 10,
    color: '#666',
  },
  selectedText: {
    fontSize: 14,
    marginBottom: 10,
    color: '#007bff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  contentInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  inboxTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    margin: 20,
    marginBottom: 10,
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
  messagesList: {
    flex: 1,
  },
  messageContainer: {
    backgroundColor: 'white',
    margin: 10,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sender: {
    fontWeight: 'bold',
  },
  date: {
    color: '#666',
    fontSize: 12,
  },
  subject: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
})