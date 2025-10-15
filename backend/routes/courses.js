import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createCourse, createOffering, enroll, listCourses, listMyOfferings, unenroll } from '../controllers/coursesController.js';
import {
  getCourseResources,
  getCoursePYQs,
  getCourseNotes,
  getCourseAssignments
} from '../controllers/resourcesController.js';
import { uploadResource } from '../controllers/resourcesController.js';
import { offeringOverview } from '../controllers/coursesController.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// List all courses
router.get('/', requireAuth, listCourses);

// Get all resources (PYQs, notes, assignments) for a course offering
router.get('/:offeringId/resources', getCourseResources);

// Get only PYQs for a course offering
router.get('/:offeringId/pyqs', getCoursePYQs);

// Get only notes for a course offering
router.get('/:offeringId/notes', getCourseNotes);

// Get only assignments for a course offering
router.get('/:offeringId/assignments', getCourseAssignments);

// Create a course
router.post('/', requireAuth, requireRole('faculty','admin'), createCourse);
// Create an offering
router.post('/:courseId/offerings', requireAuth, requireRole('faculty','admin'), createOffering);
// Enroll in an offering (students can self-enroll; faculty/ta/admin can enroll anyone)
router.post('/offerings/:offeringId/enroll', requireAuth, requireRole('student','faculty','ta','admin'), enroll);
router.delete('/offerings/:offeringId/enroll', requireAuth, requireRole('student','faculty','ta','admin'), unenroll);

// Upload a new resource (faculty/ta)
router.post('/:offeringId/resources', uploadResource);
// List offerings for current faculty
router.get('/mine/offerings', requireAuth, requireRole('faculty','admin'), listMyOfferings);

router.get('/offerings/:offeringId', requireAuth, requireRole('faculty','ta','admin'), offeringOverview);

export default router;
