import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { pool } from '../db/index.js';
import { createQuiz, getQuiz, getQuizForGrading, submitQuizAttempt, listQuizAttempts, gradeQuizAttempt, gradeQuizAttemptOverall, deleteQuizAttempt, suspendQuizAttempt, resumeQuizAttempt, getSuspendedAttempts, getQuizResults, getStudentQuizAttempts, markAttemptAsViolated } from '../controllers/quizzesController.js';

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
router.post('/attempts/:attemptId/resume', requireAuth, requireRole('faculty','admin'), resumeQuizAttempt);

// Mark a suspended quiz attempt as violated (teacher-controlled)
router.post('/attempts/:attemptId/mark-violated', requireAuth, requireRole('faculty','ta','admin'), markAttemptAsViolated);

// Delete a quiz attempt (for resetting violated attempts)
router.delete('/attempts/:attemptId', requireAuth, requireRole('faculty','ta','admin'), deleteQuizAttempt);

// Get quiz results for a student (their attempts for a specific quiz)
router.get('/:quizId/results', requireAuth, getQuizResults);

// Get all quiz attempts for the current student
router.get('/student/attempts', requireAuth, getStudentQuizAttempts);

// Check if student has suspended attempts or sessions for a quiz
router.get('/:quizId/attempts/suspended/:studentId', requireAuth, async (req, res) => {
  try {
    const { quizId, studentId } = req.params;

    console.log('DEBUG: Checking suspended attempts/sessions for quiz', quizId, 'student', studentId, 'user', req.user.id, 'role', req.user.role);

    // Validate studentId is a valid number
    const studentIdNum = parseInt(studentId);
    if (isNaN(studentIdNum)) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    // Only allow students to check their own attempts, faculty/ta/admin can check any
    if (req.user.role === 'student' && String(req.user.id) !== studentId) {
      return res.status(403).json({ error: 'You can only check your own suspended attempts' });
    }

    // Check for suspended attempts
    const attemptQuery = `
      SELECT COUNT(*) as suspended_count
      FROM quiz_attempts qa
      WHERE qa.quiz_id = $1
      AND qa.student_id = $2
      AND qa.suspended_at IS NOT NULL
    `;

    const attemptResult = await pool.query(attemptQuery, [quizId, studentIdNum]);
    const suspendedAttemptCount = parseInt(attemptResult.rows[0].suspended_count);

    console.log('DEBUG: Suspended attempts count:', suspendedAttemptCount);

    // Check for suspended proctoring sessions
    const sessionQuery = `
      SELECT COUNT(*) as suspended_session_count
      FROM proctoring_sessions ps
      WHERE ps.quiz_id = $1
      AND ps.student_id = $2
      AND ps.status = 'suspended'
    `;

    const sessionResult = await pool.query(sessionQuery, [quizId, studentIdNum]);
    const suspendedSessionCount = parseInt(sessionResult.rows[0].suspended_session_count);

    console.log('DEBUG: Suspended sessions count:', suspendedSessionCount);

    const totalSuspended = suspendedAttemptCount + suspendedSessionCount;

    console.log('DEBUG: Total suspended:', totalSuspended);

    res.json({
      hasSuspendedAttempt: totalSuspended > 0,
      suspendedCount: totalSuspended,
      suspendedAttempts: suspendedAttemptCount,
      suspendedSessions: suspendedSessionCount
    });
  } catch (error) {
    console.error('Error checking suspended attempts/sessions:', error);
    res.status(500).json({ error: error.message || 'Failed to check suspended attempts/sessions' });
  }
});

export default router;
