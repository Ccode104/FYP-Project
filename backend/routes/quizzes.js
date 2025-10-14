import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createQuiz } from '../controllers/quizzesController.js';

const router = express.Router();
router.post('/', requireAuth, requireRole('faculty','admin'), createQuiz);
export default router;
