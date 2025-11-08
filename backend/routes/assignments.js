import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createAssignment } from '../controllers/assignmentsController.js';
import { publishAssignment, listAssignmentSubmissions, deleteAssignment } from '../controllers/assignmentsController.js';

const router = express.Router();

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     summary: Create a new assignment
 *     tags: [Assignments]
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
 *               - description
 *               - dueDate
 *               - offeringId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               offeringId:
 *                 type: string
 *               totalPoints:
 *                 type: number
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty, ta, or admin role
 */
router.post('/', requireAuth, requireRole('faculty','ta','admin'), createAssignment);

/**
 * @swagger
 * /api/assignments/{id}/publish:
 *   post:
 *     summary: Publish an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment published successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty or admin role
 *       404:
 *         description: Assignment not found
 */
router.post('/:id/publish', requireAuth, requireRole('faculty','admin'), publishAssignment);

/**
 * @swagger
 * /api/assignments/{id}/submissions:
 *   get:
 *     summary: Get all submissions for an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of assignment submissions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   studentId:
 *                     type: string
 *                   submissionDate:
 *                     type: string
 *                     format: date-time
 *                   status:
 *                     type: string
 *                   grade:
 *                     type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty, ta, or admin role
 *       404:
 *         description: Assignment not found
 */
router.get('/:id/submissions', requireAuth, requireRole('faculty','ta','admin'), listAssignmentSubmissions);

router.delete('/:id', requireAuth, requireRole('faculty','admin'), deleteAssignment);
export default router;
