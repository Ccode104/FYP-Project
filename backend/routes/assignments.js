import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createAssignment } from '../controllers/assignmentsController.js';
import { publishAssignment, listAssignmentSubmissions, deleteAssignment } from '../controllers/assignmentsController.js';

const router = express.Router();
router.post('/', requireAuth, requireRole('faculty','ta','admin'), createAssignment);
router.post('/:id/publish', requireAuth, requireRole('faculty','admin'), publishAssignment);
router.get('/:id/submissions', requireAuth, requireRole('faculty','ta','admin'), listAssignmentSubmissions);
router.delete('/:id', requireAuth, requireRole('faculty','admin'), deleteAssignment);
export default router;
