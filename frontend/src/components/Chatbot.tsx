import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch, apiForm } from '../services/api';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  id: string;
}

interface ChatSession {
  id: string;
  title: string;
  courseId?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface UploadedDocument {
  id: string;
  filename: string;
  usedOCR?: boolean;
}

interface ChatbotProps {
  courseId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Chatbot({ courseId, isOpen, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `🤖 **EduPortal AI Assistant**

Hello! I'm your intelligent course assistant with 4 specialized modes:

📚 **Course Info**: Course details, syllabus, professor info
📝 **Assignments & Quizzes**: Upcoming deadlines, submission status
📄 **Document Q&A**: Query uploaded documents, PYQs, course notes
🌐 **Web Search**: General programming help, concepts

**How to use me:**
- Ask questions naturally - I'll automatically select the best mode
- Upload documents for Q&A using the attachment button
- Save/load chat sessions for continuity
- Use web search for programming concepts

What would you like to know about your course?`,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  // Load chat sessions
  const loadChatSessions = useCallback(async () => {
    try {
      const response = await apiFetch<{ sessions: ChatSession[] }>('/api/chatbot/chats');
      setSessions(response.sessions || []);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadChatSessions();
    }
  }, [isOpen, loadChatSessions]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await apiFetch<{ reply: string; timestamp: string }>('/api/chatbot/chat', {
        method: 'POST',
        body: {
          courseId: courseId?.toString(),
          documentIds: uploadedDocuments.map((doc) => doc.id),
          message: input.trim(),
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          enableWebSearch: true
        }
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply || 'I apologize, but I couldn\'t generate a response.',
        timestamp: response.timestamp || new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error: unknown) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `❌ Error: ${(error as Error).message || 'Failed to get response. Please try again.'}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Save current chat session
  const saveChatSession = async () => {
    if (messages.length <= 1) return; // Only welcome message

    try {
      const title = messages[1]?.content.slice(0, 50) + '...' || 'Chat Session';
      await apiFetch('/api/chatbot/chats', {
        method: 'POST',
        body: {
          title,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
          })),
          uploadedDocuments,
          courseId
        }
      });
      loadChatSessions();
      alert('Chat session saved successfully!');
    } catch (error) {
      console.error('Failed to save chat session:', error);
      alert('Failed to save chat session');
    }
  };

  // Load chat session
  const loadChatSession = async (sessionId: string) => {
    try {
      const response = await apiFetch<{ session: { messages: Message[]; uploadedDocuments: UploadedDocument[] } & ChatSession }>(`/api/chatbot/chats/${sessionId}`);
      setMessages(response.session.messages.map((m, index: number) => ({
        ...m,
        id: `loaded-${index}`
      })));
      setUploadedDocuments(response.session.uploadedDocuments || []);
      setCurrentSession(response.session);
      setShowSessions(false);
    } catch (error) {
      console.error('Failed to load chat session:', error);
      alert('Failed to load chat session');
    }
  };

  // Delete chat session
  const deleteChatSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this chat session?')) return;

    try {
      await apiFetch(`/api/chatbot/chats/${sessionId}`, {
        method: 'DELETE'
      });
      loadChatSessions();
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        // Reset to welcome message
        const welcomeMessage: Message = {
          id: 'welcome-reset',
          role: 'assistant',
          content: 'Chat session deleted. How can I help you today?',
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      alert('Failed to delete chat session');
    }
  };

  // Upload document
  const uploadDocument = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('document', file);

      const result = await apiForm<{ documentId: string; filename: string; usedOCR: boolean }>('/api/chatbot/document/upload', formData, 'POST');
      setUploadedDocuments(prev => [...prev, {
        id: result.documentId,
        filename: result.filename,
        usedOCR: result.usedOCR
      }]);

      alert(`Document "${result.filename}" uploaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document');
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadDocument(file);
    }
  };

  // Start new chat
  const startNewChat = () => {
    const welcomeMessage: Message = {
      id: 'welcome-new',
      role: 'assistant',
      content: 'New chat started. How can I help you today?',
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMessage]);
    setCurrentSession(null);
    setUploadedDocuments([]);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '400px',
      height: '100vh',
      backgroundColor: '#1a1a1a',
      borderLeft: '1px solid #333',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-2px 0 10px rgba(0,0,0,0.3)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #333',
        backgroundColor: '#2a2a2a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
          AI Assistant
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowSessions(!showSessions)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            💾 Sessions
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#cccccc'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Sessions Panel */}
      {showSessions && (
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #333',
          backgroundColor: '#2a2a2a',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: '600', color: '#ffffff' }}>Chat Sessions</span>
            <button
              onClick={startNewChat}
              style={{
                padding: '2px 6px',
                fontSize: '11px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              New Chat
            </button>
          </div>
          {sessions.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#cccccc', margin: 0 }}>No saved sessions</p>
          ) : (
            sessions.map(session => (
              <div key={session.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 0',
                borderBottom: '1px solid #444'
              }}>
                <div
                  onClick={() => loadChatSession(session.id)}
                  style={{ cursor: 'pointer', flex: 1 }}
                >
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#ffffff' }}>{session.title}</div>
                  <div style={{ fontSize: '10px', color: '#cccccc' }}>
                    {new Date(session.createdAt).toLocaleDateString()} • {session.messageCount} messages
                  </div>
                </div>
                <button
                  onClick={() => deleteChatSession(session.id)}
                  style={{
                    padding: '2px 4px',
                    fontSize: '10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer'
                  }}
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        backgroundColor: '#1a1a1a'
      }}>
        {messages.map(message => (
          <div key={message.id} style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: '18px',
              backgroundColor: message.role === 'user' ? '#007bff' : '#2a2a2a',
              color: message.role === 'user' ? '#ffffff' : '#ffffff',
              border: message.role === 'assistant' ? '1px solid #444' : 'none',
              whiteSpace: 'pre-wrap',
              fontSize: '14px',
              lineHeight: '1.4'
            }}>
              {message.content}
              <div style={{
                fontSize: '10px',
                color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : '#cccccc',
                marginTop: '4px',
                textAlign: 'right'
              }}>
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: '16px'
          }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '18px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              fontSize: '14px',
              color: '#cccccc'
            }}>
              🤔 Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Uploaded Documents */}
      {uploadedDocuments.length > 0 && (
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid #333',
          backgroundColor: '#2a2a2a'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#ffffff' }}>
            📎 Documents ({uploadedDocuments.length})
          </div>
          {uploadedDocuments.map((doc) => (
            <div key={doc.id} style={{
              fontSize: '11px',
              color: '#cccccc',
              backgroundColor: '#1a1a1a',
              padding: '4px 8px',
              borderRadius: '4px',
              marginBottom: '2px'
            }}>
              {doc.filename} {doc.usedOCR && '(OCR)'}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #333',
        backgroundColor: '#1a1a1a'
      }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything about your course..."
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid #444',
              borderRadius: '24px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#2a2a2a',
              color: '#ffffff'
            }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{
              padding: '12px 16px',
              backgroundColor: (!input.trim() || loading) ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '24px',
              cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {loading ? '⏳' : '📤'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{
            cursor: 'pointer',
            padding: '6px 12px',
            backgroundColor: '#444',
            color: 'white',
            borderRadius: '16px',
            fontSize: '12px'
          }}>
            📎 Upload
            <input
              type="file"
              onChange={handleFileUpload}
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              style={{ display: 'none' }}
            />
          </label>

          <button
            onClick={saveChatSession}
            disabled={messages.length <= 1}
            style={{
              padding: '6px 12px',
              backgroundColor: messages.length <= 1 ? '#444' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '12px',
              cursor: messages.length <= 1 ? 'not-allowed' : 'pointer'
            }}
          >
            💾 Save
          </button>

          <div style={{ fontSize: '11px', color: '#cccccc', flex: 1 }}>
            💡 Try: "What assignments are due?", "Explain this concept", "Search for algorithms"
          </div>
        </div>
      </div>
    </div>
  );
}
