import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createRubric,
  getRubrics,
  getRubric,
  updateRubric,
  deleteRubric,
  assignRubricToAssignment,
  getAssignmentRubric
} from '../controllers/rubricsController.js';

const router = express.Router();

/**
 * @swagger
 * /api/rubrics:
 *   post:
 *     summary: Create a new rubric
 *     tags: [Rubrics]
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
 *               - course_offering_id
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               course_offering_id:
 *                 type: integer
 *               criteria:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     max_points:
 *                       type: number
 *                     weight:
 *                       type: number
 *     responses:
 *       201:
 *         description: Rubric created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty, ta, or admin role
 */
router.post('/', requireAuth, requireRole('faculty','ta','admin'), createRubric);

/**
 * @swagger
 * /api/rubrics/course/{courseOfferingId}:
 *   get:
 *     summary: Get all rubrics for a course offering
 *     tags: [Rubrics]
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
 *         description: List of rubrics
 *       401:
 *         description: Unauthorized
 */
router.get('/course/:courseOfferingId', requireAuth, getRubrics);

/**
 * @swagger
 * /api/rubrics/{id}:
 *   get:
 *     summary: Get a specific rubric with criteria
 *     tags: [Rubrics]
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
 *         description: Rubric details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Rubric not found
 */
router.get('/:id', requireAuth, getRubric);

/**
 * @swagger
 * /api/rubrics/{id}:
 *   put:
 *     summary: Update a rubric
 *     tags: [Rubrics]
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
 *               criteria:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Rubric updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Rubric not found
 */
router.put('/:id', requireAuth, requireRole('faculty','ta','admin'), updateRubric);

/**
 * @swagger
 * /api/rubrics/{id}:
 *   delete:
 *     summary: Delete a rubric
 *     tags: [Rubrics]
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
 *         description: Rubric deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Rubric not found
 */
router.delete('/:id', requireAuth, requireRole('faculty','ta','admin'), deleteRubric);

/**
 * @swagger
 * /api/rubrics/assign:
 *   post:
 *     summary: Assign a rubric to an assignment
 *     tags: [Rubrics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignmentId
 *               - rubricId
 *             properties:
 *               assignmentId:
 *                 type: integer
 *               rubricId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Rubric assigned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/assign', requireAuth, requireRole('faculty','ta','admin'), assignRubricToAssignment);

/**
 * @swagger
 * /api/rubrics/assignment/{assignmentId}:
 *   get:
 *     summary: Get rubric assigned to an assignment
 *     tags: [Rubrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Assignment rubric details
 *       401:
 *         description: Unauthorized
 */
router.get('/assignment/:assignmentId', requireAuth, getAssignmentRubric);

export default router;