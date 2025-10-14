import { pool } from '../db/index.js';

export async function createAssignment(req, res) {
  const { course_offering_id, title, description, assignment_type, release_at, due_at, max_score, allow_multiple_submissions } = req.body;
  const q = `INSERT INTO assignments (course_offering_id, title, description, assignment_type, release_at, due_at, max_score, allow_multiple_submissions, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
  const created_by = req.user?.id || null;
  const r = await pool.query(q, [course_offering_id, title, description, assignment_type, release_at, due_at, max_score || 100, allow_multiple_submissions || false, created_by]);
  res.json(r.rows[0]);
}
