import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  chatWithAI,
  uploadDocument,
  listUserDocuments,
  saveChatSession,
  loadUserChatSessions,
  loadChatSession,
  deleteChatSession
} from '../controllers/chatbotController.js';

const router = express.Router();

router.use(requireAuth);

// Unified AI chat
router.post('/chat', chatWithAI);

// Document upload and management
router.post('/document/upload', upload.single('document'), uploadDocument);
router.get('/documents', listUserDocuments);

// Chat session management
router.post('/chats', saveChatSession);
router.get('/chats', loadUserChatSessions);
router.get('/chats/:sessionId', loadChatSession);
router.delete('/chats/:sessionId', deleteChatSession);

export default router;
