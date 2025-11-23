import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createAssignment, getAssignment } from '../controllers/assignmentsController.js';
import { publishAssignment, listAssignmentSubmissions, deleteAssignment, getAssignmentQuestions, gradeSubmission } from '../controllers/assignmentsController.js';
import { runPlagiarismCheck, getPlagiarismChecks, getPlagiarismMatches } from '../utils/plagiarism.js';

const router = express.Router();

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     summary: Create a new assignment
 *     tags: [Assignments]
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
 *               - dueDate
 *               - offeringId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               offeringId:
 *                 type: string
 *               totalPoints:
 *                 type: number
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty, ta, or admin role
 */
router.get('/:id', requireAuth, getAssignment);

router.post('/', requireAuth, requireRole('faculty','ta','admin'), createAssignment);

/**
 * @swagger
 * /api/assignments/{id}/publish:
 *   post:
 *     summary: Publish an assignment
 *     tags: [Assignments]
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
 *         description: Assignment published successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty or admin role
 *       404:
 *         description: Assignment not found
 */
router.post('/:id/publish', requireAuth, requireRole('faculty','admin'), publishAssignment);

/**
 * @swagger
 * /api/assignments/{id}/submissions:
 *   get:
 *     summary: Get all submissions for an assignment
 *     tags: [Assignments]
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
 *         description: List of assignment submissions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   studentId:
 *                     type: string
 *                   submissionDate:
 *                     type: string
 *                     format: date-time
 *                   status:
 *                     type: string
 *                   grade:
 *                     type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty, ta, or admin role
 *       404:
 *         description: Assignment not found
 */
router.get('/:id/submissions', requireAuth, requireRole('faculty','ta','admin'), listAssignmentSubmissions);

router.post('/submissions/:id/grade', requireAuth, requireRole('faculty','ta','admin'), gradeSubmission);

/**
 * @swagger
 * /api/assignments/{id}/plagiarism-checks:
 *   get:
 *     summary: Get plagiarism check history for an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: List of plagiarism checks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       assignment_id:
 *                         type: integer
 *                       checked_at:
 *                         type: string
 *                         format: date-time
 *                       report_url:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [pending, completed, failed]
 *                       match_count:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty or admin role
 *       500:
 *         description: Internal server error
 */
router.get('/:id/plagiarism-checks', requireAuth, requireRole('faculty','admin'), async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    const checks = await getPlagiarismChecks(assignmentId);
    res.json({ checks });
  } catch (err) {
    console.error('Error getting plagiarism checks:', err);
    res.status(500).json({ error: 'Failed to get plagiarism checks' });
  }
});

/**
 * @swagger
 * /api/assignments/{id}/run-plagiarism-check:
 *   post:
 *     summary: Run plagiarism check for an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: Plagiarism check initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [completed, insufficient_submissions, unsupported, failed]
 *                 checkId:
 *                   type: integer
 *                 reportUrl:
 *                   type: string
 *                 submissionsChecked:
 *                   type: integer
 *                 matchesFound:
 *                   type: integer
 *                 error:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty or admin role
 *       500:
 *         description: Internal server error
 */
router.post('/:id/run-plagiarism-check', requireAuth, requireRole('faculty','admin'), async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    const result = await runPlagiarismCheck(assignmentId);
    res.json(result);
  } catch (err) {
    console.error('Error running plagiarism check:', err);
    res.status(500).json({ error: 'Failed to run plagiarism check' });
  }
});

/**
 * @swagger
 * /api/assignments/{id}/plagiarism-matches/{checkId}:
 *   get:
 *     summary: Get detailed plagiarism matches for a specific check
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Assignment ID
 *       - in: path
 *         name: checkId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Plagiarism check ID
 *     responses:
 *       200:
 *         description: List of plagiarism matches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 matches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       check_id:
 *                         type: integer
 *                       submission1_id:
 *                         type: integer
 *                       submission2_id:
 *                         type: integer
 *                       similarity_percentage:
 *                         type: number
 *                         format: float
 *                       match_details:
 *                         type: object
 *                       student1_name:
 *                         type: string
 *                       student2_name:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty or admin role
 *       500:
 *         description: Internal server error
 */
router.get('/:id/plagiarism-matches/:checkId', requireAuth, requireRole('faculty','admin'), async (req, res) => {
  try {
    const checkId = Number(req.params.checkId);
    const matches = await getPlagiarismMatches(checkId);
    res.json({ matches });
  } catch (err) {
    console.error('Error getting plagiarism matches:', err);
    res.status(500).json({ error: 'Failed to get plagiarism matches' });
  }
});

router.get('/:id/questions', requireAuth, getAssignmentQuestions);

router.delete('/:id', requireAuth, requireRole('faculty','admin'), deleteAssignment);
export default router;
