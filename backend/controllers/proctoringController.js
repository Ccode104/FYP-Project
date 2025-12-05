import { pool } from '../db/index.js';
import crypto from 'crypto';

/**
 * Create a new proctoring session
 */
export async function createProctoringSession(req, res) {
  try {
    const { quiz_attempt_id, quiz_id, student_id, device_info, browser_info, webcam_enabled, screen_monitoring_enabled, audio_monitoring_enabled } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: 'student_id is required' });
    }

    // Generate unique session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if session already exists for this attempt
      const existingSession = await client.query(
        'SELECT id FROM proctoring_sessions WHERE quiz_attempt_id = $1',
        [quiz_attempt_id]
      );

      if (existingSession.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Proctoring session already exists for this quiz attempt' });
      }

      // Create proctoring session
      const sessionQuery = `
        INSERT INTO proctoring_sessions
        (quiz_attempt_id, quiz_id, student_id, device_info, browser_info, session_token, webcam_enabled, screen_monitoring_enabled, audio_monitoring_enabled)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const sessionResult = await client.query(sessionQuery, [
        quiz_attempt_id || null,
        quiz_id,
        student_id,
        JSON.stringify(device_info || {}),
        JSON.stringify(browser_info || {}),
        sessionToken,
        webcam_enabled || false,
        screen_monitoring_enabled || false,
        audio_monitoring_enabled || false
      ]);

      // Update quiz attempt with session reference if provided
      if (quiz_attempt_id) {
        await client.query(
          'UPDATE quiz_attempts SET proctoring_session_id = $1 WHERE id = $2',
          [sessionResult.rows[0].id, quiz_attempt_id]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Proctoring session created successfully',
        session: sessionResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating proctoring session:', error);
    res.status(500).json({ error: error.message || 'Failed to create proctoring session' });
  }
}

/**
 * Get proctoring session by token
 */
export async function getProctoringSession(req, res) {
  try {
    const { sessionToken } = req.params;

    const sessionQuery = `
      SELECT ps.*, qa.quiz_id, q.title as quiz_title, q.is_proctored,
             u.name as student_name, u.email as student_email
      FROM proctoring_sessions ps
      JOIN quiz_attempts qa ON ps.quiz_attempt_id = qa.id
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN users u ON ps.student_id = u.id
      WHERE ps.session_token = $1
    `;

    const sessionResult = await pool.query(sessionQuery, [sessionToken]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proctoring session not found' });
    }

    const session = sessionResult.rows[0];

    // Get proctoring configuration
    const configQuery = `
      SELECT pc.* FROM proctoring_configs pc
      JOIN quizzes q ON pc.quiz_id = q.id
      WHERE q.id = $1
    `;

    const configResult = await pool.query(configQuery, [session.quiz_id]);
    const config = configResult.rows[0] || {
      webcam_required: true,
      screen_monitoring: true,
      audio_monitoring: false,
      max_warnings: 3,
      auto_suspend_severity: 3,
      allow_recovery: true,
      suspension_requires_teacher: true
    };

    res.json({
      session: {
        ...session,
        device_info: typeof session.device_info === 'string' ? JSON.parse(session.device_info) : session.device_info,
        browser_info: typeof session.browser_info === 'string' ? JSON.parse(session.browser_info) : session.browser_info
      },
      config
    });
  } catch (error) {
    console.error('Error fetching proctoring session:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch proctoring session' });
  }
}

/**
 * Record a proctoring violation
 */
export async function recordViolation(req, res) {
  try {
    const { session_id, violation_type, severity, evidence_data, description } = req.body;

    if (!session_id || !violation_type || !severity) {
      return res.status(400).json({ error: 'session_id, violation_type, and severity are required' });
    }

    // Validate severity (1-4)
    if (severity < 1 || severity > 4) {
      return res.status(400).json({ error: 'Severity must be between 1 and 4' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert violation
      const violationQuery = `
        INSERT INTO proctoring_violations
        (session_id, violation_type, severity, evidence_data, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const violationResult = await client.query(violationQuery, [
        session_id,
        violation_type,
        severity,
        JSON.stringify(evidence_data || {}),
        description || null
      ]);

      // Update session analytics
      await updateSessionAnalytics(client, session_id);

      // Check if auto-suspension is needed
      // First get the quiz_id from the session
      const quizIdQuery = `
        SELECT qa.quiz_id FROM proctoring_sessions ps
        LEFT JOIN quiz_attempts qa ON ps.quiz_attempt_id = qa.id
        WHERE ps.id = $1
      `;
      const quizIdResult = await client.query(quizIdQuery, [session_id]);
      const quizId = quizIdResult.rows[0]?.quiz_id;

      let config = null;
      if (quizId) {
        const configQuery = 'SELECT * FROM proctoring_configs WHERE quiz_id = $1';
        const configResult = await client.query(configQuery, [quizId]);
        config = configResult.rows[0];
      }

      let shouldSuspend = false;
      if (config && severity >= config.auto_suspend_severity) {
        shouldSuspend = true;
      }

      // If suspension required and not already suspended
      if (shouldSuspend && !config?.suspension_requires_teacher) {
        await client.query(
          'UPDATE proctoring_sessions SET status = $1, ended_at = now() WHERE id = $2',
          ['suspended', session_id]
        );

        // Update quiz attempt
        await client.query(
          'UPDATE quiz_attempts SET suspended_at = now(), suspension_reason = $1 WHERE proctoring_session_id = $2',
          [`Auto-suspended due to ${violation_type} violation`, session_id]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Violation recorded successfully',
        violation: violationResult.rows[0],
        auto_suspended: shouldSuspend && !config?.suspension_requires_teacher
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error recording violation:', error);
    res.status(500).json({ error: error.message || 'Failed to record violation' });
  }
}

/**
 * Suspend a proctoring session (teacher action)
 */
export async function suspendSession(req, res) {
  try {
    const { sessionId } = req.params;
    const { reason, suspended_by } = req.body;

    console.log('DEBUG: Suspending session', sessionId, 'reason:', reason, 'by:', suspended_by);

    if (!reason || !suspended_by) {
      return res.status(400).json({ error: 'reason and suspended_by are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update session status
      const updateResult = await client.query(
        'UPDATE proctoring_sessions SET status = $1, ended_at = now(), updated_at = now() WHERE id = $2 RETURNING *',
        ['suspended', sessionId]
      );

      console.log('DEBUG: Updated session status to suspended:', updateResult.rows[0]);

      // Update quiz attempt
      const attemptResult = await client.query(
        'UPDATE quiz_attempts SET suspended_at = now(), suspension_reason = $1 WHERE proctoring_session_id = $2 RETURNING *',
        [reason, sessionId]
      );

      console.log('DEBUG: Updated quiz attempt:', attemptResult.rows[0]);

      await client.query('COMMIT');

      // Emit WebSocket event (will be handled by the socket handler)
      const io = req.app.get('io');
      if (io) {
        io.to(`proctoring-${sessionId}`).emit('session-suspended', {
          reason,
          suspendedBy: suspended_by,
          timestamp: new Date().toISOString()
        });
      }

      res.json({ message: 'Session suspended successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error suspending session:', error);
    res.status(500).json({ error: error.message || 'Failed to suspend session' });
  }
}

/**
 * Resume a suspended proctoring session (teacher action)
 */
export async function resumeSession(req, res) {
  try {
    const { sessionId } = req.params;
    const { resumed_by } = req.body;

    if (!resumed_by) {
      return res.status(400).json({ error: 'resumed_by is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update session status
      await client.query(
        'UPDATE proctoring_sessions SET status = $1, updated_at = now() WHERE id = $2',
        ['active', sessionId]
      );

      // Update quiz attempt
      await client.query(
        'UPDATE quiz_attempts SET resumed_at = now(), resumed_by = $1 WHERE proctoring_session_id = $2',
        [resumed_by, sessionId]
      );

      await client.query('COMMIT');

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io) {
        io.to(`proctoring-${sessionId}`).emit('session-resumed', {
          resumedBy: resumed_by,
          timestamp: new Date().toISOString()
        });
      }

      res.json({ message: 'Session resumed successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error resuming session:', error);
    res.status(500).json({ error: error.message || 'Failed to resume session' });
  }
}

/**
 * Get proctoring analytics for a session
 */
export async function getSessionAnalytics(req, res) {
  try {
    const { sessionId } = req.params;

    const analyticsQuery = `
      SELECT * FROM proctoring_analytics WHERE session_id = $1
    `;

    const analyticsResult = await pool.query(analyticsQuery, [sessionId]);

    if (analyticsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analytics not found for this session' });
    }

    const analytics = analyticsResult.rows[0];
    res.json({
      analytics: {
        ...analytics,
        violations_by_type: typeof analytics.violations_by_type === 'string' ? JSON.parse(analytics.violations_by_type) : analytics.violations_by_type,
        violations_by_severity: typeof analytics.violations_by_severity === 'string' ? JSON.parse(analytics.violations_by_severity) : analytics.violations_by_severity
      }
    });
  } catch (error) {
    console.error('Error fetching session analytics:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch session analytics' });
  }
}

/**
 * Create or update proctoring configuration for a quiz
 */
export async function createProctoringConfig(req, res) {
  try {
    const {
      quiz_id,
      name,
      webcam_required,
      screen_monitoring,
      audio_monitoring,
      face_detection_required,
      max_warnings,
      auto_suspend_severity,
      allow_recovery,
      recovery_wait_seconds,
      violation_score_penalty,
      suspension_requires_teacher,
      live_monitoring_enabled,
      record_sessions
    } = req.body;

    if (!quiz_id) {
      return res.status(400).json({ error: 'quiz_id is required' });
    }

    // Check if user has permission to configure this quiz (teacher of the course or admin)
    const quizQuery = `
      SELECT q.*, co.teacher_id
      FROM quizzes q
      JOIN course_offerings co ON q.course_offering_id = co.id
      WHERE q.id = $1
    `;
    const quizResult = await pool.query(quizQuery, [quiz_id]);

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult.rows[0];
    const userRole = req.user.role;
    const userId = req.user.id;

    // Allow if admin or teacher of the course
    if (userRole !== 'admin' && quiz.teacher_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to configure proctoring for this quiz' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Upsert configuration
      const configQuery = `
        INSERT INTO proctoring_configs
        (quiz_id, name, webcam_required, screen_monitoring, audio_monitoring, face_detection_required,
         max_warnings, auto_suspend_severity, allow_recovery, recovery_wait_seconds, violation_score_penalty,
         suspension_requires_teacher, live_monitoring_enabled, record_sessions, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (quiz_id) DO UPDATE SET
          name = EXCLUDED.name,
          webcam_required = EXCLUDED.webcam_required,
          screen_monitoring = EXCLUDED.screen_monitoring,
          audio_monitoring = EXCLUDED.audio_monitoring,
          face_detection_required = EXCLUDED.face_detection_required,
          max_warnings = EXCLUDED.max_warnings,
          auto_suspend_severity = EXCLUDED.auto_suspend_severity,
          allow_recovery = EXCLUDED.allow_recovery,
          recovery_wait_seconds = EXCLUDED.recovery_wait_seconds,
          violation_score_penalty = EXCLUDED.violation_score_penalty,
          suspension_requires_teacher = EXCLUDED.suspension_requires_teacher,
          live_monitoring_enabled = EXCLUDED.live_monitoring_enabled,
          record_sessions = EXCLUDED.record_sessions,
          updated_at = now()
        RETURNING *
      `;

      const configResult = await client.query(configQuery, [
        quiz_id,
        name || 'Default Configuration',
        webcam_required !== undefined ? webcam_required : true,
        screen_monitoring !== undefined ? screen_monitoring : true,
        audio_monitoring !== undefined ? audio_monitoring : false,
        face_detection_required !== undefined ? face_detection_required : true,
        max_warnings || 3,
        auto_suspend_severity || 3,
        allow_recovery !== undefined ? allow_recovery : true,
        recovery_wait_seconds || 30,
        violation_score_penalty !== undefined ? violation_score_penalty : 1.0,
        suspension_requires_teacher !== undefined ? suspension_requires_teacher : true,
        live_monitoring_enabled !== undefined ? live_monitoring_enabled : false,
        record_sessions !== undefined ? record_sessions : true,
        userId
      ]);

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Proctoring configuration saved successfully',
        config: configResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating proctoring config:', error);
    res.status(500).json({ error: error.message || 'Failed to create proctoring configuration' });
  }
}

/**
 * Get proctoring configuration for a quiz
 */
export async function getProctoringConfig(req, res) {
  try {
    const { quizId } = req.params;

    const configQuery = 'SELECT * FROM proctoring_configs WHERE quiz_id = $1';
    const configResult = await pool.query(configQuery, [quizId]);

    if (configResult.rows.length === 0) {
      // Return default configuration
      return res.json({
        config: {
          quiz_id: quizId,
          name: 'Default Configuration',
          webcam_required: true,
          screen_monitoring: true,
          audio_monitoring: false,
          face_detection_required: true,
          max_warnings: 3,
          auto_suspend_severity: 3,
          allow_recovery: true,
          recovery_wait_seconds: 30,
          violation_score_penalty: 1.0,
          suspension_requires_teacher: true,
          live_monitoring_enabled: false,
          record_sessions: true
        },
        is_default: true
      });
    }

    res.json({
      config: configResult.rows[0],
      is_default: false
    });
  } catch (error) {
    console.error('Error fetching proctoring config:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch proctoring configuration' });
  }
}

/**
 * List all proctoring configurations for courses the user can access
 */
export async function listProctoringConfigs(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    let params;

    if (userRole === 'admin') {
      // Admins can see all configurations
      query = `
        SELECT pc.*, q.title as quiz_title, c.title as course_title, co.teacher_id
        FROM proctoring_configs pc
        JOIN quizzes q ON pc.quiz_id = q.id
        JOIN course_offerings co ON q.course_offering_id = co.id
        JOIN courses c ON co.course_id = c.id
        ORDER BY pc.updated_at DESC
      `;
      params = [];
    } else {
      // Teachers can only see configurations for their courses
      query = `
        SELECT pc.*, q.title as quiz_title, c.title as course_title, co.teacher_id
        FROM proctoring_configs pc
        JOIN quizzes q ON pc.quiz_id = q.id
        JOIN course_offerings co ON q.course_offering_id = co.id
        JOIN courses c ON co.course_id = c.id
        WHERE co.teacher_id = $1
        ORDER BY pc.updated_at DESC
      `;
      params = [userId];
    }

    const configsResult = await pool.query(query, params);

    res.json({
      configs: configsResult.rows
    });
  } catch (error) {
    console.error('Error listing proctoring configs:', error);
    res.status(500).json({ error: error.message || 'Failed to list proctoring configurations' });
  }
}

/**
 * Update session analytics (internal function)
 */
async function updateSessionAnalytics(client, sessionId) {
  // Get violation counts
  const violationsQuery = `
    SELECT
      COUNT(*) as total_violations,
      COUNT(CASE WHEN severity = 1 THEN 1 END) as severity_1,
      COUNT(CASE WHEN severity = 2 THEN 1 END) as severity_2,
      COUNT(CASE WHEN severity = 3 THEN 1 END) as severity_3,
      COUNT(CASE WHEN severity = 4 THEN 1 END) as severity_4,
      json_object_agg(violation_type, count) as violations_by_type
    FROM (
      SELECT violation_type, severity, COUNT(*) as count
      FROM proctoring_violations
      WHERE session_id = $1
      GROUP BY violation_type, severity
    ) sub
  `;

  const violationsResult = await client.query(violationsQuery, [sessionId]);
  const violationStats = violationsResult.rows[0];

  // Calculate session duration
  const sessionQuery = 'SELECT started_at, ended_at FROM proctoring_sessions WHERE id = $1';
  const sessionResult = await client.query(sessionQuery, [sessionId]);
  const session = sessionResult.rows[0];

  const duration = session.ended_at
    ? Math.floor((new Date(session.ended_at) - new Date(session.started_at)) / 1000)
    : Math.floor((new Date() - new Date(session.started_at)) / 1000);

  // Calculate compliance score (0-100, lower violations = higher score)
  const totalViolations = parseInt(violationStats.total_violations) || 0;
  const complianceScore = Math.max(0, 100 - (totalViolations * 10)); // Deduct 10 points per violation

  // Determine risk level
  let riskLevel = 'low';
  if (totalViolations >= 5) riskLevel = 'high';
  else if (totalViolations >= 2) riskLevel = 'medium';

  // Upsert analytics
  await client.query(`
    INSERT INTO proctoring_analytics
    (session_id, total_violations, violations_by_type, violations_by_severity, session_duration_seconds, compliance_score, risk_level)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (session_id) DO UPDATE SET
      total_violations = EXCLUDED.total_violations,
      violations_by_type = EXCLUDED.violations_by_type,
      violations_by_severity = EXCLUDED.violations_by_severity,
      session_duration_seconds = EXCLUDED.session_duration_seconds,
      compliance_score = EXCLUDED.compliance_score,
      risk_level = EXCLUDED.risk_level,
      updated_at = now()
  `, [
    sessionId,
    totalViolations,
    JSON.stringify(violationStats.violations_by_type || {}),
    JSON.stringify({
      1: violationStats.severity_1 || 0,
      2: violationStats.severity_2 || 0,
      3: violationStats.severity_3 || 0,
      4: violationStats.severity_4 || 0
    }),
    duration,
    complianceScore,
    riskLevel
  ]);
}

// Update session status (active, suspended, etc.)
export async function updateSessionStatus(req, res) {
  try {
    const { sessionId } = req.params;
    const { status, reason } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update session status
      const updateQuery = `
        UPDATE proctoring_sessions
        SET status = $1, updated_at = now()
        WHERE id = $2
        RETURNING *
      `;

      const result = await client.query(updateQuery, [status, sessionId]);
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Session not found' });
      }

      // If suspending, update quiz attempt
      if (status === 'suspended' && result.rows[0].quiz_attempt_id) {
        await client.query(
          'UPDATE quiz_attempts SET suspension_reason = $1, suspended_at = now() WHERE id = $2',
          [reason || 'Auto-suspended due to violation', result.rows[0].quiz_attempt_id]
        );
      }

      await client.query('COMMIT');

      res.json({
        message: 'Session status updated successfully',
        session: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating session status:', error);
    res.status(500).json({ error: error.message || 'Failed to update session status' });
  }
}

// Get active quiz session for student
export async function getActiveSession(req, res) {
  try {
    const { studentId, quizId } = req.params;

    const query = `
      SELECT ps.*, qa.id as quiz_attempt_id, qa.started_at as attempt_started_at
      FROM proctoring_sessions ps
      LEFT JOIN quiz_attempts qa ON ps.quiz_attempt_id = qa.id
      WHERE ps.student_id = $1
      AND (qa.quiz_id = $2 OR ps.quiz_attempt_id IS NULL)
      AND ps.status IN ('active', 'suspended')
      ORDER BY ps.created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [studentId, quizId]);

    if (result.rowCount === 0) {
      return res.json({ session: null });
    }

    res.json({ session: result.rows[0] });
  } catch (error) {
    console.error('Error getting active session:', error);
    res.status(500).json({ error: error.message || 'Failed to get active session' });
  }
}

// Heartbeat to keep session alive
export async function sessionHeartbeat(req, res) {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(
      'UPDATE proctoring_sessions SET updated_at = now() WHERE id = $1 RETURNING *',
      [sessionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Heartbeat received', session: result.rows[0] });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    res.status(500).json({ error: error.message || 'Failed to process heartbeat' });
  }
}