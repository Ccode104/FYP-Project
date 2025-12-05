import { pool } from '../db/index.js';

/**
 * Get proctoring analytics dashboard data
 */
export async function getProctoringDashboard(req, res) {
  try {
    const teacherId = req.user?.id;
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get courses taught by this teacher
    const coursesQuery = `
      SELECT DISTINCT co.id as course_offering_id, co.term, c.code, c.title
      FROM course_offerings co
      JOIN faculty_course_offerings fco ON co.id = fco.course_offering_id
      JOIN courses c ON co.course_id = c.id
      WHERE fco.faculty_id = $1
    `;
    const coursesResult = await pool.query(coursesQuery, [teacherId]);

    if (coursesResult.rows.length === 0) {
      return res.json({
        summary: {
          total_sessions: 0,
          active_sessions: 0,
          suspended_sessions: 0,
          total_violations: 0,
          compliance_rate: 100
        },
        courses: [],
        recent_violations: [],
        risk_distribution: { low: 0, medium: 0, high: 0, critical: 0 }
      });
    }

    const courseOfferingIds = coursesResult.rows.map(row => row.course_offering_id);

    // Get overall summary statistics
    const summaryQuery = `
      SELECT
        COUNT(DISTINCT ps.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN ps.status = 'active' THEN ps.id END) as active_sessions,
        COUNT(DISTINCT CASE WHEN ps.status = 'suspended' THEN ps.id END) as suspended_sessions,
        COALESCE(SUM(pa.total_violations), 0) as total_violations,
        ROUND(
          AVG(
            CASE
              WHEN pa.compliance_score IS NOT NULL THEN pa.compliance_score
              ELSE 100
            END
          ), 1
        ) as avg_compliance_rate
      FROM proctoring_sessions ps
      LEFT JOIN proctoring_analytics pa ON ps.id = pa.session_id
      WHERE ps.student_id IN (
        SELECT DISTINCT qa.student_id
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE q.course_offering_id = ANY($1)
      )
    `;
    const summaryResult = await pool.query(summaryQuery, [courseOfferingIds]);
    const summary = summaryResult.rows[0];

    // Get course-specific analytics
    const coursesAnalytics = [];
    for (const course of coursesResult.rows) {
      const courseQuery = `
        SELECT
          COUNT(DISTINCT ps.id) as sessions,
          COUNT(DISTINCT CASE WHEN ps.status = 'active' THEN ps.id END) as active_sessions,
          COUNT(DISTINCT CASE WHEN ps.status = 'suspended' THEN ps.id END) as suspended_sessions,
          COALESCE(SUM(pa.total_violations), 0) as violations,
          ROUND(AVG(CASE WHEN pa.compliance_score IS NOT NULL THEN pa.compliance_score ELSE 100 END), 1) as compliance_rate
        FROM proctoring_sessions ps
        LEFT JOIN proctoring_analytics pa ON ps.id = pa.session_id
        WHERE ps.student_id IN (
          SELECT DISTINCT qa.student_id
          FROM quiz_attempts qa
          JOIN quizzes q ON qa.quiz_id = q.id
          WHERE q.course_offering_id = $1
        )
      `;
      const courseResult = await pool.query(courseQuery, [course.course_offering_id]);
      coursesAnalytics.push({
        ...course,
        ...courseResult.rows[0]
      });
    }

    // Get recent violations (last 24 hours)
    const recentViolationsQuery = `
      SELECT
        pv.violation_type,
        pv.severity,
        pv.description,
        pv.timestamp,
        u.name as student_name,
        q.title as quiz_title,
        c.code as course_code
      FROM proctoring_violations pv
      JOIN proctoring_sessions ps ON pv.session_id = ps.id
      JOIN users u ON ps.student_id = u.id
      LEFT JOIN quiz_attempts qa ON ps.quiz_attempt_id = qa.id
      LEFT JOIN quizzes q ON qa.quiz_id = q.id
      LEFT JOIN course_offerings co ON q.course_offering_id = co.id
      LEFT JOIN courses c ON co.course_id = c.id
      WHERE co.id = ANY($1)
        AND pv.timestamp >= NOW() - INTERVAL '24 hours'
      ORDER BY pv.timestamp DESC
      LIMIT 20
    `;
    const recentViolationsResult = await pool.query(recentViolationsQuery, [courseOfferingIds]);

    // Get risk distribution
    const riskQuery = `
      SELECT
        COUNT(CASE WHEN pa.risk_level = 'low' THEN 1 END) as low,
        COUNT(CASE WHEN pa.risk_level = 'medium' THEN 1 END) as medium,
        COUNT(CASE WHEN pa.risk_level = 'high' THEN 1 END) as high,
        COUNT(CASE WHEN pa.risk_level = 'critical' THEN 1 END) as critical
      FROM proctoring_analytics pa
      JOIN proctoring_sessions ps ON pa.session_id = ps.id
      WHERE ps.student_id IN (
        SELECT DISTINCT qa.student_id
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE q.course_offering_id = ANY($1)
      )
    `;
    const riskResult = await pool.query(riskQuery, [courseOfferingIds]);

    res.json({
      summary: {
        total_sessions: parseInt(summary.total_sessions) || 0,
        active_sessions: parseInt(summary.active_sessions) || 0,
        suspended_sessions: parseInt(summary.suspended_sessions) || 0,
        total_violations: parseInt(summary.total_violations) || 0,
        compliance_rate: parseFloat(summary.avg_compliance_rate) || 100
      },
      courses: coursesAnalytics,
      recent_violations: recentViolationsResult.rows,
      risk_distribution: riskResult.rows[0] || { low: 0, medium: 0, high: 0, critical: 0 }
    });
  } catch (error) {
    console.error('Error fetching proctoring dashboard:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch proctoring analytics' });
  }
}

