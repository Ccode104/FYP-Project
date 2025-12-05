import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getProctoringDashboard, getQuizAnalytics, getStudentProctoringHistory, getResumeRequests, respondToResumeRequest } from '../controllers/proctoringAnalyticsController.js';

const router = express.Router();

/**
 * @swagger
 * /api/proctoring-analytics/dashboard:
 *   get:
 *     summary: Get proctoring analytics dashboard for teacher
 *     tags: [Proctoring Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Proctoring dashboard data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires teacher role
 */
router.get('/dashboard', requireAuth, requireRole('faculty','ta','admin'), getProctoringDashboard);

/**
 * @swagger
 * /api/proctoring-analytics/quiz/{quizId}:
 *   get:
 *     summary: Get detailed analytics for a specific quiz
 *     tags: [Proctoring Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Quiz analytics data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires teacher role or quiz access
 */
router.get('/quiz/:quizId', requireAuth, requireRole('faculty','ta','admin'), getQuizAnalytics);

/**
 * @swagger
 * /api/proctoring-analytics/student/{studentId}:
 *   get:
 *     summary: Get proctoring history for a specific student
 *     tags: [Proctoring Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Student proctoring history
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires teacher role or student access
 */
router.get('/student/:studentId', requireAuth, requireRole('faculty','ta','admin'), getStudentProctoringHistory);

/**
 * @swagger
 * /api/proctoring-analytics/resume-requests:
 *   get:
 *     summary: Get resume requests for teacher's courses
 *     tags: [Proctoring Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of resume requests
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires teacher role
 */
router.get('/resume-requests', requireAuth, requireRole('faculty','admin'), getResumeRequests);

/**
 * @swagger
 * /api/proctoring-analytics/resume-requests/{requestId}/respond:
 *   post:
 *     summary: Approve or reject a resume request
 *     tags: [Proctoring Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               responseMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resume request processed successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - No access to this request
 */
router.post('/resume-requests/:requestId/respond', requireAuth, requireRole('faculty','admin'), respondToResumeRequest);

export default router;