import { pool } from '../db/index.js';

export async function health(req, res) {
  try {
    const r = await pool.query('SELECT 1');
    res.json({
      ok: true,
      db: r.rowCount === 1 ? 'ok' : 'error',
      now: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'db error' });
  }
}