/**
 * Get detailed analytics for a specific quiz
 */
export async function getQuizAnalytics(req, res) {
  try {
    const { quizId } = req.params;
    const teacherId = req.user?.id;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify teacher has access to this quiz
    const accessQuery = `
      SELECT 1 FROM quizzes q
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN faculty_course_offerings fco ON co.id = fco.course_offering_id
      WHERE q.id = $1 AND fco.faculty_id = $2
    `;
    const accessResult = await pool.query(accessQuery, [quizId, teacherId]);

    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get quiz attempt statistics
    const attemptsQuery = `
      SELECT
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN violated = true THEN 1 END) as violated_attempts,
        COUNT(CASE WHEN violated = false THEN 1 END) as clean_attempts,
        ROUND(AVG(CASE WHEN violated = false THEN score END), 1) as avg_clean_score,
        ROUND(AVG(CASE WHEN violated = true THEN score END), 1) as avg_violated_score,
        COUNT(DISTINCT student_id) as unique_students
      FROM quiz_attempts
      WHERE quiz_id = $1
    `;
    const attemptsResult = await pool.query(attemptsQuery, [quizId]);
    const attemptsStats = attemptsResult.rows[0];

    // Get violation breakdown
    const violationsQuery = `
      SELECT
        pv.violation_type,
        COUNT(*) as count,
        AVG(pv.severity) as avg_severity
      FROM proctoring_violations pv
      JOIN proctoring_sessions ps ON pv.session_id = ps.id
      JOIN quiz_attempts qa ON ps.quiz_attempt_id = qa.id
      WHERE qa.quiz_id = $1
      GROUP BY pv.violation_type
      ORDER BY count DESC
    `;
    const violationsResult = await pool.query(violationsQuery, [quizId]);

    // Get session analytics
    const sessionsQuery = `
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN pa.risk_level = 'low' THEN 1 END) as low_risk,
        COUNT(CASE WHEN pa.risk_level = 'medium' THEN 1 END) as medium_risk,
        COUNT(CASE WHEN pa.risk_level = 'high' THEN 1 END) as high_risk,
        COUNT(CASE WHEN pa.risk_level = 'critical' THEN 1 END) as critical_risk,
        ROUND(AVG(pa.compliance_score), 1) as avg_compliance
      FROM proctoring_sessions ps
      LEFT JOIN proctoring_analytics pa ON ps.id = pa.session_id
      WHERE ps.quiz_attempt_id IN (
        SELECT id FROM quiz_attempts WHERE quiz_id = $1
      )
    `;
    const sessionsResult = await pool.query(sessionsQuery, [quizId]);
    const sessionStats = sessionsResult.rows[0];

    res.json({
      quiz_id: quizId,
      attempts: {
        total: parseInt(attemptsStats.total_attempts) || 0,
        clean: parseInt(attemptsStats.clean_attempts) || 0,
        violated: parseInt(attemptsStats.violated_attempts) || 0,
        unique_students: parseInt(attemptsStats.unique_students) || 0,
        avg_clean_score: parseFloat(attemptsStats.avg_clean_score) || 0,
        avg_violated_score: parseFloat(attemptsStats.avg_violated_score) || 0
      },
      violations: violationsResult.rows.map(row => ({
        type: row.violation_type,
        count: parseInt(row.count),
        avg_severity: parseFloat(row.avg_severity)
      })),
      sessions: {
        total: parseInt(sessionStats.total_sessions) || 0,
        risk_distribution: {
          low: parseInt(sessionStats.low_risk) || 0,
          medium: parseInt(sessionStats.medium_risk) || 0,
          high: parseInt(sessionStats.high_risk) || 0,
          critical: parseInt(sessionStats.critical_risk) || 0
        },
        avg_compliance: parseFloat(sessionStats.avg_compliance) || 100
      }
    });
  } catch (error) {
    console.error('Error fetching quiz analytics:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quiz analytics' });
  }
}

