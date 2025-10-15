// Student controller stubs
import { pool } from '../db/index.js';

export async function getEnrolledCourses(req, res) {
  try {
    const studentId = req.user.id;
    const result = await pool.query(`
      SELECT co.id AS offering_id, c.code AS course_code, c.title, co.term, co.section, co.start_date, co.end_date, d.name AS department
      FROM enrollments e
      JOIN course_offerings co ON e.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE e.student_id = $1
      ORDER BY co.start_date DESC
    `, [studentId]);
    res.json(result.rows);
  } catch (err) {
    console.error('getEnrolledCourses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCourseDetails(req, res) {
  try {
    const { offeringId } = req.params;
    const result = await pool.query(`
      SELECT co.*, c.code AS course_code, c.title, c.description, c.credits, d.name AS department, u.name AS faculty_name
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON co.faculty_id = u.id
      WHERE co.id = $1
    `, [offeringId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Course offering not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('getCourseDetails error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCourseAssignments(req, res) {
  try {
    const { offeringId } = req.params;
    const result = await pool.query(
      `SELECT * FROM assignments WHERE course_offering_id = $1 ORDER BY due_at ASC`,
      [offeringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCourseAssignments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function submitAssignment(req, res) {
  try {
    const studentId = req.user.id;
    const { assignmentId } = req.params;
    const { comments } = req.body; // Optionally accept comments
    // Insert a new submission (basic, no file upload)
    const result = await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, comments, submitted_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [assignmentId, studentId, comments || null]
    );
    res.status(201).json({ message: 'Assignment submitted', submission: result.rows[0] });
  } catch (err) {
    console.error('submitAssignment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCourseSubmissions(req, res) {
  try {
    const studentId = req.user.id;
    const { offeringId } = req.params;
    const result = await pool.query(
      `SELECT s.*, a.title AS assignment_title, a.due_at
       FROM assignment_submissions s
       JOIN assignments a ON s.assignment_id = a.id
       WHERE s.student_id = $1 AND a.course_offering_id = $2
       ORDER BY s.submitted_at DESC`,
      [studentId, offeringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCourseSubmissions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCourseGrades(req, res) {
  try {
    const studentId = req.user.id;
    const { offeringId } = req.params;
    const result = await pool.query(
      `SELECT a.title AS assignment_title, g.score, g.feedback, g.created_at AS graded_at
       FROM submission_grades g
       JOIN assignment_submissions s ON g.submission_id = s.id
       JOIN assignments a ON s.assignment_id = a.id
       WHERE s.student_id = $1 AND a.course_offering_id = $2
       ORDER BY g.created_at DESC`,
      [studentId, offeringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCourseGrades error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCourseQuizzes(req, res) {
  try {
    const { offeringId } = req.params;
    const result = await pool.query(
      `SELECT * FROM quizzes WHERE course_offering_id = $1 ORDER BY start_at ASC`,
      [offeringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCourseQuizzes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function attemptQuiz(req, res) {
  try {
    const studentId = req.user.id;
    const { quizId } = req.params;
    const { answers } = req.body; // answers should be an object/array
    const result = await pool.query(
      `INSERT INTO quiz_attempts (quiz_id, student_id, started_at, finished_at, answers)
       VALUES ($1, $2, NOW(), NOW(), $3)
       RETURNING *`,
      [quizId, studentId, answers]
    );
    res.status(201).json({ message: 'Quiz attempted', attempt: result.rows[0] });
  } catch (err) {
    console.error('attemptQuiz error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
