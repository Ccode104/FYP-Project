import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createCodeQuestion,
  getCodeQuestions,
  getCodeQuestionById,
  updateCodeQuestion,
  deleteCodeQuestion
} from '../controllers/codeQuestionsController.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /api/code-questions:
 *   post:
 *     summary: Create a new code question
 *     tags: [Code Questions]
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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               constraints:
 *                 type: string
 *               test_cases:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     is_sample:
 *                       type: boolean
 *                     input_text:
 *                       type: string
 *                     expected_text:
 *                       type: string
 *                     input_file:
 *                       type: object
 *                     expected_file:
 *                       type: object
 *     responses:
 *       201:
 *         description: Code question created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty, ta, or admin role
 */
router.post('/', requireRole('faculty', 'ta', 'admin'), createCodeQuestion);

/**
 * @swagger
 * /api/code-questions:
 *   get:
 *     summary: Get all code questions
 *     tags: [Code Questions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of code questions
 *       401:
 *         description: Unauthorized
 */
router.get('/', getCodeQuestions);

/**
 * @swagger
 * /api/code-questions/{id}:
 *   get:
 *     summary: Get a code question by ID
 *     tags: [Code Questions]
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
 *         description: Code question details
 *       404:
 *         description: Code question not found
 */
router.get('/:id', getCodeQuestionById);

/**
 * @swagger
 * /api/code-questions/{id}:
 *   put:
 *     summary: Update a code question
 *     tags: [Code Questions]
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
 *         description: Code question updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Code question not found
 */
router.put('/:id', requireRole('faculty', 'ta', 'admin'), updateCodeQuestion);

/**
 * @swagger
 * /api/code-questions/{id}:
 *   delete:
 *     summary: Delete a code question
 *     tags: [Code Questions]
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
 *         description: Code question deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Code question not found
 */
router.delete('/:id', requireRole('faculty', 'ta', 'admin'), deleteCodeQuestion);

export default router;

