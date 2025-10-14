import { pool } from '../db/index.js';

export async function createResource(req, res) {
  const { course_offering_id, title, description, resource_type, storage_path, filename } = req.body;
  const uploaded_by = req.user?.id || null;
  const q = `INSERT INTO resources (course_offering_id, uploaded_by, title, description, resource_type, storage_path, filename)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
  const r = await pool.query(q, [course_offering_id, uploaded_by, title, description, resource_type, storage_path, filename]);
  res.json(r.rows[0]);
}

export async function listResources(req, res) {
  const offeringId = req.query.offeringId;
  const q = `SELECT * FROM resources WHERE course_offering_id = $1 ORDER BY uploaded_at DESC`;
  const r = await pool.query(q, [offeringId]);
  res.json(r.rows);
}

export async function deleteResource(req, res) {
  const id = Number(req.params.id);
  await pool.query(`DELETE FROM resources WHERE id=$1`, [id]);
  res.json({ success: true });
}
