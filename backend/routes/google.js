import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  initiateGoogleOAuth,
  handleGoogleOAuthCallback,
  checkGoogleConnection,
  getOrCreateGradingSheet,
  disconnectGoogle,
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

export default router;
