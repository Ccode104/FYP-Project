import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  chatWithAI,
  saveChatSession,
  loadUserChatSessions,
  loadChatSession,
  deleteChatSession,
  classifyNavigationIntent,
} from '../controllers/chatbotController.js';


const router = express.Router();

router.use(requireAuth);

// Unified AI chat
router.post('/chat', chatWithAI);

// Chat session management

router.post('/chats', saveChatSession);
router.get('/chats', loadUserChatSessions);
router.get('/chats/:sessionId', loadChatSession);
router.delete('/sessions/:sessionId', deleteChatSession);
router.post('/navigate', classifyNavigationIntent);

export default router;
