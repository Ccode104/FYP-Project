import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createCourse, createOffering, enroll, listCourses, listMyOfferings, unenroll } from '../controllers/coursesController.js';
import {
  getCourseResources,
  getCoursePYQs,
  getCourseNotes,
  getCourseAssignments
} from '../controllers/resourcesController.js';
import { getCodeQuestions } from '../controllers/codeQuestionsController.js';
import { uploadResource } from '../controllers/resourcesController.js';
import { offeringOverview } from '../controllers/coursesController.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: List all courses
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all courses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   courseCode:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', requireAuth, listCourses);

// Get all resources (PYQs, notes, assignments) for a course offering
/**
 * @swagger
 * /api/courses/{offeringId}/resources:
 *   get:
 *     summary: Get all resources for a course offering
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offeringId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of all course resources
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.get('/:offeringId/resources', getCourseResources);

/**
 * @swagger
 * /api/courses/{offeringId}/pyqs:
 *   get:
 *     summary: Get Previous Year Questions for a course offering
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offeringId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of PYQs
 *       401:
 *         description: Unauthorized
 */
router.get('/:offeringId/pyqs', getCoursePYQs);

/**
 * @swagger
 * /api/courses/{offeringId}/notes:
 *   get:
 *     summary: Get course notes
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offeringId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of course notes
 *       401:
 *         description: Unauthorized
 */
router.get('/:offeringId/notes', getCourseNotes);

/**
 * @swagger
 * /api/courses/{offeringId}/assignments:
 *   get:
 *     summary: Get course assignments
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offeringId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of assignments
 *       401:
 *         description: Unauthorized
 */
router.get('/:offeringId/assignments', getCourseAssignments);

/**
 * @swagger
 * /api/courses/{offeringId}/code-questions:
 *   get:
 *     summary: Get code questions for a course offering
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offeringId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of code questions
 *       401:
 *         description: Unauthorized
 */
router.get('/:offeringId/code-questions', getCodeQuestions);

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseCode
 *               - name
 *               - description
 *             properties:
 *               courseCode:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Course created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty or admin role
 */
router.post('/', requireAuth, requireRole('faculty','admin'), createCourse);

/**
 * @swagger
 * /api/courses/{courseId}/offerings:
 *   post:
 *     summary: Create a new course offering
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *               - semester
 *               - year
 *             properties:
 *               semester:
 *                 type: string
 *               year:
 *                 type: number
 *     responses:
 *       201:
 *         description: Course offering created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty or admin role
 */
router.post('/:courseId/offerings', requireAuth, requireRole('faculty','admin'), createOffering);

/**
 * @swagger
 * /api/courses/offerings/{offeringId}/enroll:
 *   post:
 *     summary: Enroll users in a course offering
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
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
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Users enrolled successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty, ta, or admin role
 */
router.post('/offerings/:offeringId/enroll', requireAuth, requireRole('faculty','ta','admin'), enroll);
/**
 * @swagger
 * /api/courses/offerings/{offeringId}/enroll:
 *   delete:
 *     summary: Unenroll from a course offering
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offeringId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully unenrolled from the course
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires student, faculty, ta, or admin role
 *       404:
 *         description: Course offering not found
 */
router.delete('/offerings/:offeringId/enroll', requireAuth, requireRole('student','faculty','ta','admin'), unenroll);
/**
 * @swagger
 * /api/courses/{offeringId}/resources:
 *   post:
 *     summary: Upload a new resource
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offeringId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               type:
 *                 type: string
 *                 enum: [pyq, note, assignment]
 *     responses:
 *       201:
 *         description: Resource uploaded successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/:offeringId/resources', uploadResource);

/**
 * @swagger
 * /api/courses/mine/offerings:
 *   get:
 *     summary: List all course offerings for current faculty
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of course offerings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   courseId:
 *                     type: string
 *                   semester:
 *                     type: string
 *                   year:
 *                     type: number
 *                   course:
 *                     type: object
 *                     properties:
 *                       courseCode:
 *                         type: string
 *                       name:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty or admin role
 */
router.get('/mine/offerings', requireAuth, requireRole('faculty','admin'), listMyOfferings);

/**
 * @swagger
 * /api/courses/offerings/{offeringId}:
 *   get:
 *     summary: Get course offering overview
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offeringId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course offering details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty, ta, or admin role
 */
router.get('/offerings/:offeringId', requireAuth, requireRole('faculty','ta','admin'), offeringOverview);

export default router;
