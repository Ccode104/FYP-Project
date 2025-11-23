import express from 'express';
const router = express.Router();
import { requireAuth } from '../middleware/auth.js';
import {
  sendMessage,
  getMessages,
  getSentMessages,
  markAsRead,
  deleteMessage,
  getUnreadCount
} from '../controllers/messagesController.js';

// Send a message
router.post('/', requireAuth, sendMessage);

// Get inbox messages
router.get('/', requireAuth, getMessages);

// Get sent messages
router.get('/sent', requireAuth, getSentMessages);

// Mark message as read
router.patch('/:id/read', requireAuth, markAsRead);

// Delete message
router.delete('/:id', requireAuth, deleteMessage);

// Get unread count
router.get('/unread/count', requireAuth, getUnreadCount);

export default router;