import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ScrollView, Alert, Dimensions } from 'react-native'
import { RouteProp, useRoute } from '@react-navigation/native'
import { RootStackParamList } from '../types/navigation'
import { loadUserChatSessions, saveChatSession, loadChatSession, deleteChatSession, ChatSession, ChatData } from '../services/chat'
import { apiFetch } from '../services/api'

const { width } = Dimensions.get('window')

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

type ChatbotRouteProp = RouteProp<RootStackParamList, 'Chatbot'>

export default function Chatbot() {
  const route = useRoute<ChatbotRouteProp>()
  const courseId = route.params?.courseId

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentChat, setCurrentChat] = useState<ChatData | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [documentFile, setDocumentFile] = useState<any>(null)
  const [enableWebSearch, setEnableWebSearch] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<FlatList>(null)

  // Load chat sessions from database on mount
  useEffect(() => {
    loadChatSessions()
  }, [])

  const loadChatSessions = async () => {
    try {
      setLoadingSessions(true)
      const { sessions } = await loadUserChatSessions()
      setChatSessions(sessions)
      // Load the most recent chat if available, otherwise create a new one
      if (sessions.length > 0 && !currentChat) {
        await loadChatData(sessions[0].id)
      } else if (sessions.length === 0 && !currentChat) {
        await createNewChat()
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadChatData = async (sessionId: string) => {
    try {
      const { session } = await loadChatSession(sessionId)
      setCurrentChat(session)
    } catch (error) {
      console.error('Failed to load chat data:', error)
    }
  }

  // Save current chat to database when it changes
  const saveCurrentChat = async () => {
    if (!currentChat) return

    try {
      await saveChatSession({
        title: currentChat.title,
        messages: currentChat.messages,
        uploadedDocuments: currentChat.uploadedDocuments,
        courseId: currentChat.courseId
      })
      // Reload sessions to get updated data
      await loadChatSessions()
    } catch (error) {
      console.error('Failed to save chat:', error)
    }
  }

  // Auto-save current chat when messages change
  useEffect(() => {
    if (currentChat && currentChat.messages.length > 0) {
      const timeoutId = setTimeout(saveCurrentChat, 1000) // Debounce saves
      return () => clearTimeout(timeoutId)
    }
  }, [currentChat?.messages, currentChat?.uploadedDocuments])

  // Create new chat
  const createNewChat = async () => {
    const newChatData: ChatData = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      uploadedDocuments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      const { sessionId } = await saveChatSession({
        title: newChatData.title,
        messages: newChatData.messages,
        uploadedDocuments: newChatData.uploadedDocuments,
        courseId: courseId ? parseInt(courseId.toString()) : undefined
      })

      // Reload sessions and set current chat
      await loadChatSessions()
      await loadChatData(sessionId)
    } catch (error) {
      console.error('Failed to create new chat:', error)
    }
  }

  // Update current chat
  const updateCurrentChat = (updates: Partial<ChatData>) => {
    if (currentChat) {
      setCurrentChat({
        ...currentChat,
        ...updates,
        updatedAt: new Date().toISOString()
      })
    }
  }

  // Delete a chat session
  const deleteChat = async (sessionId: string) => {
    try {
      setDeletingChatId(sessionId)
      await deleteChatSession(sessionId)

      // If we're deleting the current chat, switch to another one or create new
      if (currentChat?.id === sessionId) {
        const remainingSessions = chatSessions.filter(s => s.id !== sessionId)
        if (remainingSessions.length > 0) {
          await loadChatData(remainingSessions[0].id)
        } else {
          await createNewChat()
        }
      }

      // Reload sessions
      await loadChatSessions()
    } catch (error) {
      console.error('Failed to delete chat:', error)
      Alert.alert('Error', 'Failed to delete chat')
    } finally {
      setDeletingChatId(null)
    }
  }

  // Confirm delete chat
  const confirmDeleteChat = (sessionId: string, title: string) => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteChat(sessionId) }
      ]
    )
  }

  // Generate chat title from first message
  const generateChatTitle = (message: string) => {
    return message.length > 50 ? message.substring(0, 50) + '...' : message
  }

  // Start editing a message
  const startEditingMessage = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId)
    setEditingText(currentText)
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingMessageId(null)
    setEditingText('')
  }

  // Save edited message and regenerate conversation from that point
  const saveEditedMessage = async () => {
    if (!editingMessageId || !currentChat) return

    const messageIndex = currentChat.messages.findIndex(msg => msg.timestamp === editingMessageId)
    if (messageIndex === -1) return

    // Truncate messages after the edited message (like ChatGPT)
    const truncatedMessages = currentChat.messages.slice(0, messageIndex + 1)
    truncatedMessages[messageIndex] = {
      ...truncatedMessages[messageIndex],
      content: editingText,
      timestamp: new Date().toISOString() // Update timestamp
    }

    // Update chat with truncated messages
    updateCurrentChat({
      messages: truncatedMessages,
      title: messageIndex === 0 ? generateChatTitle(editingText) : currentChat.title
    })

    setEditingMessageId(null)
    setEditingText('')
    setLoading(true)

    try {
      const response = await apiFetch('/chatbot/chat', {
        method: 'POST',
        body: {
          courseId: courseId?.toString(),
          documentIds: currentChat.uploadedDocuments.map(d => d.id),
          message: editingText,
          history: truncatedMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          enableWebSearch
        }
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: (response as any).reply,
        timestamp: (response as any).timestamp
      }
      updateCurrentChat({
        messages: [...truncatedMessages, assistantMessage]
      })
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }
      updateCurrentChat({
        messages: [...truncatedMessages, errorMessage]
      })
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollToEnd({ animated: true })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentChat?.messages])

  const sendMessage = async () => {
    if (!input.trim() || loading || !currentChat) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    // Update chat with new message
    updateCurrentChat({
      messages: [...currentChat.messages, userMessage],
      title: currentChat.messages.length === 0 ? generateChatTitle(input) : currentChat.title
    })

    setInput('')
    setLoading(true)

    try {
      const response = await apiFetch('/chatbot/chat', {
        method: 'POST',
        body: {
          courseId: courseId?.toString(),
          documentIds: currentChat.uploadedDocuments.map(d => d.id),
          message: input,
          history: [...currentChat.messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          enableWebSearch
        }
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: (response as any).reply,
        timestamp: (response as any).timestamp
      }
      updateCurrentChat({
        messages: [...currentChat.messages, userMessage, assistantMessage]
      })
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }
      updateCurrentChat({
        messages: [...currentChat.messages, userMessage, errorMessage]
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentUpload = async () => {
    if (!documentFile || !currentChat) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('document', documentFile)

      const response = await apiFetch('/chatbot/document/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      updateCurrentChat({
        uploadedDocuments: [...currentChat.uploadedDocuments, {
          id: (response as any).documentId,
          filename: (response as any).filename,
          usedOCR: (response as any).usedOCR
        }]
      })
      setDocumentFile(null)

      // Add system message about uploaded document
      const uploadMessage: Message = {
        role: 'system',
        content: `Document "${(response as any).filename}" uploaded successfully${(response as any).usedOCR ? ' (OCR processed)' : ''}. You can now ask questions about it!`,
        timestamp: new Date().toISOString()
      }
      updateCurrentChat({
        messages: [...currentChat.messages, uploadMessage]
      })
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'system',
        content: `Failed to upload document: ${error.message}`,
        timestamp: new Date().toISOString()
      }
      updateCurrentChat({
        messages: [...currentChat.messages, errorMessage]
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      {sidebarOpen && (
        <View style={styles.sidebar}>
          {/* Sidebar Header */}
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Chat History</Text>
            <TouchableOpacity
              onPress={() => setSidebarOpen(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* New Chat Button */}
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={() => {
              createNewChat()
              setSidebarOpen(false)
            }}
          >
            <Text style={styles.newChatText}>➕ New Chat</Text>
          </TouchableOpacity>

          {/* Chat List */}
          <ScrollView style={styles.chatList}>
            {loadingSessions ? (
              <Text style={styles.loadingText}>Loading chats...</Text>
            ) : chatSessions.length === 0 ? (
              <Text style={styles.emptyText}>No chats yet. Start a conversation!</Text>
            ) : (
              chatSessions.map(session => (
                <View key={session.id} style={styles.chatItemContainer}>
                  <TouchableOpacity
                    onPress={async () => {
                      await loadChatData(session.id)
                      setSidebarOpen(false)
                    }}
                    style={[
                      styles.chatItem,
                      currentChat?.id === session.id && styles.activeChat
                    ]}
                  >
                    <Text style={styles.chatTitle} numberOfLines={1}>
                      {session.title}
                    </Text>
                    <View style={styles.chatMeta}>
                      <Text style={styles.chatDate}>
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </Text>
                      <Text style={styles.messageCount}>
                        {session.messageCount} messages
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteChatButton}
                    onPress={() => confirmDeleteChat(session.id, session.title)}
                    disabled={deletingChatId === session.id}
                  >
                    <Text style={styles.deleteChatText}>
                      {deletingChatId === session.id ? '⏳' : '🗑️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Main Chat Area */}
      <View style={styles.mainArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setSidebarOpen(!sidebarOpen)}
            style={styles.menuButton}
          >
            <Text style={styles.menuText}>☰</Text>
          </TouchableOpacity>
          <View style={styles.botIcon}>
            <Text style={styles.botEmoji}>🤖</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {currentChat?.title || 'AI Assistant'}
            </Text>
            <Text style={styles.headerSubtitle}>
              Course & Document Q&A
            </Text>
          </View>
          {currentChat && currentChat.uploadedDocuments.length > 0 && (
            <View style={styles.docCount}>
              <Text style={styles.docCountText}>
                📄 {currentChat.uploadedDocuments.length}
              </Text>
            </View>
          )}
        </View>

        {/* Messages Area */}
        <FlatList
          ref={messagesEndRef}
          data={currentChat?.messages || []}
          renderItem={({ item, index }) => (
            <View style={[
              styles.messageWrapper,
              item.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper
            ]}>
              <View style={[
                styles.messageBubble,
                item.role === 'user' ? styles.userBubble : styles.assistantBubble
              ]}>
                {editingMessageId === item.timestamp ? (
                  <View>
                    <TextInput
                      style={styles.editInput}
                      value={editingText}
                      onChangeText={setEditingText}
                      multiline
                      autoFocus
                    />
                    <View style={styles.editButtons}>
                      <TouchableOpacity
                        style={styles.cancelEditButton}
                        onPress={cancelEditing}
                      >
                        <Text style={styles.cancelEditText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.saveEditButton}
                        onPress={saveEditedMessage}
                        disabled={!editingText.trim() || loading}
                      >
                        <Text style={styles.saveEditText}>Save & Regenerate</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={[
                      styles.messageText,
                      item.role === 'user' ? styles.userText : styles.assistantText
                    ]}>
                      {item.content}
                    </Text>
                    {item.role === 'user' && (
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => startEditingMessage(item.timestamp, item.content)}
                      >
                        <Text style={styles.editButtonText}>✏️</Text>
                      </TouchableOpacity>
                    )}
                    {item.role === 'system' && (
                      <Text style={styles.systemLabel}>System message</Text>
                    )}
                  </>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={scrollToBottom}
        />

        {loading && (
          <View style={styles.loadingMessage}>
            <View style={styles.loadingBubble}>
              <View style={styles.spinner} />
              <Text style={styles.loadingText}>Thinking...</Text>
            </View>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputArea}>
          {/* Document Upload */}
          <View style={styles.uploadSection}>
            <View style={styles.webSearchToggle}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setEnableWebSearch(!enableWebSearch)}
              >
                <Text style={styles.checkboxText}>
                  {enableWebSearch ? '☑' : '☐'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.webSearchText}>🌐 Web Search</Text>
            </View>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => Alert.alert('Upload', 'Document upload feature coming soon!')}
            >
              <Text style={styles.uploadText}>📎 Upload Document</Text>
            </TouchableOpacity>

            {documentFile && (
              <Text style={styles.fileName}>{documentFile.name}</Text>
            )}

            {documentFile && (
              <TouchableOpacity
                style={styles.uploadActionButton}
                onPress={handleDocumentUpload}
                disabled={loading}
              >
                <Text style={styles.uploadActionText}>
                  {loading ? 'Uploading...' : 'Upload'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Message Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.messageInput}
              value={input}
              onChangeText={setInput}
              placeholder="Ask a question about the course or documents..."
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || loading) && styles.disabledSendButton
              ]}
              onPress={sendMessage}
              disabled={!input.trim() || loading}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  sidebarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    color: '#6c757d',
  },
  newChatButton: {
    margin: 16,
    padding: 12,
    backgroundColor: '#007bff',
    borderRadius: 8,
    alignItems: 'center',
  },
  newChatText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  chatList: {
    flex: 1,
    padding: 8,
  },
  chatItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatItem: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
  },
  activeChat: {
    backgroundColor: '#f8f9fa',
  },
  deleteChatButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 4,
  },
  deleteChatText: {
    fontSize: 16,
  },
  chatTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 4,
  },
  chatMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  messageCount: {
    fontSize: 12,
    color: '#6c757d',
  },
  loadingText: {
    padding: 20,
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 14,
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 14,
  },
  mainArea: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 4,
    marginRight: 12,
  },
  menuText: {
    fontSize: 18,
    color: '#6c757d',
  },
  botIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  botEmoji: {
    fontSize: 16,
    color: 'white',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6c757d',
  },
  docCount: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  docCountText: {
    fontSize: 12,
    color: '#6c757d',
  },
  messagesArea: {
    flex: 1,
  },
  messagesContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  assistantMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    position: 'relative',
  },
  userBubble: {
    backgroundColor: '#007bff',
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: '#212529',
  },
  editButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  editButtonText: {
    fontSize: 12,
    opacity: 0.7,
  },
  systemLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 8,
    fontStyle: 'italic',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    minHeight: 60,
    backgroundColor: 'white',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 4,
  },
  cancelEditText: {
    fontSize: 12,
    color: '#6c757d',
  },
  saveEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007bff',
    borderRadius: 4,
  },
  saveEditText: {
    fontSize: 12,
    color: 'white',
  },
  loadingMessage: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  spinner: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: '#007bff',
    borderTopColor: 'transparent',
    borderRadius: 8,
  },
  inputArea: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  uploadSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    marginBottom: 12,
  },
  webSearchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxText: {
    fontSize: 16,
  },
  webSearchText: {
    fontSize: 14,
    color: '#212529',
  },
  uploadButton: {
    marginRight: 16,
  },
  uploadText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  fileName: {
    flex: 1,
    fontSize: 12,
    color: '#6c757d',
  },
  uploadActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007bff',
    borderRadius: 6,
  },
  uploadActionText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 24,
    backgroundColor: '#ffffff',
  },
  messageInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 0,
    paddingVertical: 0,
    maxHeight: 100,
    color: '#212529',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  disabledSendButton: {
    backgroundColor: '#e9ecef',
  },
  sendIcon: {
    fontSize: 16,
    color: 'white',
  },
})