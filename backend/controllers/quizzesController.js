import { pool } from '../db/index.js';

export async function createQuiz(req, res) {
  const { course_offering_id, title, start_at, end_at, max_score } = req.body;
  const q = `INSERT INTO quizzes (course_offering_id, title, start_at, end_at, max_score) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
  const r = await pool.query(q, [course_offering_id, title, start_at || null, end_at || null, max_score || 100]);
  res.json(r.rows[0]);
}
