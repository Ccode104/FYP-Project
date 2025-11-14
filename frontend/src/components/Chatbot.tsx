import { useState, useRef, useEffect } from 'react'
import './Chatbot.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatbotProps {
  type: 'course' | 'pdf'
  offeringId?: number
  pdfId?: string
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

export default function Chatbot({ type, offeringId, pdfId }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadedPdfId, setUploadedPdfId] = useState<string | undefined>(pdfId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const token = localStorage.getItem('auth:token')
      const endpoint = type === 'course'
        ? `/api/chatbot/course/${offeringId}`
        : `/api/chatbot/pdf/${uploadedPdfId}/chat`
      const apiBaseUrl = getApiBaseUrl()

      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: input,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      const data = await response.json()

      if (response.ok) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.reply,
          timestamp: data.timestamp
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handlePDFUpload = async () => {
    if (!pdfFile) return

    setLoading(true)
    try {
      const token = localStorage.getItem('auth:token')
      const formData = new FormData()
      formData.append('pdf', pdfFile)
      const apiBaseUrl = getApiBaseUrl()

      const response = await fetch(`${apiBaseUrl}/api/chatbot/pdf/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setUploadedPdfId(data.pdfId)
        setMessages([{
          role: 'assistant',
          content: `Document \"${data.filename}\" uploaded successfully! You can now ask questions about it.`,
          timestamp: new Date().toISOString()
        }])
      } else {
        throw new Error(data.error || 'Failed to upload PDF')
      }
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`)
    } finally {
      setLoading(false)
      setPdfFile(null)
    }
  }

  return (
    <div className="chatbot-container">
      {type === 'pdf' && !uploadedPdfId && (
        <div className="chatbot-header">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Upload Document
          </h3>
          <div className="pdf-upload-section">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              disabled={loading}
            />
            <button
              onClick={handlePDFUpload}
              disabled={!pdfFile || loading}
              className="btn btn-primary"
            >
              {loading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>
      )}

      <div className="chatbot-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>{type === 'course' ? '🤖' : '📄'}</p>
            <p>{type === 'course' ? 'Ask me anything about this course!' : 'Upload a document to get started!'}</p>
            <p style={{ fontSize: '14px', marginTop: '8px', opacity: 0.8 }}>
              {type === 'course' ? 'I can help with course content, assignments, and more.' : 'Supported formats: PDF, DOCX, TXT'}
            </p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.role}`}>
            <div className="message-content">{msg.content}</div>
            <div className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
          </div>
        ))}
        {loading && (
          <div className="message message-assistant">
            <div className="message-content typing">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={type === 'pdf' && !uploadedPdfId ? 'Upload a PDF first...' : 'Ask a question...'}
          disabled={loading || (type === 'pdf' && !uploadedPdfId)}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading || (type === 'pdf' && !uploadedPdfId)}
          className="btn btn-primary"
        >
          Send
        </button>
      </div>
    </div>
  )
}