// Student controller stubs
import { pool } from '../db/index.js';

export async function getEnrolledCourses(req, res) {
  try {
    const studentId = Number(req.user?.id)
    if (!studentId) return res.status(401).json({ error: 'Unauthorized' })
    const q = `
      SELECT o.id, c.code AS course_code, c.title AS course_title, o.term, o.section
      FROM enrollments e
      JOIN course_offerings o ON e.course_offering_id = o.id
      JOIN courses c ON o.course_id = c.id
      WHERE e.student_id = $1
      ORDER BY o.id DESC
    `
    const r = await pool.query(q, [studentId])
    res.json(r.rows)
  } catch (err) {
    console.error('getEnrolledCourses error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getCourseDetails(req, res) {
  // TODO: Implement logic to fetch details for a specific course offering
  res.json({ message: 'getCourseDetails not implemented' });
}

export async function getCourseAssignments(req, res) {
  // TODO: Implement logic to fetch all assignments for a course offering
  res.json({ message: 'getCourseAssignments not implemented' });
}

export async function submitAssignment(req, res) {
  // TODO: Implement logic to submit an assignment
  res.json({ message: 'submitAssignment not implemented' });
}

export async function getCourseSubmissions(req, res) {
  // TODO: Implement logic to fetch all submissions for a course offering
  res.json({ message: 'getCourseSubmissions not implemented' });
}

export async function getCourseGrades(req, res) {
  // TODO: Implement logic to fetch grades for a course offering
  res.json({ message: 'getCourseGrades not implemented' });
}

export async function getCourseQuizzes(req, res) {
  // TODO: Implement logic to fetch all quizzes for a course offering
  res.json({ message: 'getCourseQuizzes not implemented' });
}

export async function attemptQuiz(req, res) {
  // TODO: Implement logic to attempt a quiz
  res.json({ message: 'attemptQuiz not implemented' });
}
