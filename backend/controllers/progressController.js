import { pool } from '../db/index.js';

/**
 * GET /api/progress/me
 * Returns the combined assignment + quiz progress for the authenticated student
 */
export async function getMyProgress(req, res) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const studentId = req.user.id;

    const q = `
      SELECT *
      FROM student_detailed_progress
      WHERE student_id = $1
      ORDER BY course_offering_id, activity_type, activity_id
    `;

    const r = await pool.query(q, [studentId]);
    return res.json({ rows: r.rows });
  } catch (err) {
    console.error('getMyProgress error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/progress/course/:offeringId
 * Returns progress for all students in a course offering
 * Access: faculty, ta, admin (enforced in route)
 */
export async function getByCourseOffering(req, res) {
  try {
    const offeringId = parseInt(req.params.offeringId, 10);
    if (Number.isNaN(offeringId)) return res.status(400).json({ error: 'Invalid offering id' });

    const q = `
      SELECT *
      FROM student_detailed_progress
      WHERE course_offering_id = $1
      ORDER BY student_id, activity_type, activity_id
    `;

    const r = await pool.query(q, [offeringId]);
    return res.json({ rows: r.rows });
  } catch (err) {
    console.error('getByCourseOffering error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/progress/student/:studentId
 * Returns progress for a specific student. Optionally filter by course_offering_id ?course_offering_id=123
 * Access: faculty, ta, admin (enforced in route)
 */
export async function getByStudent(req, res) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    if (Number.isNaN(studentId)) return res.status(400).json({ error: 'Invalid student id' });

    const courseOfferingId = req.query.course_offering_id ? parseInt(req.query.course_offering_id, 10) : null;
    const params = [studentId];
    let where = 'student_id = $1';
    if (courseOfferingId && !Number.isNaN(courseOfferingId)) {
      where += ' AND course_offering_id = $2';
      params.push(courseOfferingId);
    }

    const q = `
      SELECT *
      FROM student_detailed_progress
      WHERE ${where}
      ORDER BY course_offering_id, activity_type, activity_id
    `;

    const r = await pool.query(q, params);
    return res.json({ rows: r.rows });
  } catch (err) {
    console.error('getByStudent error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
