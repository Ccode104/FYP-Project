import express from 'express';
import { pool } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all quizzes for a course offering (for TAs to request access)
router.get('/course/:courseOfferingId', requireAuth, async (req, res) => {
  try {
    const { courseOfferingId } = req.params;
    const userId = req.user.id;

    // Check if user is a TA for this course
    const taCheck = await pool.query(`
      SELECT 1 FROM ta_assignments
      WHERE course_offering_id = $1 AND ta_id = $2
    `, [courseOfferingId, userId]);

    if (taCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. You are not assigned as TA for this course.' });
    }

    // Get all quizzes for this course
    const quizzes = await pool.query(`
      SELECT q.id, q.title, q.start_at, q.end_at, q.max_score, q.is_proctored,
             COALESCE(tp.can_view, false) as has_view_access,
             COALESCE(tp.can_edit, false) as has_edit_access,
             COALESCE(tp.can_create, false) as has_create_access
      FROM quizzes q
      LEFT JOIN ta_quiz_permissions tp ON q.id = tp.quiz_id AND tp.ta_id = $2
      WHERE q.course_offering_id = $1
      ORDER BY q.created_at DESC
    `, [courseOfferingId, userId]);

    res.json({ quizzes: quizzes.rows });
  } catch (error) {
    console.error('Error fetching course quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Request access to a quiz
router.post('/request/:quizId', requireAuth, async (req, res) => {
  try {
    const { quizId } = req.params;
    // eslint-disable-next-line no-unused-vars
    const { requestType, _message } = req.body;
    const taId = req.user.id;

    // Validate request type
    if (!['view', 'edit', 'create'].includes(requestType)) {
      return res.status(400).json({ error: 'Invalid request type' });
    }

    // Check if quiz exists and get teacher info
    const quizInfo = await pool.query(`
      SELECT q.course_offering_id, co.faculty_id
      FROM quizzes q
      JOIN course_offerings co ON q.course_offering_id = co.id
      WHERE q.id = $1
    `, [quizId]);

    if (quizInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const { course_offering_id, faculty_id } = quizInfo.rows[0];

    // Check if TA is assigned to this course
    const taCheck = await pool.query(`
      SELECT 1 FROM ta_assignments
      WHERE course_offering_id = $1 AND ta_id = $2
    `, [course_offering_id, taId]);

    if (taCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. You are not assigned as TA for this course.' });
    }

    // Check if request already exists
    const existingRequest = await pool.query(`
      SELECT id, status FROM quiz_access_requests
      WHERE quiz_id = $1 AND ta_id = $2 AND request_type = $3
    `, [quizId, taId, requestType]);

    if (existingRequest.rows.length > 0) {
      const status = existingRequest.rows[0].status;
      if (status === 'pending') {
        return res.status(400).json({ error: 'Request already pending' });
      } else if (status === 'approved') {
        return res.status(400).json({ error: 'Access already granted' });
      }
    }

    // Create new request
    const result = await pool.query(`
      INSERT INTO quiz_access_requests (quiz_id, ta_id, teacher_id, request_type, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id
    `, [quizId, taId, faculty_id, requestType]);

    res.json({
      message: 'Access request submitted successfully',
      requestId: result.rows[0].id
    });
  } catch (error) {
    console.error('Error requesting quiz access:', error);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// Get pending requests for a teacher
router.get('/requests/pending', requireAuth, requireRole(['faculty', 'teacher', 'admin']), async (req, res) => {
  try {
    const teacherId = req.user.id;

    const requests = await pool.query(`
      SELECT
        qar.id,
        qar.quiz_id,
        q.title as quiz_title,
        qar.ta_id,
        u.name as ta_name,
        u.email as ta_email,
        qar.request_type,
        qar.requested_at,
        c.code as course_code,
        c.title as course_title
      FROM quiz_access_requests qar
      JOIN quizzes q ON qar.quiz_id = q.id
      JOIN users u ON qar.ta_id = u.id
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE qar.teacher_id = $1 AND qar.status = 'pending'
      ORDER BY qar.requested_at DESC
    `, [teacherId]);

    res.json({ requests: requests.rows });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Respond to access request (approve/reject)
router.post('/requests/:requestId/respond', requireAuth, requireRole(['faculty', 'teacher', 'admin']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, message } = req.body;
    const teacherId = req.user.id;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Get request details
    const requestInfo = await pool.query(`
      SELECT qar.*, q.title as quiz_title
      FROM quiz_access_requests qar
      JOIN quizzes q ON qar.quiz_id = q.id
      WHERE qar.id = $1 AND qar.teacher_id = $2
    `, [requestId, teacherId]);

    if (requestInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestInfo.rows[0];

    if (action === 'approve') {
      // Grant permissions based on request type
      const permissions = {
        can_view: true,
        can_edit: request.request_type === 'edit' || request.request_type === 'create',
        can_create: request.request_type === 'create'
      };

      await pool.query(`
        INSERT INTO ta_quiz_permissions (quiz_id, ta_id, can_view, can_edit, can_create, granted_by, granted_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (quiz_id, ta_id)
        DO UPDATE SET
          can_view = GREATEST(ta_quiz_permissions.can_view, EXCLUDED.can_view),
          can_edit = GREATEST(ta_quiz_permissions.can_edit, EXCLUDED.can_edit),
          can_create = GREATEST(ta_quiz_permissions.can_create, EXCLUDED.can_create),
          granted_by = EXCLUDED.granted_by,
          granted_at = NOW()
      `, [request.quiz_id, request.ta_id, permissions.can_view, permissions.can_edit, permissions.can_create, teacherId]);
    }

    // Update request status
    await pool.query(`
      UPDATE quiz_access_requests
      SET status = $1, responded_at = NOW(), response_message = $2
      WHERE id = $3
    `, [action === 'approve' ? 'approved' : 'rejected', message || '', requestId]);

    res.json({
      message: `Request ${action}d successfully`,
      quizTitle: request.quiz_title
    });
  } catch (error) {
    console.error('Error responding to request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Get quizzes TA has access to
router.get('/my-access', requireAuth, async (req, res) => {
  try {
    const taId = req.user.id;

    const quizzes = await pool.query(`
      SELECT
        q.id,
        q.title,
        q.start_at,
        q.end_at,
        q.max_score,
        q.is_proctored,
        tp.can_view,
        tp.can_edit,
        tp.can_create,
        c.code as course_code,
        c.title as course_title,
        tp.granted_at
      FROM ta_quiz_permissions tp
      JOIN quizzes q ON tp.quiz_id = q.id
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE tp.ta_id = $1
      ORDER BY tp.granted_at DESC
    `, [taId]);

    res.json({ quizzes: quizzes.rows });
  } catch (error) {
    console.error('Error fetching TA quiz access:', error);
    res.status(500).json({ error: 'Failed to fetch quiz access' });
  }
});

// Get quiz details for editing (if TA has edit access)
router.get('/:quizId/details', requireAuth, async (req, res) => {
  try {
    const { quizId } = req.params;
    const taId = req.user.id;

    // Check permissions
    const permissions = await pool.query(`
      SELECT can_view, can_edit, can_create FROM ta_quiz_permissions
      WHERE quiz_id = $1 AND ta_id = $2
    `, [quizId, taId]);

    if (permissions.rows.length === 0 || !permissions.rows[0].can_view) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get quiz with questions
    const quiz = await pool.query(`
      SELECT q.*, c.code as course_code, c.title as course_title
      FROM quizzes q
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE q.id = $1
    `, [quizId]);

    if (quiz.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const questions = await pool.query(`
      SELECT * FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY id
    `, [quizId]);

    res.json({
      quiz: quiz.rows[0],
      questions: questions.rows,
      permissions: permissions.rows[0]
    });
  } catch (error) {
    console.error('Error fetching quiz details:', error);
    res.status(500).json({ error: 'Failed to fetch quiz details' });
  }
});

// Update quiz (if TA has edit access)
router.put('/:quizId', requireAuth, async (req, res) => {
  try {
    const { quizId } = req.params;
    const { title, start_at, end_at, max_score, time_limit, is_proctored, questions } = req.body;
    const taId = req.user.id;

    // Check edit permissions
    const permissions = await pool.query(`
      SELECT can_edit FROM ta_quiz_permissions
      WHERE quiz_id = $1 AND ta_id = $2
    `, [quizId, taId]);

    if (permissions.rows.length === 0 || !permissions.rows[0].can_edit) {
      return res.status(403).json({ error: 'Edit access denied' });
    }

    // Update quiz
    await pool.query(`
      UPDATE quizzes
      SET title = $1, start_at = $2, end_at = $3, max_score = $4, time_limit = $5, is_proctored = $6
      WHERE id = $7
    `, [title, start_at, end_at, max_score, time_limit, is_proctored, quizId]);

    // Update questions if provided
    if (questions && Array.isArray(questions)) {
      // Delete existing questions
      await pool.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]);

      // Insert new questions
      for (const question of questions) {
        await pool.query(`
          INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata)
          VALUES ($1, $2, $3, $4)
        `, [quizId, question.question_text, question.question_type, question.metadata]);
      }
    }

    res.json({ message: 'Quiz updated successfully' });
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

export default router;