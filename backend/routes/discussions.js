import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listMessages, postMessage, getAiAssist } from '../controllers/discussionsController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Discussions
 *     description: Course offering discussion forum
 */

// All routes require auth
router.use(requireAuth);

/**
 * @swagger
 * /api/discussions/{offeringId}/messages:
 *   get:
 *     summary: List discussion messages for an offering
 *     tags: [Discussions]
 *     parameters:
 *       - in: path
 *         name: offeringId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: after
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Messages
 */
router.get('/:offeringId/messages', listMessages);

/**
 * @swagger
 * /api/discussions/{offeringId}/messages:
 *   post:
 *     summary: Post a new message (teacher/TA can start threads, students reply)
 *     tags: [Discussions]
 *     parameters:
 *       - in: path
 *         name: offeringId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/:offeringId/messages', postMessage);

/**
 * @swagger
 * /api/discussions/{offeringId}/messages/{messageId}/ai-assist:
 *   post:
 *     summary: Generate an AI response based on the discussion thread context
 *     tags: [Discussions]
 *     parameters:
 *       - in: path
 *         name: offeringId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_query:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI Response Object
 */
router.post('/:offeringId/messages/:messageId/ai-assist', getAiAssist);

export default router;
