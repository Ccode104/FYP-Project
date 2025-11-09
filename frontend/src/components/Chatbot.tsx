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

      const response = await fetch(`http://localhost:4000${endpoint}`, {
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

      const response = await fetch('http://localhost:4000/api/chatbot/pdf/upload', {
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
      <div className="chatbot-header">
        <h3>🤖 AI Assistant</h3>
        {type === 'pdf' && !uploadedPdfId && (
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
              Upload Document
            </button>
          </div>
        )}
      </div>

      <div className="chatbot-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>👋 Hi! I'm your AI assistant.</p>
            <p>{type === 'course' ? 'Ask me anything about this course!' : 'Upload a document (PDF/DOCX/TXT) to get started!'}</p>
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
