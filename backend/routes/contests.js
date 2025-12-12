import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createContest,
  getContest,
  listContests,
  getContestQuestions,
  submitContest,
  getContestSubmissions,
  gradeContestSubmission,
  deleteContest
} from '../controllers/contestsController.js';

const router = express.Router();

/**
 * @swagger
 * /api/contests:
 *   post:
 *     summary: Create a new contest
 *     tags: [Contests]
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
 *               - start_at
 *               - end_at
 *             properties:
 *               course_offering_id:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               start_at:
 *                 type: string
 *                 format: date-time
 *               end_at:
 *                 type: string
 *                 format: date-time
 *               max_score:
 *                 type: number
 *               allow_multiple_submissions:
 *                 type: boolean
 *               question_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Contest created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty, ta, or admin role
 */
router.post('/', requireAuth, requireRole('faculty','ta','admin'), createContest);

/**
 * @swagger
 * /api/contests/{id}:
 *   get:
 *     summary: Get contest details
 *     tags: [Contests]
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
 *         description: Contest details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Contest not found
 */
router.get('/:id', requireAuth, getContest);

/**
 * @swagger
 * /api/contests/{id}/questions:
 *   get:
 *     summary: Get contest questions
 *     tags: [Contests]
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
 *         description: List of contest questions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/:id/questions', requireAuth, getContestQuestions);

/**
 * @swagger
 * /api/contests/{id}/submit:
 *   post:
 *     summary: Submit contest solutions
 *     tags: [Contests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - submissions
 *             properties:
 *               submissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question_id:
 *                       type: integer
 *                     code:
 *                       type: string
 *                     language:
 *                       type: string
 *     responses:
 *       200:
 *         description: Contest submitted successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/submit', requireAuth, submitContest);

/**
 * @swagger
 * /api/contests/{id}/submissions:
 *   get:
 *     summary: Get contest submissions
 *     tags: [Contests]
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
 *         description: List of contest submissions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/:id/submissions', requireAuth, requireRole('faculty','ta','admin'), getContestSubmissions);

/**
 * @swagger
 * /api/contests/submissions/{id}/grade:
 *   post:
 *     summary: Grade contest submission
 *     tags: [Contests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questionGrades:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question_id:
 *                       type: integer
 *                     score:
 *                       type: number
 *                     feedback:
 *                       type: string
 *               overallFeedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Submission graded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/submissions/:id/grade', requireAuth, requireRole('faculty','ta','admin'), gradeContestSubmission);

/**
 * @swagger
 * /api/contests/{id}:
 *   delete:
 *     summary: Delete contest
 *     tags: [Contests]
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
 *         description: Contest deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete('/:id', requireAuth, requireRole('faculty','admin'), deleteContest);

/**
 * @swagger
 * /api/course-offerings/{courseOfferingId}/contests:
 *   get:
 *     summary: List contests for a course offering
 *     tags: [Contests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseOfferingId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of contests
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/course-offerings/:courseOfferingId/contests', requireAuth, listContests);

export default router;