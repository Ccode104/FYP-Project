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
import { requireAuth, requireRole } from '../middleware/auth.js';
import { pool } from '../db/index.js';

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
router.post('/sessions/:sessionId/resume', requireRole('faculty','admin'), resumeSession);

// Get session analytics
router.get('/sessions/:sessionId/analytics', getSessionAnalytics);

// Update session status
router.put('/sessions/:sessionId/status', updateSessionStatus);

// Get active session for student/quiz
router.get('/sessions/active/:studentId/:quizId', getActiveSession);

// Session heartbeat
router.post('/sessions/:sessionId/heartbeat', sessionHeartbeat);

// Get suspended quiz IDs for a student
router.get('/sessions/suspended/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Validate studentId is a valid number
    const studentIdNum = parseInt(studentId);
    if (isNaN(studentIdNum)) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    // Only allow students to check their own suspended sessions, faculty/ta/admin can check any
    if (req.user.role === 'student' && String(req.user.id) !== studentId) {
      return res.status(403).json({ error: 'You can only check your own suspended sessions' });
    }

    const query = `
      SELECT DISTINCT qa.quiz_id
      FROM proctoring_sessions ps
      JOIN quiz_attempts qa ON ps.quiz_attempt_id = qa.id
      WHERE ps.student_id = $1
      AND ps.status = 'suspended'
    `;

    const result = await pool.query(query, [studentIdNum]);
    const suspendedQuizIds = result.rows.map(row => row.quiz_id);

    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Error getting suspended sessions:', error);
    res.status(500).json({ error: error.message || 'Failed to get suspended sessions' });
  }
});

// Get active quiz IDs for a student
router.get('/sessions/active/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Validate studentId is a valid number
    const studentIdNum = parseInt(studentId);
    if (isNaN(studentIdNum)) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    // Only allow students to check their own active sessions, faculty/ta/admin can check any
    if (req.user.role === 'student' && String(req.user.id) !== studentId) {
      return res.status(403).json({ error: 'You can only check your own active sessions' });
    }

    const query = `
      SELECT DISTINCT qa.quiz_id
      FROM proctoring_sessions ps
      JOIN quiz_attempts qa ON ps.quiz_attempt_id = qa.id
      WHERE ps.student_id = $1
      AND ps.status = 'active'
    `;

    const result = await pool.query(query, [studentIdNum]);
    const activeQuizIds = result.rows.map(row => row.quiz_id);

    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({ error: error.message || 'Failed to get active sessions' });
  }
});

// Proctoring configuration routes
router.post('/configs', createProctoringConfig);
router.get('/configs/quiz/:quizId', getProctoringConfig);
router.get('/configs', listProctoringConfigs);

export default router;