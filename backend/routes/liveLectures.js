import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createLiveLecture,
  getLiveLecturesByCourse,
  getLiveLectureById,
  startLiveLecture,
  endLiveLecture,
  joinLiveLecture,
  leaveLiveLecture,
  getLiveLectureParticipants,
  cleanupLiveLectureParticipants,
} from '../controllers/liveLecturesController.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /api/live-lectures:
 *   post:
 *     summary: Create a new live lecture (Faculty only)
 *     tags: [Live Lectures]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - course_offering_id
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               course_offering_id:
 *                 type: integer
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Live lecture created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty role
 */
router.post('/', requireRole('faculty', 'admin'), createLiveLecture);

/**
 * @swagger
 * /api/live-lectures/course/{courseOfferingId}:
 *   get:
 *     summary: Get all live lectures for a course offering
 *     tags: [Live Lectures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseOfferingId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of live lectures
 *       403:
 *         description: Forbidden - No access to course
 */
router.get('/course/:courseOfferingId', getLiveLecturesByCourse);

/**
 * @swagger
 * /api/live-lectures/{id}:
 *   get:
 *     summary: Get a live lecture by ID
 *     tags: [Live Lectures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Live lecture details
 *       404:
 *         description: Live lecture not found
 */
router.get('/:id', getLiveLectureById);

/**
 * @swagger
 * /api/live-lectures/{id}/start:
 *   post:
 *     summary: Start a live lecture (Creator only)
 *     tags: [Live Lectures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Live lecture started successfully
 *       403:
 *         description: Forbidden - Not the creator
 *       404:
 *         description: Live lecture not found
 */
router.post('/:id/start', startLiveLecture);

/**
 * @swagger
 * /api/live-lectures/{id}/end:
 *   post:
 *     summary: End a live lecture (Creator only)
 *     tags: [Live Lectures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Live lecture ended successfully
 *       403:
 *         description: Forbidden - Not the creator
 *       404:
 *         description: Live lecture not found
 */
router.post('/:id/end', endLiveLecture);

/**
 * @swagger
 * /api/live-lectures/{id}/join:
 *   post:
 *     summary: Join a live lecture
 *     tags: [Live Lectures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Joined live lecture successfully
 *       403:
 *         description: Forbidden - No access to lecture
 *       404:
 *         description: Live lecture not found
 */
router.post('/:id/join', joinLiveLecture);

/**
 * @swagger
 * /api/live-lectures/{id}/leave:
 *   post:
 *     summary: Leave a live lecture
 *     tags: [Live Lectures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Left live lecture successfully
 *       404:
 *         description: Participant record not found
 */
router.post('/:id/leave', leaveLiveLecture);

/**
 * @swagger
 * /api/live-lectures/{id}/participants/cleanup:
 *   post:
 *     summary: Clean up orphaned participants for a live lecture (Instructor only)
 *     tags: [Live Lectures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 *       403:
 *         description: Forbidden - Not an instructor
 */
router.post('/:id/participants/cleanup', requireRole('faculty', 'admin', 'ta'), cleanupLiveLectureParticipants);

/**
 * @swagger
 * /api/live-lectures/{id}/participants:
 *   get:
 *     summary: Get participants for a live lecture
 *     tags: [Live Lectures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of participants
 *       403:
 *         description: Forbidden - Not enrolled in the course
 */
router.get('/:id/participants', getLiveLectureParticipants);

export default router;