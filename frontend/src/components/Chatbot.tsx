import { useState, useRef, useEffect } from 'react'
import './Chatbot.css'
import { saveChatSession, loadUserChatSessions, loadChatSession, deleteChatSession } from '../services/chat'
import type { ChatSession, ChatData } from '../services/chat'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface ChatbotProps {
  courseId?: string | number
}

// Get API base URL from environment or use current host
const getApiBaseUrl = () => {
  if (import.meta.env.REACT_APP_API_URL) {
    return import.meta.env.REACT_APP_API_URL
  }
  // In production, use the same host as the frontend
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//${window.location.hostname}:4000`
  }
  // In development, use localhost
  return 'http://localhost:4000'
}

export default function Chatbot({ courseId }: ChatbotProps) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentChat, setCurrentChat] = useState<ChatData | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [enableWebSearch, setEnableWebSearch] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [loadingSessions, setLoadingSessions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
      const token = localStorage.getItem('auth:token')
      const apiBaseUrl = getApiBaseUrl()

      const response = await fetch(`${apiBaseUrl}/api/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: courseId?.toString(),
          documentIds: currentChat.uploadedDocuments.map(d => d.id),
          message: editingText,
          history: truncatedMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          enableWebSearch
        })
      })

      const data = await response.json()

      if (response.ok) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.reply,
          timestamp: data.timestamp
        }
        updateCurrentChat({
          messages: [...truncatedMessages, assistantMessage]
        })
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
      const token = localStorage.getItem('auth:token')
      const apiBaseUrl = getApiBaseUrl()

      const response = await fetch(`${apiBaseUrl}/api/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: courseId?.toString(),
          documentIds: currentChat.uploadedDocuments.map(d => d.id),
          message: input,
          history: [...currentChat.messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          enableWebSearch
        })
      })

      const data = await response.json()

      if (response.ok) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.reply,
          timestamp: data.timestamp
        }
        updateCurrentChat({
          messages: [...currentChat.messages, userMessage, assistantMessage]
        })
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
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
      const token = localStorage.getItem('auth:token')
      const formData = new FormData()
      formData.append('document', documentFile)
      const apiBaseUrl = getApiBaseUrl()

      const response = await fetch(`${apiBaseUrl}/api/chatbot/document/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        updateCurrentChat({
          uploadedDocuments: [...currentChat.uploadedDocuments, {
            id: data.documentId,
            filename: data.filename,
            usedOCR: data.usedOCR
          }]
        })
        setDocumentFile(null)

        // Add system message about uploaded document
        const uploadMessage: Message = {
          role: 'system',
          content: `Document "${data.filename}" uploaded successfully${data.usedOCR ? ' (OCR processed)' : ''}. You can now ask questions about it!`,
          timestamp: new Date().toISOString()
        }
        updateCurrentChat({
          messages: [...currentChat.messages, uploadMessage]
        })
      } else {
        throw new Error(data.error || 'Failed to upload document')
      }
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
    <div style={{
      height: '100%',
      display: 'flex',
      backgroundColor: 'var(--bg)',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{
          width: '260px',
          borderRight: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Sidebar Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text)'
            }}>
              Chat History
            </h3>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ✕
            </button>
          </div>

          {/* New Chat Button */}
          <div style={{ padding: '16px' }}>
            <button
              onClick={() => {
                createNewChat()
                setSidebarOpen(false)
              }}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              ➕ New Chat
            </button>
          </div>

          {/* Chat List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px'
          }}>
            {loadingSessions ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: '14px'
              }}>
                Loading chats...
              </div>
            ) : chatSessions.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: '14px'
              }}>
                No chats yet. Start a conversation!
              </div>
            ) : (
              chatSessions.map(session => (
                <button
                  key={session.id}
                  onClick={async () => {
                    await loadChatData(session.id)
                    setSidebarOpen(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: currentChat?.id === session.id ? 'var(--bg-secondary)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    marginBottom: '4px'
                  }}
                >
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'var(--text)',
                    marginBottom: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {session.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                    <span>{session.messageCount} messages</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px'
            }}
          >
            ☰
          </button>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            🤖
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text)'
            }}>
              {currentChat?.title || 'AI Assistant'}
            </h1>
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: 'var(--muted)'
            }}>
              Course & Document Q&A
            </p>
          </div>
        </div>

        {/* Document count */}
        {currentChat && currentChat.uploadedDocuments.length > 0 && (
          <div style={{
            fontSize: '12px',
            color: 'var(--muted)',
            backgroundColor: 'var(--bg-secondary)',
            padding: '4px 8px',
            borderRadius: '12px'
          }}>
            📄 {currentChat.uploadedDocuments.length} document{currentChat.uploadedDocuments.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {currentChat && currentChat.messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            color: 'var(--muted)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '28px',
              marginBottom: '20px'
            }}>
              🤖
            </div>
            <h2 style={{
              margin: '0 0 12px 0',
              fontSize: '24px',
              fontWeight: '600',
              color: 'var(--text)'
            }}>
              How can I help you today?
            </h2>
            <p style={{
              margin: 0,
              fontSize: '16px',
              maxWidth: '400px',
              lineHeight: '1.5'
            }}>
              Ask me questions about your course content, assignments, or upload documents for analysis.
            </p>
          </div>
        )}

        {currentChat && currentChat.messages.map((msg, idx) => (
          <div key={idx} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '12px'
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: '18px',
              backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'var(--surface)',
              color: msg.role === 'user' ? 'white' : 'var(--text)',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              boxShadow: msg.role === 'assistant' ? 'var(--shadow-sm)' : 'none',
              fontSize: '14px',
              lineHeight: '1.4',
              whiteSpace: 'pre-wrap',
              position: 'relative'
            }}>
              {editingMessageId === msg.timestamp ? (
                <div>
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        saveEditedMessage()
                      } else if (e.key === 'Escape') {
                        cancelEditing()
                      }
                    }}
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      padding: '8px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                    autoFocus
                  />
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '8px',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      onClick={cancelEditing}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        color: 'var(--muted)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditedMessage}
                      disabled={!editingText.trim() || loading}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: (!editingText.trim() || loading) ? 'not-allowed' : 'pointer',
                        opacity: (!editingText.trim() || loading) ? 0.6 : 1
                      }}
                    >
                      Save & Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {msg.content}
                  {msg.role === 'user' && (
                    <button
                      className="edit-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingMessage(msg.timestamp, msg.content);
                      }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        opacity: 0,
                        transition: 'opacity 0.2s'
                      }}
                      title="Edit message"
                    >
                      ✏️
                    </button>
                  )}
                  {msg.role === 'system' && (
                    <div style={{
                      fontSize: '12px',
                      opacity: 0.7,
                      marginTop: '8px',
                      fontStyle: 'italic'
                    }}>
                      System message
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: '12px'
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: '18px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              fontSize: '14px',
              color: 'var(--text)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--primary)',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--surface)'
      }}>
        {/* Document Upload */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px',
          padding: '12px',
          border: '2px dashed var(--border)',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          {/* Web Search Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginRight: '16px'
          }}>
            <label style={{
              fontSize: '14px',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <input
                type="checkbox"
                checked={enableWebSearch}
                onChange={(e) => setEnableWebSearch(e.target.checked)}
                style={{ margin: 0 }}
              />
              🌐 Web Search
            </label>
          </div>
          <input
            type="file"
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.gif,.bmp,.tiff"
            onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
            disabled={loading}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            style={{
              cursor: loading ? 'not-allowed' : 'pointer',
              color: 'var(--primary)',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📎 Upload Document
          </label>
          {documentFile && (
            <span style={{
              fontSize: '12px',
              color: 'var(--muted)',
              flex: 1
            }}>
              {documentFile.name}
            </span>
          )}
          {documentFile && (
            <button
              onClick={handleDocumentUpload}
              disabled={loading}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          )}
        </div>

        {/* Message Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          backgroundColor: 'var(--surface)'
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask a question about the course or documents..."
            disabled={loading}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              padding: '0',
              backgroundColor: 'transparent',
              color: 'var(--text)'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: !input.trim() || loading ? 'var(--bg-secondary)' : 'var(--primary)',
              border: 'none',
              cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: !input.trim() || loading ? 'var(--muted)' : 'white'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9"></polygon>
            </svg>
          </button>
        </div>
      </div>

        {/* Add CSS animation for loading spinner */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
