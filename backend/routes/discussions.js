import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listMessages, postMessage } from '../controllers/discussionsController.js';

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

export default router;
