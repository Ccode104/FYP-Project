import { pool } from '../db/index.js';

export async function createCourse(req, res) {
  const { code, title, description, department_id, credits } = req.body;
  const q = `INSERT INTO courses (code, title, description, department_id, credits)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`;
  const r = await pool.query(q, [code, title, description, department_id || null, credits || null]);
  res.json(r.rows[0]);
}

export async function listCourses(req, res) {
  const q = `SELECT id, code, title, description, department_id, credits FROM courses ORDER BY code`;
  const r = await pool.query(q);
  res.json(r.rows);
}

export async function listMyCourses(req, res) {
  const facultyId = Number(req.user?.id);
  if (!facultyId) return res.status(401).json({ error: 'Unauthorized' });
  const q = `SELECT DISTINCT c.id, c.code, c.title, c.description, c.department_id, c.credits
             FROM course_offerings o
             JOIN courses c ON o.course_id = c.id
             WHERE o.faculty_id = $1
             ORDER BY c.code`;
  const r = await pool.query(q, [facultyId]);
  res.json(r.rows);
}

export async function createOffering(req, res) {
  const { course_id, term, section, faculty_id, max_capacity, start_date, end_date } = req.body;
  console.log(req.body);
  const q = `INSERT INTO course_offerings (course_id, term, section, faculty_id, max_capacity, start_date, end_date)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
  const r = await pool.query(q, [course_id, term, section, faculty_id, max_capacity || null, start_date || null, end_date || null]);
  res.json(r.rows[0]);
}

export async function enroll(req, res) {
  const offeringId = Number(req.params.offeringId);
  if (!offeringId) return res.status(400).json({ error: 'Missing offering id' });

  let studentId;
  if (req.user?.role === 'student') {
    // Students can only enroll themselves
    studentId = Number(req.user.id);
  } else {
    studentId = Number(req.body.student_id);
    if (!studentId) return res.status(400).json({ error: 'Missing student_id' });
  }

  const q = `INSERT INTO enrollments (course_offering_id, student_id)
             VALUES ($1,$2)
             ON CONFLICT DO NOTHING
             RETURNING *`;
  const r = await pool.query(q, [offeringId, studentId]);
  res.json({ success: true, row: r.rows[0] || null });
}

export async function unenroll(req, res) {
  const offeringId = Number(req.params.offeringId);
  if (!offeringId) return res.status(400).json({ error: 'Missing offering id' });
  let studentId;
  if (req.user?.role === 'student') {
    studentId = Number(req.user.id);
  } else {
    studentId = Number(req.body.student_id);
    if (!studentId) return res.status(400).json({ error: 'Missing student_id' });
  }
  await pool.query(`DELETE FROM enrollments WHERE course_offering_id=$1 AND student_id=$2`, [offeringId, studentId]);
  res.json({ success: true });
}

export async function listMyOfferings(req, res) {
  const facultyId = Number(req.user?.id);
  if (!facultyId) return res.status(401).json({ error: 'Unauthorized' });
  const q = `SELECT o.*, c.code as course_code, c.title as course_title
             FROM course_offerings o
             JOIN courses c ON o.course_id = c.id
             WHERE o.faculty_id = $1
             ORDER BY o.id DESC`;
  const r = await pool.query(q, [facultyId]);
  res.json(r.rows);
}

export async function offeringOverview(req, res) {
  const offeringId = Number(req.params.offeringId);
  if (!offeringId) return res.status(400).json({ error: 'Missing offering id' });

  // Basic offering info with course and faculty
  const q = `SELECT o.*, c.code as course_code, c.title as course_title, u.id as faculty_id, u.name as faculty_name, u.email as faculty_email
             FROM course_offerings o
             JOIN courses c ON o.course_id = c.id
             JOIN users u ON o.faculty_id = u.id
             WHERE o.id = $1 LIMIT 1`;
  const r = await pool.query(q, [offeringId]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Offering not found' });
  const offering = r.rows[0];

  // Enrollment count
  const enr = await pool.query(`SELECT COUNT(*)::int as count FROM enrollments WHERE course_offering_id=$1`, [offeringId]);
  offering.enrollment_count = enr.rows[0].count;

  // TAs
  const tasR = await pool.query(`SELECT ta.id as ta_id, u.name, u.email, ta.role FROM ta_assignments ta JOIN users u ON ta.ta_id = u.id WHERE ta.course_offering_id=$1`, [offeringId]);
  offering.tas = tasR.rows;

  // Upcoming assignments
  const asR = await pool.query(`SELECT id, title, due_at, release_at FROM assignments WHERE course_offering_id=$1 ORDER BY due_at NULLS LAST`, [offeringId]);
  offering.assignments = asR.rows;

  res.json({ offering });
}
