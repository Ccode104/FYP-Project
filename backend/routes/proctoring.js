import express from 'express';
import {
  createProctoringSession,
  getProctoringSession,
  recordViolation,
  suspendSession,
  resumeSession,
  getSessionAnalytics,
  createProctoringConfig,
  getProctoringConfig,
  listProctoringConfigs,
  updateSessionStatus,
  getActiveSession,
  sessionHeartbeat
} from '../controllers/proctoringController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All proctoring routes require authentication
router.use(requireAuth);

// Create a new proctoring session
router.post('/sessions', createProctoringSession);

// Get proctoring session by token
router.get('/sessions/:sessionToken', getProctoringSession);

// Record a violation
router.post('/violations', recordViolation);

// Suspend a session (teacher/admin only)
router.post('/sessions/:sessionId/suspend', suspendSession);

// Resume a suspended session (teacher/admin only)
router.post('/sessions/:sessionId/resume', resumeSession);

// Get session analytics
router.get('/sessions/:sessionId/analytics', getSessionAnalytics);

// Update session status
router.put('/sessions/:sessionId/status', updateSessionStatus);

// Get active session for student/quiz
router.get('/sessions/active/:studentId/:quizId', getActiveSession);

// Session heartbeat
router.post('/sessions/:sessionId/heartbeat', sessionHeartbeat);

// Proctoring configuration routes
router.post('/configs', createProctoringConfig);
router.get('/configs/quiz/:quizId', getProctoringConfig);
router.get('/configs', listProctoringConfigs);

export default router;