import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native'
import { useRoute, RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../types/navigation'
import { listDiscussionMessages, postDiscussionMessage, DiscussionMessage } from '../services/discussion'

type DiscussionForumRouteProp = RouteProp<RootStackParamList, 'DiscussionForum'>

export default function DiscussionForum() {
  const route = useRoute<DiscussionForumRouteProp>()
  const { courseId } = route.params || {}

  const [messages, setMessages] = useState<DiscussionMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState('')

  useEffect(() => {
    if (courseId) {
      loadMessages()
    }
  }, [courseId])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const data = await listDiscussionMessages(courseId!)
      setMessages(data)
    } catch (error) {
      Alert.alert('Error', 'Failed to load discussions')
    } finally {
      setLoading(false)
    }
  }

  const handlePost = async () => {
    if (!newPostContent.trim()) return

    try {
      await postDiscussionMessage(courseId!, newPostContent)
      setNewPostContent('')
      loadMessages()
    } catch (error) {
      Alert.alert('Error', 'Failed to post discussion')
    }
  }

  const handleReply = async (parentId: number) => {
    if (!replyContent.trim()) return

    try {
      await postDiscussionMessage(courseId!, replyContent, parentId)
      setReplyContent('')
      setReplyingTo(null)
      loadMessages()
    } catch (error) {
      Alert.alert('Error', 'Failed to post reply')
    }
  }

  const renderMessage = ({ item }: { item: DiscussionMessage }) => (
    <View style={styles.messageContainer}>
      <View style={styles.messageHeader}>
        <Text style={styles.author}>{item.author_name || 'Anonymous'}</Text>
        {item.author_role && <Text style={styles.role}>({item.author_role})</Text>}
        <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>
      <Text style={styles.content}>{item.content}</Text>

      {replyingTo === item.id ? (
        <View style={styles.replyForm}>
          <TextInput
            style={styles.input}
            placeholder="Write a reply..."
            value={replyContent}
            onChangeText={setReplyContent}
            multiline
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={() => handleReply(item.id)}>
              <Text style={styles.buttonText}>Reply</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setReplyingTo(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.replyButton} onPress={() => setReplyingTo(item.id)}>
          <Text style={styles.replyText}>Reply</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.newPostContainer}>
        <Text style={styles.title}>Start a Discussion</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Share your thoughts, ask questions..."
          value={newPostContent}
          onChangeText={setNewPostContent}
          multiline
          numberOfLines={4}
        />
        <TouchableOpacity
          style={[styles.postButton, !newPostContent.trim() && styles.disabledButton]}
          onPress={handlePost}
          disabled={!newPostContent.trim()}
        >
          <Text style={styles.postButtonText}>Post Discussion</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading discussions...</Text>
      ) : messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No discussions yet</Text>
          <Text style={styles.emptyText}>Be the first to start a conversation!</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderMessage}
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
  newPostContainer: {
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
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  postButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  postButtonText: {
    color: 'white',
    fontWeight: '600',
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
  messageContainer: {
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
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  author: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  role: {
    color: '#666',
    marginRight: 10,
  },
  date: {
    color: '#666',
    fontSize: 12,
  },
  content: {
    fontSize: 16,
    lineHeight: 22,
  },
  replyButton: {
    marginTop: 10,
  },
  replyText: {
    color: '#007bff',
    fontWeight: '600',
  },
  replyForm: {
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  cancelText: {
    color: '#666',
  },
})