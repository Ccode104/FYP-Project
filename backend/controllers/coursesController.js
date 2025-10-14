import { pool } from '../db/index.js';

export async function createCourse(req, res) {
  const { code, title, description, department_id, credits } = req.body;
  const q = `INSERT INTO courses (code, title, description, department_id, credits)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`;
  const r = await pool.query(q, [code, title, description, department_id || null, credits || null]);
  res.json(r.rows[0]);
}

export async function createOffering(req, res) {
  const { course_id, term, section, faculty_id, max_capacity, start_date, end_date } = req.body;
  const q = `INSERT INTO course_offerings (course_id, term, section, faculty_id, max_capacity, start_date, end_date)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
  const r = await pool.query(q, [course_id, term, section, faculty_id, max_capacity || null, start_date || null, end_date || null]);
  res.json(r.rows[0]);
}

export async function enroll(req, res) {
  const offeringId = Number(req.params.offeringId);
  const studentId = Number(req.body.student_id);
  if (!offeringId || !studentId) return res.status(400).json({ error: 'Missing ids' });
  const q = `INSERT INTO enrollments (course_offering_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *`;
  const r = await pool.query(q, [offeringId, studentId]);
  res.json({ success: true, row: r.rows[0] || null });
}
