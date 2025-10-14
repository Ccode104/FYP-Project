import { pool } from '../db/index.js';

export async function graderWebhook(req, res) {
  const { submission_id, test_results, status, final_score } = req.body;
  if (!submission_id) return res.status(400).json({ error: 'Missing submission_id' });

  await pool.query(`UPDATE code_submissions SET test_results = $1, run_output = $2 WHERE submission_id = $3`, [test_results || null, JSON.stringify(test_results?.run_output || ''), submission_id]);
  if (final_score !== undefined) {
    await pool.query(`INSERT INTO submission_grades (submission_id, grader_id, score, feedback) VALUES ($1,$2,$3,$4)`, [submission_id, null, final_score, 'Auto-graded']);
    await pool.query(`UPDATE assignment_submissions SET final_score=$1, status=$2, graded_at=now() WHERE id=$3`, [final_score, status || 'graded', submission_id]);
  } else {
    await pool.query(`UPDATE assignment_submissions SET status=$1 WHERE id=$2`, [status||'graded', submission_id]);
  }

  res.json({ success: true });
}