/**
 * Get student proctoring history
 */
export async function getStudentProctoringHistory(req, res) {
  try {
    const { studentId } = req.params;
    const teacherId = req.user?.id;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify teacher has access to this student's courses
    const accessQuery = `
      SELECT DISTINCT qa.student_id FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN faculty_course_offerings fco ON co.id = fco.course_offering_id
      WHERE qa.student_id = $1 AND fco.faculty_id = $2
      LIMIT 1
    `;
    const accessResult = await pool.query(accessQuery, [studentId, teacherId]);

    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get student's proctoring history
    const historyQuery = `
      SELECT
        qa.id as attempt_id,
        qa.started_at,
        qa.finished_at,
        qa.score,
        qa.violated,
        q.title as quiz_title,
        c.code as course_code,
        pa.total_violations,
        pa.compliance_score,
        pa.risk_level,
        ps.status as session_status
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      LEFT JOIN proctoring_sessions ps ON qa.proctoring_session_id = ps.id
      LEFT JOIN proctoring_analytics pa ON ps.id = pa.session_id
      WHERE qa.student_id = $1
      ORDER BY qa.finished_at DESC
      LIMIT 50
    `;
    const historyResult = await pool.query(historyQuery, [studentId]);

    res.json({
      student_id: studentId,
      history: historyResult.rows.map(row => ({
        attempt_id: row.attempt_id,
        quiz_title: row.quiz_title,
        course_code: row.course_code,
        started_at: row.started_at,
        finished_at: row.finished_at,
        score: row.score,
        violated: row.violated,
        total_violations: parseInt(row.total_violations) || 0,
        compliance_score: parseFloat(row.compliance_score) || 100,
        risk_level: row.risk_level || 'low',
        session_status: row.session_status || 'completed'
      }))
    });
  } catch (error) {
    console.error('Error fetching student proctoring history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch student history' });
  }
}

// Get resume requests for teacher's courses
export async function getResumeRequests(req, res) {
  try {
    const teacherId = req.user?.id;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const query = `
      SELECT rr.*, u.name as student_name, u.email as student_email,
             q.title as quiz_title, c.code as course_code, co.term
      FROM resume_requests rr
      JOIN users u ON rr.student_id = u.id
      JOIN quiz_attempts qa ON rr.quiz_attempt_id = qa.id
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN faculty_course_offerings fco ON co.id = fco.course_offering_id
      WHERE fco.faculty_id = $1
      ORDER BY rr.requested_at DESC
    `;

    const result = await pool.query(query, [teacherId]);
    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Error fetching resume requests:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch resume requests' });
  }
}

// Approve or reject a resume request
export async function respondToResumeRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { action, responseMessage } = req.body; // action: 'approve' or 'reject'
    const teacherId = req.user?.id;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the resume request and verify teacher access
      const requestQuery = `
        SELECT rr.*, qa.proctoring_session_id
        FROM resume_requests rr
        JOIN quiz_attempts qa ON rr.quiz_attempt_id = qa.id
        JOIN quizzes q ON qa.quiz_id = q.id
        JOIN course_offerings co ON q.course_offering_id = co.id
        JOIN faculty_course_offerings fco ON co.id = fco.course_offering_id
        WHERE rr.id = $1 AND fco.faculty_id = $2
      `;
      const requestResult = await client.query(requestQuery, [requestId, teacherId]);

      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Access denied or request not found' });
      }

      const request = requestResult.rows[0];

      if (request.status !== 'pending') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Request has already been processed' });
      }

      // Update the resume request
      const status = action === 'approve' ? 'approved' : 'rejected';
      await client.query(`
        UPDATE resume_requests
        SET status = $1, reviewed_by = $2, reviewed_at = NOW(), response_message = $3, updated_at = NOW()
        WHERE id = $4
      `, [status, teacherId, responseMessage || null, requestId]);

      // If approved, resume the quiz attempt
      if (action === 'approve' && request.proctoring_session_id) {
        await client.query(
          'UPDATE proctoring_sessions SET status = $1, updated_at = now() WHERE id = $2',
          ['active', request.proctoring_session_id]
        );

        await client.query(
          'UPDATE quiz_attempts SET resumed_at = now(), resumed_by = $1 WHERE proctoring_session_id = $2',
          [teacherId, request.proctoring_session_id]
        );

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
          io.to(`proctoring-${request.proctoring_session_id}`).emit('session-resumed', {
            resumedBy: teacherId,
            reason: 'Resume request approved',
            timestamp: new Date().toISOString()
          });
        }
      }

      await client.query('COMMIT');

      res.json({
        message: `Resume request ${action}d successfully`,
        request_id: requestId,
        action,
        session_resumed: action === 'approve' && !!request.proctoring_session_id
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error responding to resume request:', error);
    res.status(500).json({ error: error.message || 'Failed to process resume request' });
  }
}