import { pool } from '../db/index.js';

export async function assignTA(req, res) {
  const { course_offering_id, ta_id, role } = req.body;
  if (!course_offering_id || !ta_id) return res.status(400).json({ error: 'Missing required fields' });

  // Check if the faculty member owns this course offering
  if (req.user.role === 'faculty') {
    const checkQ = `SELECT 1 FROM course_offerings WHERE id = $1 AND faculty_id = $2`;
    const checkR = await pool.query(checkQ, [course_offering_id, req.user.id]);
    if (checkR.rowCount === 0) {
      return res.status(403).json({ error: 'Not authorized - you can only assign TAs to your own courses' });
    }
  }

  // Verify the user being assigned has the 'ta' role
  const userCheckQ = `SELECT 1 FROM users WHERE id = $1 AND role = 'ta'`;
  const userCheckR = await pool.query(userCheckQ, [ta_id]);
  if (userCheckR.rowCount === 0) {
    return res.status(400).json({ error: 'Invalid TA ID - user must exist and have TA role' });
  }

  const q = `INSERT INTO ta_assignments (course_offering_id, ta_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *`;
  const r = await pool.query(q, [course_offering_id, ta_id, role || 'ta']);
  res.json({ row: r.rows[0] || null });
}

export async function removeTA(req, res) {
  const { id } = req.params;
  await pool.query(`DELETE FROM ta_assignments WHERE id=$1`, [id]);
  res.json({ success: true });
}

export async function getTADashboardData(req, res) {
  const taId = req.user.id;

  try {
    // Get courses TA is assigned to
    const coursesQuery = `
      SELECT co.id, co.course_code, co.course_title, co.term, co.section, ta.role
      FROM ta_assignments ta
      JOIN course_offerings co ON ta.course_offering_id = co.id
      WHERE ta.ta_id = $1
    `;
    const coursesResult = await pool.query(coursesQuery, [taId]);
    const courses = coursesResult.rows;

    // Get pending assignments (assignments with ungraded submissions)
    const pendingAssignmentsQuery = `
      SELECT a.id, a.title, a.due_date, co.course_code, co.course_title,
             COUNT(s.id) as total_submissions,
             COUNT(CASE WHEN s.grade IS NULL THEN 1 END) as ungraded_submissions
      FROM assignments a
      JOIN course_offerings co ON a.offering_id = co.id
      JOIN ta_assignments ta ON ta.course_offering_id = co.id
      LEFT JOIN submissions s ON s.assignment_id = a.id
      WHERE ta.ta_id = $1 AND a.due_date < NOW()
      GROUP BY a.id, co.course_code, co.course_title
      HAVING COUNT(CASE WHEN s.grade IS NULL THEN 1 END) > 0
      ORDER BY a.due_date DESC
    `;
    const pendingAssignmentsResult = await pool.query(pendingAssignmentsQuery, [taId]);
    const pendingAssignments = pendingAssignmentsResult.rows;

    // Get pending quizzes (quizzes with ungraded attempts)
    const pendingQuizzesQuery = `
      SELECT q.id, q.title, q.end_time, co.course_code, co.course_title,
             COUNT(qa.id) as total_attempts,
             COUNT(CASE WHEN qa.grade IS NULL THEN 1 END) as ungraded_attempts
      FROM quizzes q
      JOIN course_offerings co ON q.offering_id = co.id
      JOIN ta_assignments ta ON ta.course_offering_id = co.id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
      WHERE ta.ta_id = $1 AND q.end_time < NOW()
      GROUP BY q.id, co.course_code, co.course_title
      HAVING COUNT(CASE WHEN qa.grade IS NULL THEN 1 END) > 0
      ORDER BY q.end_time DESC
    `;
    const pendingQuizzesResult = await pool.query(pendingQuizzesQuery, [taId]);
    const pendingQuizzes = pendingQuizzesResult.rows;

    // Get pending viva
    const pendingVivaQuery = `
      SELECT vs.id, vs.title, vs.scheduled_at, co.course_code, co.course_title,
             COUNT(vp.id) as total_participants,
             COUNT(CASE WHEN vp.status = 'scheduled' THEN 1 END) as pending_participants
      FROM viva_sessions vs
      JOIN course_offerings co ON vs.course_offering_id = co.id
      JOIN ta_assignments ta ON ta.course_offering_id = co.id
      LEFT JOIN viva_participants vp ON vp.viva_session_id = vs.id
      WHERE ta.ta_id = $1 AND vs.scheduled_at > NOW() AND vs.status = 'scheduled'
      GROUP BY vs.id, co.course_code, co.course_title
      HAVING COUNT(CASE WHEN vp.status = 'scheduled' THEN 1 END) > 0
      ORDER BY vs.scheduled_at ASC
    `;
    const pendingVivaResult = await pool.query(pendingVivaQuery, [taId]);
    const pendingViva = pendingVivaResult.rows;

    // Get stats
    const statsQuery = `
      SELECT
        COUNT(DISTINCT s.id) as total_graded_assignments,
        COUNT(DISTINCT qa.id) as total_graded_quizzes,
        COUNT(DISTINCT vg.id) as total_graded_viva,
        COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.student_id END) as students_helped_assignments,
        COUNT(DISTINCT CASE WHEN qa.grade IS NOT NULL THEN qa.student_id END) as students_helped_quizzes,
        COUNT(DISTINCT CASE WHEN vg.score IS NOT NULL THEN vp.student_id END) as students_helped_viva
      FROM ta_assignments ta
      LEFT JOIN course_offerings co ON ta.course_offering_id = co.id
      LEFT JOIN assignments a ON a.offering_id = co.id
      LEFT JOIN submissions s ON s.assignment_id = a.id AND s.grade IS NOT NULL
      LEFT JOIN quizzes q ON q.offering_id = co.id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.grade IS NOT NULL
      LEFT JOIN viva_sessions vs ON vs.course_offering_id = co.id
      LEFT JOIN viva_participants vp ON vp.viva_session_id = vs.id
      LEFT JOIN viva_grades vg ON vg.viva_participant_id = vp.id
      WHERE ta.ta_id = $1
    `;
    const statsResult = await pool.query(statsQuery, [taId]);
    const stats = statsResult.rows[0];

    res.json({
      courses,
      pendingAssignments,
      pendingQuizzes,
      pendingViva,
      stats
    });
  } catch (error) {
    console.error('Error fetching TA dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}
