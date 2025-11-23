import React, { useState, useEffect } from 'react';
import type { Message } from '../services/messages';
import { getMessages, getSentMessages, sendMessage, markMessageAsRead, deleteMessage, getUnreadCount, getUsersForMessaging } from '../services/messages';
import { useToast } from './ToastProvider';
import Modal from './Modal';
import './Messaging.css';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function Messaging() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const { push } = useToast();

  // Compose form state
  const [composeForm, setComposeForm] = useState({
    receiverId: '',
    subject: '',
    content: ''
  });

  useEffect(() => {
    loadMessages();
    loadUnreadCount();
    if (activeTab === 'compose') {
      loadUsers();
    }
  }, [activeTab]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = activeTab === 'inbox'
        ? await getMessages()
        : await getSentMessages();
      setMessages(response.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      push({ kind: 'error', message: 'Failed to load messages' });
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await getUnreadCount();
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const usersList = await getUsersForMessaging();
      setUsers(usersList);
    } catch (error) {
      console.error('Failed to load users:', error);
      push({ kind: 'error', message: 'Failed to load users' });
    }
  };

  const handleSendMessage = async () => {
    if (!composeForm.receiverId || !composeForm.content) {
      push({ kind: 'error', message: 'Please fill in all required fields' });
      return;
    }

    try {
      await sendMessage(
        parseInt(composeForm.receiverId),
        composeForm.subject,
        composeForm.content
      );
      push({ kind: 'success', message: 'Message sent successfully' });
      setComposeForm({ receiverId: '', subject: '', content: '' });
      setShowCompose(false);
      if (activeTab === 'sent') {
        loadMessages();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      push({ kind: 'error', message: 'Failed to send message' });
    }
  };

  const handleMarkAsRead = async (message: Message) => {
    if (message.is_read) return;

    try {
      await markMessageAsRead(message.id);
      setMessages(prev => prev.map(m =>
        m.id === message.id ? { ...m, is_read: true } : m
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      push({ kind: 'success', message: 'Message deleted' });
    } catch (error) {
      console.error('Failed to delete message:', error);
      push({ kind: 'error', message: 'Failed to delete message' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="messaging-container">
      <div className="messaging-header">
        <h3 className="h4">Messages</h3>
        <button
          className="btn btn-primary"
          onClick={() => setShowCompose(true)}
        >
          Compose
        </button>
      </div>

      <div className="messaging-tabs">
        <button
          className={`tab ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          Inbox {unreadCount > 0 && `(${unreadCount})`}
        </button>
        <button
          className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Sent
        </button>
      </div>

      <div className="messaging-content">
        {loading ? (
          <div className="loading">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <p>No messages found.</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-item ${!message.is_read ? 'unread' : ''}`}
                onClick={() => {
                  setSelectedMessage(message);
                  handleMarkAsRead(message);
                }}
              >
                <div className="message-header">
                  <div className="message-sender">
                    {activeTab === 'inbox' ? message.sender_name || message.sender_email : message.receiver_name || message.receiver_email}
                  </div>
                  <div className="message-date">
                    {formatDate(message.sent_at)}
                  </div>
                </div>
                <div className="message-subject">
                  {message.subject || '(No subject)'}
                </div>
                <div className="message-preview">
                  {message.content.substring(0, 100)}...
                </div>
                <div className="message-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMessage(message.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <Modal
          open={!!selectedMessage}
          onClose={() => setSelectedMessage(null)}
          title={selectedMessage.subject || '(No subject)'}
        >
          <div className="message-detail">
            <div className="message-meta">
              <div><strong>From:</strong> {selectedMessage.sender_name || selectedMessage.sender_email}</div>
              <div><strong>To:</strong> {selectedMessage.receiver_name || selectedMessage.receiver_email}</div>
              <div><strong>Date:</strong> {formatDate(selectedMessage.sent_at)}</div>
            </div>
            <div className="message-content">
              {selectedMessage.content}
            </div>
          </div>
        </Modal>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <Modal
          open={showCompose}
          onClose={() => setShowCompose(false)}
          title="Compose Message"
          actions={
            <>
              <button className="btn" onClick={() => setShowCompose(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSendMessage}>Send</button>
            </>
          }
        >
          <div className="form">
            <label className="field">
              <span className="label">To</span>
              <select
                className="input"
                value={composeForm.receiverId}
                onChange={(e) => setComposeForm(prev => ({ ...prev, receiverId: e.target.value }))}
              >
                <option value="">Select recipient</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email} ({user.role})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Subject</span>
              <input
                className="input"
                type="text"
                value={composeForm.subject}
                onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Message subject"
              />
            </label>
            <label className="field">
              <span className="label">Message</span>
              <textarea
                className="input"
                value={composeForm.content}
                onChange={(e) => setComposeForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Type your message here..."
                rows={6}
              />
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}