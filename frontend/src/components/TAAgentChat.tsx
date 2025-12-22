import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../services/api';
import './TAAgentChat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface TAAgentChatProps {
  submissionId?: number;
  assignmentId?: number;
  courseId?: number;
  onClose?: () => void;
}

interface ChatContext {
  submissionId?: number;
  assignmentId?: number;
  courseId?: number;
  action?: string;
}

export default function TAAgentChat({ submissionId, assignmentId, courseId, onClose }: TAAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add initial welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your TA Evaluation Assistant. I can help you with:

• **Assignment Analysis**: Review student submissions and identify strengths/weaknesses
• **Viva Questions**: Generate oral examination questions based on assignment content
• **Debugging Exercises**: Create debugging scenarios and questions for code submissions
• **Grading Suggestions**: Provide detailed rubrics and feedback recommendations
• **Code Quality Analysis**: Evaluate code structure, best practices, and improvement suggestions

${submissionId ? `Currently analyzing submission #${submissionId}. ` : ''}
${assignmentId ? `Working with assignment #${assignmentId}. ` : ''}
How can I assist you with your evaluation tasks today?`,
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMessage]);
  }, [submissionId, assignmentId]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const context: ChatContext = {};
      if (submissionId) context.submissionId = submissionId;
      if (assignmentId) context.assignmentId = assignmentId;
      if (courseId) context.courseId = courseId;

      const response = await apiFetch('/api/ta/agent/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: userMessage.content,
          context
        })
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        timestamp: response.timestamp
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message to TA agent:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    {
      label: 'Analyze Submission',
      prompt: `Please analyze this submission in detail. Identify the student's strengths, weaknesses, and provide specific feedback points.`,
      icon: '🔍'
    },
    {
      label: 'Generate Viva Questions',
      prompt: `Generate 5 viva questions for this assignment at different difficulty levels (easy, medium, hard). Include expected answers and evaluation criteria.`,
      icon: '🎤'
    },
    {
      label: 'Debugging Questions',
      prompt: `Create debugging questions and scenarios based on this code submission. Focus on identifying bugs, explaining fixes, and optimization opportunities.`,
      icon: '🐛'
    },
    {
      label: 'Grading Rubric',
      prompt: `Provide a detailed grading rubric for this assignment. Include categories, point allocations, and specific criteria for different performance levels.`,
      icon: '📊'
    },
    {
      label: 'Code Quality Analysis',
      prompt: `Analyze the code quality, structure, and best practices. Provide specific suggestions for improvement and alternative approaches.`,
      icon: '💡'
    }
  ];

  const handleQuickAction = (prompt: string) => {
    setInputMessage(prompt);
  };

  if (isMinimized) {
    return (
      <div className="ta-agent-chat minimized" onClick={() => setIsMinimized(false)}>
        <div className="chat-header">
          <span className="chat-title">🤖 TA Assistant</span>
          <div className="chat-controls">
            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onClose?.(); }}>
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ta-agent-chat">
      <div className="chat-header">
        <span className="chat-title">🤖 TA Evaluation Assistant</span>
        <div className="chat-controls">
          <button className="btn-icon" onClick={() => setIsMinimized(true)}>
            −
          </button>
          <button className="btn-icon" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'user' ? '👨‍🏫' : '🤖'}
            </div>
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              <div className="message-time">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="message-text typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="quick-actions">
        {quickActions.map((action, index) => (
          <button
            key={index}
            className="quick-action-btn"
            onClick={() => handleQuickAction(action.prompt)}
            disabled={isLoading}
          >
            {action.icon} {action.label}
          </button>
        ))}
      </div>

      <div className="chat-input">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything about assignment evaluation..."
          disabled={isLoading}
          rows={2}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!inputMessage.trim() || isLoading}
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </div>
    </div>
  );
}
