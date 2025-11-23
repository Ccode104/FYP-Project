import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getProctoringDashboard, getQuizAnalytics, getStudentProctoringHistory } from '../controllers/proctoringAnalyticsController.js';

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

export default router;