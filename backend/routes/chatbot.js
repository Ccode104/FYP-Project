import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  chatWithAI,
  saveChatSession,
  loadUserChatSessions,
  loadChatSession,
  deleteChatSession
} from '../controllers/chatbotController.js';


const router = express.Router();

router.use(requireAuth);

// Unified AI chat
router.post('/chat', chatWithAI);

// Chat session management

router.post('/chats', saveChatSession);
router.get('/chats', loadUserChatSessions);
router.get('/chats/:sessionId', loadChatSession);
router.delete('/chats/:sessionId', deleteChatSession);

export default router;
