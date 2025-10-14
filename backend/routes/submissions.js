import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { submitFileAssignment, submitCodeAssignment, gradeSubmission } from '../controllers/submissionsController.js';

const router = express.Router();

router.post('/submit/files', requireAuth, requireRole('student','ta','faculty'), upload.array('files', 5), submitFileAssignment);
router.post('/submit/code', requireAuth, requireRole('student'), submitCodeAssignment);
router.post('/grade', requireAuth, requireRole('ta','faculty','admin'), gradeSubmission);

export default router;
