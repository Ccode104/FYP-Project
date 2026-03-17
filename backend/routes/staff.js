import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getReviewQueue } from '../controllers/staffController.js';

const router = express.Router();

// Aggregated "what needs attention" view for staff.
router.get('/review-queue', requireAuth, requireRole('faculty', 'teacher', 'ta', 'admin'), getReviewQueue);

export default router;

