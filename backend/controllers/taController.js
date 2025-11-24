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
      SELECT co.id, c.code as course_code, c.title as course_title, co.term, co.section, ta.role
      FROM ta_assignments ta
      JOIN course_offerings co ON ta.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE ta.ta_id = $1
    `;
    const coursesResult = await pool.query(coursesQuery, [taId]);
    const courses = coursesResult.rows;

    // Get pending assignments (assignments with ungraded submissions)
    const pendingAssignmentsQuery = `
      SELECT a.id, a.title, a.due_at as due_date, c.code as course_code, c.title as course_title,
             COUNT(s.id) as total_submissions,
             COUNT(CASE WHEN s.final_score IS NULL THEN 1 END) as ungraded_submissions
      FROM assignments a
      JOIN course_offerings co ON a.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN ta_assignments ta ON ta.course_offering_id = co.id
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.id
      WHERE ta.ta_id = $1 AND a.due_at < NOW()
      GROUP BY a.id, c.code, c.title
      HAVING COUNT(CASE WHEN s.final_score IS NULL THEN 1 END) > 0
      ORDER BY a.due_at DESC
    `;
    const pendingAssignmentsResult = await pool.query(pendingAssignmentsQuery, [taId]);
    const pendingAssignments = pendingAssignmentsResult.rows;

    // Get pending quizzes (quizzes with ungraded attempts)
    const pendingQuizzesQuery = `
      SELECT q.id, q.title, q.end_at as end_time, c.code as course_code, c.title as course_title,
             COUNT(qa.id) as total_attempts,
             COUNT(CASE WHEN qa.score IS NULL THEN 1 END) as ungraded_attempts
      FROM quizzes q
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN ta_assignments ta ON ta.course_offering_id = co.id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
      WHERE ta.ta_id = $1 AND q.end_at < NOW()
      GROUP BY q.id, c.code, c.title
      HAVING COUNT(CASE WHEN qa.score IS NULL THEN 1 END) > 0
      ORDER BY q.end_at DESC
    `;
    const pendingQuizzesResult = await pool.query(pendingQuizzesQuery, [taId]);
    const pendingQuizzes = pendingQuizzesResult.rows;

    // Get pending viva - commented out since viva tables don't exist yet
    // const pendingVivaQuery = `
    //   SELECT vs.id, vs.title, vs.scheduled_at, c.code as course_code, c.title as course_title,
    //          COUNT(vp.id) as total_participants,
    //          COUNT(CASE WHEN vp.status = 'scheduled' THEN 1 END) as pending_participants
    //   FROM viva_sessions vs
    //   JOIN course_offerings co ON vs.course_offering_id = co.id
    //   JOIN courses c ON co.course_id = c.id
    //   JOIN ta_assignments ta ON ta.course_offering_id = co.id
    //   LEFT JOIN viva_participants vp ON vp.viva_session_id = vs.id
    //   WHERE ta.ta_id = $1 AND vs.scheduled_at > NOW() AND vs.status = 'scheduled'
    //   GROUP BY vs.id, c.code, c.title
    //   HAVING COUNT(CASE WHEN vp.status = 'scheduled' THEN 1 END) > 0
    //   ORDER BY vs.scheduled_at ASC
    // `;
    // const pendingVivaResult = await pool.query(pendingVivaQuery, [taId]);
    const pendingViva = []; // Empty array since viva not implemented

    // Get stats
    const statsQuery = `
      SELECT
        COUNT(DISTINCT s.id) as total_graded_assignments,
        COUNT(DISTINCT qa.id) as total_graded_quizzes,
        0 as total_graded_viva, -- Viva not implemented yet
        COUNT(DISTINCT CASE WHEN s.final_score IS NOT NULL THEN s.student_id END) as students_helped_assignments,
        COUNT(DISTINCT CASE WHEN qa.score IS NOT NULL THEN qa.student_id END) as students_helped_quizzes,
        0 as students_helped_viva -- Viva not implemented yet
      FROM ta_assignments ta
      LEFT JOIN course_offerings co ON ta.course_offering_id = co.id
      LEFT JOIN assignments a ON a.course_offering_id = co.id
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.final_score IS NOT NULL
      LEFT JOIN quizzes q ON q.course_offering_id = co.id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.score IS NOT NULL
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

export async function getTAAssignments(req, res) {
  const taId = req.user.id;
  const { courseId } = req.query;

  try {
    let query = `
      SELECT DISTINCT a.id, a.title, a.due_at, c.code as course_code, c.title as course_title,
             co.id as course_offering_id,
             COUNT(gt.student_id) as assigned_students,
             COUNT(CASE WHEN s.final_score IS NOT NULL THEN 1 END) as graded_students
      FROM grading_tasks gt
      JOIN assignments a ON gt.assignment_id = a.id
      JOIN course_offerings co ON a.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = gt.student_id
      WHERE gt.ta_id = $1
    `;

    const params = [taId];

    if (courseId) {
      query += ' AND co.id = $2';
      params.push(courseId);
    }

    query += `
      GROUP BY a.id, c.code, c.title, co.id
      ORDER BY a.due_at DESC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching TA assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
}

