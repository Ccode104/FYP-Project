import { pool } from '../db/index.js';

export async function assignTA(req, res) {
  const { course_offering_id, ta_id, role } = req.body;
  const q = `INSERT INTO ta_assignments (course_offering_id, ta_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *`;
  const r = await pool.query(q, [course_offering_id, ta_id, role || 'ta']);
  res.json({ row: r.rows[0] || null });
}

export async function removeTA(req, res) {
  const { id } = req.params;
  await pool.query(`DELETE FROM ta_assignments WHERE id=$1`, [id]);
  res.json({ success: true });
}
