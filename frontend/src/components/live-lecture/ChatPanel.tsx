import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ChatPanel.module.css';

interface ChatMessage {
  id: string;
  userId: number;
  userName: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
  role?: 'student' | 'teacher' | 'ta';
}

interface ChatPanelProps {
  isOpen: boolean;
  messages: ChatMessage[];
  newMessage: string;
  onNewMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onClose: () => void;
  currentUserId?: number;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  messages,
  newMessage,
  onNewMessageChange,
  onSendMessage,
  onClose,
  currentUserId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const getParticipantInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getAvatarClass = (role?: string) => {
    switch (role) {
      case 'teacher': return `${styles.messageAvatar} ${styles.teacher}`;
      case 'ta': return `${styles.messageAvatar} ${styles.ta}`;
      default: return styles.messageAvatar;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onNewMessageChange(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = (message: ChatMessage) => {
    const isOwn = message.userId === currentUserId;
    
    if (message.isSystem) {
      return (
        <div key={message.id} className={styles.systemMessage}>
          <span className={styles.systemMessageText}>{message.message}</span>
        </div>
      );
    }

    return (
      <motion.div
        key={`chat-${message.id}-${message.timestamp}`}
        className={`${styles.message} ${isOwn ? styles.own : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={getAvatarClass(message.role)}>
          {getParticipantInitials(message.userName)}
        </div>
        
        <div className={styles.messageContent}>
          <div className={styles.messageHeader}>
            <span className={styles.messageSender}>
              {message.userName}
              {isOwn && ' (You)'}
            </span>
            <span className={styles.messageTime}>
              {formatTime(message.timestamp)}
            </span>
          </div>
          <div className={styles.messageBubble}>
            <p className={styles.messageText}>{message.message}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <motion.div
        className={styles.typingIndicator}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className={styles.typingDots}>
          <div className={styles.typingDot} />
          <div className={styles.typingDot} />
          <div className={styles.typingDot} />
        </div>
        <span>Someone is typing...</span>
      </motion.div>
    );
  };

  return (
    <div className={styles.chatPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.headerLeft}>
          <h3 className={styles.chatTitle}>Chat</h3>
          {messages.length > 0 && (
            <span className={styles.unreadBadge}>
              {messages.filter(m => !m.isSystem).length}
            </span>
          )}
        </div>
        
        <div className={styles.headerActions}>
          <motion.button
            className={styles.emojiButton}
            onClick={() => {
              // TODO: Implement emoji picker
              console.log('Emoji picker not implemented yet');
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Emoji"
          >
            😊
          </motion.button>
          
          <motion.button
            className={`${styles.actionButton} ${styles.closeButton}`}
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Close chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </motion.button>
        </div>
      </div>

      <div className={styles.messagesContainer}>
        <div className={styles.messageList}>
          <AnimatePresence>
            {messages.map(renderMessage)}
          </AnimatePresence>
          {renderTypingIndicator()}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            className={styles.chatInput}
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            style={{ resize: 'none' }}
          />
          
          <motion.button
            className={styles.sendButton}
            onClick={onSendMessage}
            disabled={!newMessage.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9"></polygon>
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  );
};