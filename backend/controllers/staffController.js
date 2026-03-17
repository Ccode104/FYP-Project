import { pool } from '../db/index.js';

function roleToSqlScope(role) {
  // faculty/teacher: own offerings; ta: assigned offerings; admin: all
  if (role === 'admin') return 'admin';
  if (role === 'ta') return 'ta';
  return 'faculty';
}

export async function getReviewQueue(req, res) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const scope = roleToSqlScope(role);

    // Pending quiz access requests are only meaningful for faculty/teacher/admin
    let quizAccessRequests = [];
    if (scope === 'admin' || scope === 'faculty') {
      const reqQ = `
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
          c.title as course_title,
          q.course_offering_id
        FROM quiz_access_requests qar
        JOIN quizzes q ON qar.quiz_id = q.id
        JOIN users u ON qar.ta_id = u.id
        JOIN course_offerings co ON q.course_offering_id = co.id
        JOIN courses c ON co.course_id = c.id
        WHERE qar.status = 'pending'
          AND ($1::text = 'admin' OR qar.teacher_id = $2)
        ORDER BY qar.requested_at DESC
        LIMIT 50
      `;
      const reqR = await pool.query(reqQ, [scope, userId]);
      quizAccessRequests = reqR.rows || [];
    }

    // Ungraded assignment submissions for staff scope
    const submissionsQ = `
      SELECT
        s.id as submission_id,
        s.assignment_id,
        s.student_id,
        s.submitted_at,
        s.status,
        s.final_score,
        a.title as assignment_title,
        a.course_offering_id,
        u.name as student_name,
        u.email as student_email,
        c.code as course_code,
        c.title as course_title
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN course_offerings co ON a.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN users u ON s.student_id = u.id
      LEFT JOIN ta_assignments ta ON ta.course_offering_id = co.id AND ta.ta_id = $2
      WHERE s.status = 'submitted'
        AND s.graded_at IS NULL
        AND (
          $1::text = 'admin'
          OR ($1::text = 'faculty' AND co.faculty_id = $2)
          OR ($1::text = 'ta' AND ta.ta_id IS NOT NULL)
        )
      ORDER BY s.submitted_at DESC
      LIMIT 100
    `;
    const submissionsR = await pool.query(submissionsQ, [scope, userId]);

    res.json({
      quizAccessRequests,
      ungradedSubmissions: submissionsR.rows || [],
    });
  } catch (error) {
    console.error('Error building review queue:', error);
    res.status(500).json({ error: 'Failed to load review queue' });
  }
}

