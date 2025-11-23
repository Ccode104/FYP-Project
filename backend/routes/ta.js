import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { assignTA, removeTA, getTADashboardData } from '../controllers/taController.js';
import { chatWithTAAgent, getTAAgentSuggestions, generateVivaQuestions, generateDebugQuestions } from '../controllers/taAgentController.js';

const router = express.Router();

/**
 * @swagger
 * /api/ta/dashboard:
 *   get:
 *     summary: Get TA dashboard data
 *     tags: [TA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: TA dashboard data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires TA role
 */
router.get('/dashboard', requireAuth, requireRole('ta'), getTADashboardData);

/**
 * @swagger
 * /api/ta/assign:
 *   post:
 *     summary: Assign a TA to a course offering
 *     tags: [TA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - course_offering_id
 *               - ta_id
 *             properties:
 *               course_offering_id:
 *                 type: integer
 *               ta_id:
 *                 type: integer
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: TA assigned successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/assign', requireAuth, requireRole('faculty','admin'), assignTA);

/**
 * @swagger
 * /api/ta/remove/{id}:
 *   delete:
 *     summary: Remove a TA assignment
 *     tags: [TA]
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
 *         description: TA removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete('/remove/:id', requireAuth, requireRole('faculty','admin'), removeTA);

/**
 * @swagger
 * /api/ta/agent/chat:
 *   post:
 *     summary: Chat with TA evaluation agent
 *     tags: [TA Agent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               context:
 *                 type: object
 *                 properties:
 *                   submissionId:
 *                     type: integer
 *                   assignmentId:
 *                     type: integer
 *                   courseId:
 *                     type: integer
 *                   action:
 *                     type: string
 *     responses:
 *       200:
 *         description: TA agent response
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires TA role
 */
router.post('/agent/chat', requireAuth, requireRole('ta'), chatWithTAAgent);

/**
 * @swagger
 * /api/ta/agent/suggestions/{submissionId}:
 *   get:
 *     summary: Get TA agent suggestions for a submission
 *     tags: [TA Agent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [comprehensive, grading, viva, debug, quality]
 *     responses:
 *       200:
 *         description: TA agent suggestions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires TA role
 */
router.get('/agent/suggestions/:submissionId', requireAuth, requireRole('ta'), getTAAgentSuggestions);

/**
 * @swagger
 * /api/ta/agent/viva-questions:
 *   post:
 *     summary: Generate viva questions for an assignment
 *     tags: [TA Agent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignmentId
 *             properties:
 *               assignmentId:
 *                 type: integer
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Generated viva questions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires TA role
 */
router.post('/agent/viva-questions', requireAuth, requireRole('ta'), generateVivaQuestions);

/**
 * @swagger
 * /api/ta/agent/debug-questions:
 *   post:
 *     summary: Generate debugging questions for a submission
 *     tags: [TA Agent]
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
 *             properties:
 *               submissionId:
 *                 type: integer
 *               questionType:
 *                 type: string
 *                 enum: [bug_identification, fix_explanation, optimization, improvement]
 *     responses:
 *       200:
 *         description: Generated debugging questions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires TA role
 */
router.post('/agent/debug-questions', requireAuth, requireRole('ta'), generateDebugQuestions);

export default router;