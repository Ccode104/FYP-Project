import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { submitFileAssignment, submitCodeAssignment, gradeSubmission, submitLinkAssignment } from '../controllers/submissionsController.js';

const router = express.Router();

/**
 * @swagger
 * /api/submissions/submit/files:
 *   post:
 *     summary: Submit a file-based assignment
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *               - assignmentId
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               assignmentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Files submitted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires student, ta, or faculty role
 *       404:
 *         description: Assignment not found
 */
router.post('/submit/files', requireAuth, requireRole('student','ta','faculty'), upload.array('files', 5), submitFileAssignment);

/**
 * @swagger
 * /api/submissions/submit/code:
 *   post:
 *     summary: Submit a code assignment
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - language
 *               - assignmentId
 *             properties:
 *               code:
 *                 type: string
 *               language:
 *                 type: string
 *                 enum: [python, java, cpp, javascript]
 *               assignmentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Code submitted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires student role
 *       404:
 *         description: Assignment not found
 */
router.post('/submit/code', requireAuth, requireRole('student'), submitCodeAssignment);

/**
 * @swagger
 * /api/submissions/grade:
 *   post:
 *     summary: Grade a submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - submissionId
 *               - grade
 *             properties:
 *               submissionId:
 *                 type: string
 *               grade:
 *                 type: number
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Submission graded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires ta, faculty, or admin role
 *       404:
 *         description: Submission not found
 */
router.post('/grade', requireAuth, requireRole('ta','faculty','admin'), gradeSubmission);

/**
 * @swagger
 * /api/submissions/submit/link:
 *   post:
 *     summary: Submit a link-based assignment
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - link
 *               - assignmentId
 *             properties:
 *               link:
 *                 type: string
 *                 format: uri
 *               assignmentId:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Link submitted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires student role
 *       404:
 *         description: Assignment not found
 */
router.post('/submit/link', requireAuth, requireRole('student'), submitLinkAssignment);

export default router;
