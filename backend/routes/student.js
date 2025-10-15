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

// Get all enrolled courses
router.get('/courses', getEnrolledCourses);

// Get details of a specific course offering
router.get('/courses/:offeringId', getCourseDetails);

// Get all assignments for a course offering
router.get('/courses/:offeringId/assignments', getCourseAssignments);

// Submit an assignment
router.post('/assignments/:assignmentId/submit', submitAssignment);

// Get all submissions for a course offering
router.get('/courses/:offeringId/submissions', getCourseSubmissions);

// Get grades for a course offering
router.get('/courses/:offeringId/grades', getCourseGrades);

// Get all quizzes for a course offering
router.get('/courses/:offeringId/quizzes', getCourseQuizzes);

// Attempt a quiz
router.post('/quizzes/:quizId/attempt', attemptQuiz);

export default router;