export async function getGradingSubmissions(req, res) {
  const taId = req.user.id;
  const { assignmentId } = req.params;

  try {
    // First verify TA is assigned to this assignment
    const verifyQuery = `
      SELECT 1 FROM grading_tasks
      WHERE assignment_id = $1 AND ta_id = $2
      LIMIT 1
    `;
    const verifyResult = await pool.query(verifyQuery, [assignmentId, taId]);
    if (verifyResult.rowCount === 0) {
      return res.status(403).json({ error: 'Not assigned to grade this assignment' });
    }

    const query = `
      SELECT s.id as submission_id, s.student_id, s.submitted_at, s.final_score, s.comments,
             u.name as student_name, u.roll_number,
             gt.status as grading_status
      FROM grading_tasks gt
      JOIN assignment_submissions s ON gt.assignment_id = s.assignment_id AND gt.student_id = s.student_id
      JOIN users u ON s.student_id = u.id
      WHERE gt.assignment_id = $1 AND gt.ta_id = $2
      ORDER BY s.submitted_at ASC
    `;
    const result = await pool.query(query, [assignmentId, taId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching grading submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}

export async function submitGrading(req, res) {
  const taId = req.user.id;
  const { submissionId, rubricGrades, overallComments } = req.body;

  try {
    // Verify TA is assigned to grade this submission
    const verifyQuery = `
      SELECT gt.assignment_id, s.student_id
      FROM grading_tasks gt
      JOIN assignment_submissions s ON gt.assignment_id = s.assignment_id AND gt.student_id = s.student_id
      WHERE s.id = $1 AND gt.ta_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [submissionId, taId]);
    if (verifyResult.rowCount === 0) {
      return res.status(403).json({ error: 'Not assigned to grade this submission' });
    }

    const { assignment_id, student_id } = verifyResult.rows[0];

    // Start transaction
    await pool.query('BEGIN');

    // Insert/update rubric grades
    if (rubricGrades && Array.isArray(rubricGrades)) {
      for (const grade of rubricGrades) {
        await pool.query(`
          INSERT INTO rubric_grades (submission_id, criterion_id, score, feedback, graded_by, graded_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (submission_id, criterion_id)
          DO UPDATE SET score = EXCLUDED.score, feedback = EXCLUDED.feedback, graded_by = EXCLUDED.graded_by, graded_at = NOW()
        `, [submissionId, grade.criterionId, grade.score, grade.feedback || null, taId]);
      }
    }

    // Calculate total score
    const totalQuery = `
      SELECT COALESCE(SUM(rg.score), 0) as total_score
      FROM rubric_grades rg
      WHERE rg.submission_id = $1
    `;
    const totalResult = await pool.query(totalQuery, [submissionId]);
    const totalScore = totalResult.rows[0].total_score;

    // Update submission
    await pool.query(`
      UPDATE assignment_submissions
      SET final_score = $1, comments = $2, grader_id = $3, graded_at = NOW()
      WHERE id = $4
    `, [totalScore, overallComments || null, taId, submissionId]);

    // Update grading task status
    await pool.query(`
      UPDATE grading_tasks
      SET status = 'completed'
      WHERE assignment_id = $1 AND student_id = $2 AND ta_id = $3
    `, [assignment_id, student_id, taId]);

    await pool.query('COMMIT');

    res.json({ message: 'Grading submitted successfully', totalScore });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error submitting grading:', error);
    res.status(500).json({ error: 'Failed to submit grading' });
  }
}
