import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { pool } from '../db/index.js';
import {
  createAssignment,
  getAssignment,
  publishAssignment,
  listAssignmentSubmissions,
  deleteAssignment,
  getAssignmentQuestions,
  gradeSubmission,
  submitComponentAssignment,
  gradeComponentSubmission,
  getComponentSubmissions,
} from '../controllers/assignmentsController.js';
import {
  runPlagiarismCheck,
  getPlagiarismChecks,
  getPlagiarismMatches,
} from '../utils/plagiarism.js';

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

/**
 * @swagger
 * /api/assignments/{id}:
 *   put:
 *     summary: Update an assignment
 *     tags: [Assignments]
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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               due_at:
 *                 type: string
 *                 format: date-time
 *               max_score:
 *                 type: number
 *     responses:
 *       200:
 *         description: Assignment updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty, ta, or admin role
 */
router.put('/:id', requireAuth, requireRole('faculty', 'ta', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { title, description, due_at, max_score } = req.body;

  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (due_at !== undefined) {
      updates.push(`due_at = $${paramIndex++}`);
      values.push(due_at === '' ? null : due_at);
    }
    if (max_score !== undefined) {
      updates.push(`max_score = $${paramIndex++}`);
      values.push(max_score);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const assignmentId = parseInt(id);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }

    values.push(assignmentId);
    const q = `UPDATE assignments SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
    
    console.log('[DEBUG] Updating assignment:', { q, values });
    
    const result = await pool.query(q, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating assignment:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

router.post('/', requireAuth, requireRole('faculty', 'ta', 'admin'), createAssignment);

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
router.post('/:id/publish', requireAuth, requireRole('faculty', 'admin'), publishAssignment);

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
router.get(
  '/:id/submissions',
  requireAuth,
  requireRole('faculty', 'ta', 'admin'),
  listAssignmentSubmissions
);

router.post(
  '/submissions/:id/grade',
  requireAuth,
  requireRole('faculty', 'ta', 'admin'),
  gradeSubmission
);

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
router.get(
  '/:id/plagiarism-checks',
  requireAuth,
  requireRole('faculty', 'admin'),
  async (req, res) => {
    try {
      const assignmentId = Number(req.params.id);
      const checks = await getPlagiarismChecks(assignmentId);
      res.json({ checks });
    } catch (err) {
      console.error('Error getting plagiarism checks:', err);
      res.status(500).json({ error: 'Failed to get plagiarism checks' });
    }
  }
);

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
router.post(
  '/:id/run-plagiarism-check',
  requireAuth,
  requireRole('faculty', 'admin'),
  async (req, res) => {
    try {
      const assignmentId = Number(req.params.id);
      const result = await runPlagiarismCheck(assignmentId);
      res.json(result);
    } catch (err) {
      console.error('Error running plagiarism check:', err);
      res.status(500).json({ error: 'Failed to run plagiarism check' });
    }
  }
);

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
router.get(
  '/:id/plagiarism-matches/:checkId',
  requireAuth,
  requireRole('faculty', 'admin'),
  async (req, res) => {
    try {
      const checkId = Number(req.params.checkId);
      const matches = await getPlagiarismMatches(checkId);
      res.json({ matches });
    } catch (err) {
      console.error('Error getting plagiarism matches:', err);
      res.status(500).json({ error: 'Failed to get plagiarism matches' });
    }
  }
);

router.get('/:id/questions', requireAuth, getAssignmentQuestions);

// Component-based assignment routes
router.post('/:id/submit-components', requireAuth, submitComponentAssignment);
router.post(
  '/submissions/:id/grade-components',
  requireAuth,
  requireRole('faculty', 'ta', 'admin'),
  gradeComponentSubmission
);
router.get('/submissions/:id/components', requireAuth, getComponentSubmissions);

router.delete('/:id', requireAuth, requireRole('faculty', 'admin'), deleteAssignment);

/**
 * @swagger
 * /api/assignments/{id}/comments:
 *   get:
 *     summary: Get all comments for an assignment
 *     tags: [Assignment Comments]
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
 *         description: List of assignment comments
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Assignment not found
 */
router.get('/:id/comments', requireAuth, async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    const userId = req.user.id;

    // Check if user has access to this assignment
    const assignmentCheck = await pool.query(
      `
      SELECT a.id FROM assignments a
      JOIN course_offerings co ON a.course_offering_id = co.id
      JOIN enrollments e ON co.id = e.course_offering_id
      WHERE a.id = $1 AND (e.student_id = $2 OR co.faculty_id = $2 OR EXISTS(
        SELECT 1 FROM ta_assignments ta WHERE ta.course_offering_id = co.id AND ta.ta_id = $2
      ))
    `,
      [assignmentId, userId]
    );

    if (assignmentCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const comments = await pool.query(
      `
      SELECT ac.*, u.name as author_name, u.role as author_role
      FROM assignment_comments ac
      JOIN users u ON ac.user_id = u.id
      WHERE ac.assignment_id = $1
      ORDER BY ac.created_at ASC
    `,
      [assignmentId]
    );

    res.json(comments.rows);
  } catch (err) {
    console.error('Error getting assignment comments:', err);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

/**
 * @swagger
 * /api/assignments/{id}/comments:
 *   post:
 *     summary: Post a new comment on an assignment
 *     tags: [Assignment Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Assignment ID
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
 *               parentId:
 *                 type: integer
 *                 description: ID of parent comment for replies
 *     responses:
 *       201:
 *         description: Comment posted successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    const userId = req.user.id;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if user has access to this assignment
    const assignmentCheck = await pool.query(
      `
      SELECT a.id FROM assignments a
      JOIN course_offerings co ON a.course_offering_id = co.id
      JOIN enrollments e ON co.id = e.course_offering_id
      WHERE a.id = $1 AND (e.student_id = $2 OR co.faculty_id = $2 OR EXISTS(
        SELECT 1 FROM ta_assignments ta WHERE ta.course_offering_id = co.id AND ta.ta_id = $2
      ))
    `,
      [assignmentId, userId]
    );

    if (assignmentCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if parent comment exists and belongs to same assignment
    if (parentId) {
      const parentCheck = await pool.query(
        `
        SELECT id FROM assignment_comments
        WHERE id = $1 AND assignment_id = $2
      `,
        [parentId, assignmentId]
      );

      if (parentCheck.rowCount === 0) {
        return res.status(400).json({ error: 'Invalid parent comment' });
      }
    }

    // Get user role to determine if it's an instructor reply
    const userRole = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    const isInstructorReply = ['faculty', 'ta', 'admin'].includes(userRole.rows[0].role);

    const result = await pool.query(
      `
      INSERT INTO assignment_comments (assignment_id, user_id, parent_id, content, is_instructor_reply)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *, (
        SELECT name FROM users WHERE id = assignment_comments.user_id
      ) as author_name, (
        SELECT role FROM users WHERE id = assignment_comments.user_id
      ) as author_role
    `,
      [assignmentId, userId, parentId || null, content.trim(), isInstructorReply]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error posting assignment comment:', err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

export default router;
