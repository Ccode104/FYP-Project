import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getEnrolledCourses,
  getCourseDetails,
  getCourseAssignments,
  getCourseStats,
  submitAssignment,
  getCourseSubmissions,
  getAssignmentSubmissions,
  getCourseGrades,
  getCourseQuizzes,
  enrollInCourse,
  getStudentQuizAttempts,
  getGradedAssignment,
  submitRegradeRequest,
  submitResumeRequest,
  getStudentResumeRequests,
  getUpcomingEvents,
  getAssignmentDetails,
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
 * /api/student/courses/{offeringId}/stats:
 *   get:
 *     summary: Get stats for a specific course offering
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
 *         description: Course stats (pending, completed, avgGrade)
 *       401:
 *         description: Unauthorized
 */
router.get('/courses/:offeringId/stats', getCourseStats);

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
router.get('/assignments/:assignmentId/submissions', getAssignmentSubmissions);

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

// List the current student's quiz attempts (optionally filtered by quizId via query param)
router.get('/:studentId/quiz-attempts', getStudentQuizAttempts);

/**
 * @swagger
 * /api/student/enroll:
 *   post:
 *     summary: Enroll the logged-in student in a course offering
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - offeringId
 *             properties:
 *               offeringId:
 *                 type: integer
 *                 description: The ID of the course offering to enroll in
 *     responses:
 *       201:
 *         description: Enrolled successfully
 *       400:
 *         description: Missing or invalid offeringId
 *       409:
 *         description: Already enrolled in this course offering
 *       500:
 *         description: Internal server error
 */
router.post('/enroll', enrollInCourse);

/**
 * @swagger
 * /api/student/graded/{assignmentId}:
 *   get:
 *     summary: Get graded assignment details for student
 *     tags: [Student]
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
 *         description: Graded assignment details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Assignment not found
 */
router.get('/graded/:assignmentId', getGradedAssignment);
router.get('/assignments/:assignmentId/details', getAssignmentDetails);

/**
 * @swagger
 * /api/student/grade-query:
 *   post:
 *     summary: Submit a regrade request for an assignment
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - submissionId
 *               - reason
 *             properties:
 *               submissionId:
 *                 type: integer
 *               criterionId:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Regrade request submitted
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/grade-query', submitRegradeRequest);

/**
 * @swagger
 * /api/student/resume-request:
 *   post:
 *     summary: Submit a resume request for a suspended quiz attempt
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quizAttemptId
 *               - reason
 *             properties:
 *               quizAttemptId:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Resume request submitted
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Request already exists
 */
router.post('/resume-request', submitResumeRequest);

/**
 * @swagger
 * /api/student/resume-requests:
 *   get:
 *     summary: Get all resume requests for the current student
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of resume requests
 *       401:
 *         description: Unauthorized
 */
router.get('/resume-requests', getStudentResumeRequests);

/**
 * @swagger
 * /api/student/upcoming-events:
 *   get:
 *     summary: Get upcoming events (assignments, quizzes, lectures) for student dashboard
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of upcoming events sorted by date
 *       401:
 *         description: Unauthorized
 */
router.get('/upcoming-events', getUpcomingEvents);

export default router;
