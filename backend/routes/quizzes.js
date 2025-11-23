import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createQuiz, getQuiz, getQuizForGrading, submitQuizAttempt, listQuizAttempts, gradeQuizAttempt, gradeQuizAttemptOverall, deleteQuizAttempt, suspendQuizAttempt, resumeQuizAttempt, getSuspendedAttempts } from '../controllers/quizzesController.js';

const router = express.Router();

/**
 * @swagger
 * /api/quizzes:
 *   post:
 *     summary: Create a new quiz
 *     tags: [Quizzes]
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
 *               - offeringId
 *               - questions
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               offeringId:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               totalPoints:
 *                 type: number
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - question
 *                     - type
 *                     - options
 *                     - correctAnswer
 *                   properties:
 *                     question:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [mcq, text]
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                     correctAnswer:
 *                       type: string
 *                     points:
 *                       type: number
 *     responses:
 *       201:
 *         description: Quiz created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty or admin role
 */
router.post('/', requireAuth, requireRole('faculty','admin'), createQuiz);

// Get suspended attempts for a teacher
router.get('/suspended-attempts', requireAuth, requireRole('faculty','ta','admin'), getSuspendedAttempts);

// Get quiz for students (without correct answers)
router.get('/:quizId', requireAuth, getQuiz);

// Get quiz with correct answers for grading
router.get('/:quizId/grading', requireAuth, requireRole('faculty','ta','admin'), getQuizForGrading);

// Submit quiz attempt
router.post('/attempts', requireAuth, submitQuizAttempt);

// List attempts for a quiz (for grading)
router.get('/:quizId/attempts', requireAuth, requireRole('faculty','ta','admin'), listQuizAttempts);

// Manually grade short answers in an attempt
router.patch('/attempts/:attemptId/grade', requireAuth, requireRole('faculty','ta','admin'), gradeQuizAttempt);

// Grade quiz attempt with overall grade and feedback
router.post('/attempts/:attemptId/grade-overall', requireAuth, requireRole('faculty','admin'), gradeQuizAttemptOverall);

// Suspend a quiz attempt (teacher-controlled)
router.post('/attempts/:attemptId/suspend', requireAuth, requireRole('faculty','ta','admin'), suspendQuizAttempt);

// Resume a suspended quiz attempt (teacher-controlled)
router.post('/attempts/:attemptId/resume', requireAuth, requireRole('faculty','ta','admin'), resumeQuizAttempt);

// Delete a quiz attempt (for resetting violated attempts)
router.delete('/attempts/:attemptId', requireAuth, requireRole('faculty','ta','admin'), deleteQuizAttempt);

export default router;
