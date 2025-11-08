import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getMyProgress, getByCourseOffering, getByStudent } from '../controllers/progressController.js';

const router = express.Router();

// Student - get own progress
router.get('/me', requireAuth, getMyProgress);

// Faculty/TA/Admin - get all students progress for a course offering
router.get('/course/:offeringId', requireAuth, requireRole('faculty','ta','admin'), getByCourseOffering);

// Faculty/TA/Admin - get specific student (optional course filter)
router.get('/student/:studentId', requireAuth, requireRole('faculty','ta','admin'), getByStudent);

export default router;
