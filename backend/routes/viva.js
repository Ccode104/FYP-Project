import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createVivaSession, getVivaSessions, getVivaSessionDetails, gradeVivaParticipant, updateVivaParticipantStatus, generateVivaQuestions } from '../controllers/vivaController.js';

const router = express.Router();

/**
 * @swagger
 * /api/viva/sessions:
 *   post:
 *     summary: Create a new viva session
 *     tags: [Viva]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseOfferingId
 *               - title
 *               - scheduledAt
 *             properties:
 *               courseOfferingId:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               durationMinutes:
 *                 type: integer
 *               maxStudents:
 *                 type: integer
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     studentId:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Viva session created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/sessions', requireAuth, requireRole('faculty','ta','admin'), createVivaSession);

/**
 * @swagger
 * /api/viva/sessions:
 *   get:
 *     summary: Get viva sessions
 *     tags: [Viva]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseOfferingId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of viva sessions
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions', requireAuth, getVivaSessions);

/**
 * @swagger
 * /api/viva/sessions/{id}:
 *   get:
 *     summary: Get viva session details
 *     tags: [Viva]
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
 *         description: Viva session details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Viva session not found
 */
router.get('/sessions/:id', requireAuth, getVivaSessionDetails);

/**
 * @swagger
 * /api/viva/grade:
 *   post:
 *     summary: Grade a viva participant
 *     tags: [Viva]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantId
 *               - score
 *             properties:
 *               participantId:
 *                 type: integer
 *               score:
 *                 type: number
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Viva graded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/grade', requireAuth, requireRole('faculty','ta','admin'), gradeVivaParticipant);

/**
 * @swagger
 * /api/viva/participant/status:
 *   post:
 *     summary: Update viva participant status
 *     tags: [Viva]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantId
 *               - status
 *             properties:
 *               participantId:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [scheduled, in_progress, completed, absent, cancelled]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Participant status updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/participant/status', requireAuth, requireRole('faculty','ta','admin'), updateVivaParticipantStatus);

/**
 * @swagger
 * /api/viva/generate-questions:
 *   post:
 *     summary: Generate viva questions using AI for a specific student
 *     tags: [Viva]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vivaSessionId
 *               - studentId
 *             properties:
 *               vivaSessionId:
 *                 type: integer
 *               studentId:
 *                 type: integer
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 default: medium
 *               count:
 *                 type: integer
 *                 default: 3
 *     responses:
 *       200:
 *         description: Questions generated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Viva session not found
 */
router.post('/generate-questions', requireAuth, requireRole('faculty','ta','admin'), generateVivaQuestions);

export default router;