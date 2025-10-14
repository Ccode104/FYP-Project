import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createAssignment } from '../controllers/assignmentsController.js';

const router = express.Router();
router.post('/', requireAuth, requireRole('faculty','ta','admin'), createAssignment);
export default router;
