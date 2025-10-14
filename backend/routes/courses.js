import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createCourse, createOffering, enroll } from '../controllers/coursesController.js';
import { offeringOverview } from '../controllers/coursesController.js';

const router = express.Router();

router.post('/', requireAuth, requireRole('faculty','admin'), createCourse);
router.post('/:courseId/offerings', requireAuth, requireRole('faculty','admin'), createOffering);
router.post('/offerings/:offeringId/enroll', requireAuth, requireRole('faculty','ta','admin'), enroll);
router.get('/offerings/:offeringId', requireAuth, requireRole('faculty','ta','admin'), offeringOverview);

export default router;
