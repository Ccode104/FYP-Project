import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createQuiz,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  listQuizzes,
  generateAIQuestions,
  exportToGoogleForm,
} from '../controllers/quizBuilderController.js';

const router = express.Router();

/**
 * @swagger
 * /api/quiz-builder/quizzes:
 *   post:
 *     summary: Create a new quiz with the quiz builder
 *     tags: [Quiz Builder]
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
 *               - title
 *               - questions
 *             properties:
 *               course_offering_id:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [mcq, checkbox, short, paragraph]
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                     correct_answers:
 *                       type: array
 *                       items:
 *                         type: string
 *               start_at:
 *                 type: string
 *                 format: date-time
 *               end_at:
 *                 type: string
 *                 format: date-time
 *               max_score:
 *                 type: number
 *               time_limit:
 *                 type: number
 *               is_proctored:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Quiz created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/quizzes', requireAuth, requireRole('faculty', 'ta', 'admin'), createQuiz);

/**
 * @swagger
 * /api/quiz-builder/quizzes:
 *   get:
 *     summary: List quizzes for a course offering
 *     tags: [Quiz Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: course_offering_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of quizzes
 *       401:
 *         description: Unauthorized
 */
router.get('/quizzes/:course_offering_id', requireAuth, listQuizzes);

/**
 * @swagger
 * /api/quiz-builder/quizzes/:quizId:
 *   get:
 *     summary: Get a quiz by ID
 *     tags: [Quiz Builder]
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
 *         description: Quiz details
 *       404:
 *         description: Quiz not found
 */
router.get('/quizzes/:quizId', requireAuth, getQuiz);

/**
 * @swagger
 * /api/quiz-builder/quizzes/:quizId:
 *   put:
 *     summary: Update a quiz
 *     tags: [Quiz Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               questions:
 *                 type: array
 *               start_at:
 *                 type: string
 *               end_at:
 *                 type: string
 *               max_score:
 *                 type: number
 *               time_limit:
 *                 type: number
 *               is_proctored:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Quiz updated successfully
 *       403:
 *         description: Not authorized
 */
router.put('/quizzes/:quizId', requireAuth, requireRole('faculty', 'ta', 'admin'), updateQuiz);

/**
 * @swagger
 * /api/quiz-builder/quizzes/:quizId:
 *   delete:
 *     summary: Delete a quiz
 *     tags: [Quiz Builder]
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
 *         description: Quiz deleted successfully
 *       403:
 *         description: Not authorized
 */
router.delete('/quizzes/:quizId', requireAuth, requireRole('faculty', 'ta', 'admin'), deleteQuiz);

/**
 * @swagger
 * /api/quiz-builder/generate-ai:
 *   post:
 *     summary: Generate quiz questions using AI
 *     tags: [Quiz Builder]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *               - difficulty
 *               - num_questions
 *               - question_types
 *             properties:
 *               topic:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               num_questions:
 *                 type: integer
 *               question_types:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [mcq, checkbox, short, paragraph]
 *     responses:
 *       200:
 *         description: Generated questions
 *       400:
 *         description: Invalid request
 *       503:
 *         description: AI service not configured
 */
router.post(
  '/generate-ai',
  requireAuth,
  requireRole('faculty', 'ta', 'admin'),
  generateAIQuestions
);

/**
 * @swagger
 * /api/quiz-builder/export-google-form:
 *   post:
 *     summary: Export quiz to Google Form
 *     tags: [Quiz Builder]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quiz
 *             properties:
 *               quiz:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   questions:
 *                     type: array
 *     responses:
 *       200:
 *         description: Google Form created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Google not connected
 */
router.post(
  '/export-google-form',
  requireAuth,
  requireRole('faculty', 'ta', 'admin'),
  exportToGoogleForm
);

export default router;
