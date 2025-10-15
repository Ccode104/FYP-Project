import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getEnrolledCourses,
  getCourseDetails,
  getCourseAssignments,
  submitAssignment,
  getCourseSubmissions,
  getCourseGrades,
  getCourseQuizzes,
  attemptQuiz
} from '../controllers/studentController.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /api/student/courses:
 *   get:
 *     summary: Get all enrolled courses for current student
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of enrolled courses
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
 *                   semester:
 *                     type: string
 *                   year:
 *                     type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/courses', getEnrolledCourses);

/**
 * @swagger
 * /api/student/courses/{offeringId}:
 *   get:
 *     summary: Get details of a specific course offering
 *     tags: [Student]
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
 *         description: Course offering details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.get('/courses/:offeringId', getCourseDetails);

/**
 * @swagger
 * /api/student/courses/{offeringId}/assignments:
 *   get:
 *     summary: Get all assignments for a course offering
 *     tags: [Student]
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
router.get('/courses/:offeringId/assignments', getCourseAssignments);

/**
 * @swagger
 * /api/student/assignments/{assignmentId}/submit:
 *   post:
 *     summary: Submit an assignment
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
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
 *     responses:
 *       201:
 *         description: Assignment submitted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Assignment not found
 */
router.post('/assignments/:assignmentId/submit', submitAssignment);

/**
 * @swagger
 * /api/student/courses/{offeringId}/submissions:
 *   get:
 *     summary: Get all submissions for a course offering
 *     tags: [Student]
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
 *         description: List of submissions
 *       401:
 *         description: Unauthorized
 */
router.get('/courses/:offeringId/submissions', getCourseSubmissions);

/**
 * @swagger
 * /api/student/courses/{offeringId}/grades:
 *   get:
 *     summary: Get grades for a course offering
 *     tags: [Student]
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
 *         description: Course grades
 *       401:
 *         description: Unauthorized
 */
router.get('/courses/:offeringId/grades', getCourseGrades);

/**
 * @swagger
 * /api/student/courses/{offeringId}/quizzes:
 *   get:
 *     summary: Get all quizzes for a course offering
 *     tags: [Student]
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
 *         description: List of quizzes
 *       401:
 *         description: Unauthorized
 */
router.get('/courses/:offeringId/quizzes', getCourseQuizzes);

/**
 * @swagger
 * /api/student/quizzes/{quizId}/attempt:
 *   post:
 *     summary: Submit a quiz attempt
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
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
 *               - answers
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - questionId
 *                     - answer
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     answer:
 *                       type: string
 *     responses:
 *       201:
 *         description: Quiz submitted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quiz not found
 */
router.post('/quizzes/:quizId/attempt', attemptQuiz);

export default router;
