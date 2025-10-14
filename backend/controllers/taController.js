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
