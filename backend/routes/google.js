import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  initiateGoogleOAuth,
  handleGoogleOAuthCallback,
  checkGoogleConnection,
  getOrCreateGradingSheet,
  getOrCreateQuizResultsSheet,
  getOrCreateLiveLectureAttendanceSheet,
  disconnectGoogle,
  updateGradingSheetRow,
  deleteGradingSheet,
  evaluateQuizResults,
  deleteQuizAttemptByTeacher,
  markQuizAttemptViolatedByTeacher,
} from '../controllers/googleController.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth flow
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Google auth URL
 *       500:
 *         description: Google OAuth not configured
 */
router.get('/google', requireAuth, initiateGoogleOAuth);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to frontend
 */
router.get('/google/callback', handleGoogleOAuthCallback);

/**
 * @swagger
 * /api/auth/google/status:
 *   get:
 *     summary: Check Google connection status
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection status
 */
router.get('/google/status', requireAuth, checkGoogleConnection);

/**
 * @swagger
 * /api/auth/google/disconnect:
 *   post:
 *     summary: Disconnect Google account
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disconnected successfully
 */
router.post('/google/disconnect', requireAuth, disconnectGoogle);

/**
 * @swagger
 * /api/sheets/assignments/{assignmentId}:
 *   get:
 *     summary: Get or create grading sheet for an assignment
 *     tags: [Sheets]
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
 *         description: Spreadsheet info
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Google not connected
 */
router.get(
  '/assignments/:assignmentId',
  requireAuth,
  requireRole('faculty', 'ta', 'admin'),
  getOrCreateGradingSheet
);

router.get(
  '/quizzes/:quizId',
  requireAuth,
  requireRole('faculty', 'ta', 'admin'),
  getOrCreateQuizResultsSheet
);

router.get(
  '/live-lecture-attendance/:courseOfferingId',
  requireAuth,
  requireRole('faculty', 'ta', 'admin'),
  getOrCreateLiveLectureAttendanceSheet
);

router.post(
  '/assignments/:assignmentId/update-row',
  requireAuth,
  requireRole('faculty', 'ta', 'admin'),
  updateGradingSheetRow
);

router.delete(
  '/assignments/:assignmentId',
  requireAuth,
  requireRole('faculty', 'ta', 'admin'),
  deleteGradingSheet
);

router.post(
  '/quizzes/:quizId/evaluate',
  requireAuth,
  requireRole('faculty', 'ta', 'admin'),
  evaluateQuizResults
);

router.delete(
  '/quizzes/attempts/:attemptId',
  requireAuth,
  requireRole('faculty', 'ta', 'admin'),
  deleteQuizAttemptByTeacher
);

router.post(
  '/quizzes/attempts/:attemptId/violate',
  requireAuth,
  requireRole('faculty', 'ta', 'admin'),
  markQuizAttemptViolatedByTeacher
);

export default router;
