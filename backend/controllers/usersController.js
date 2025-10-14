// src/controllers/usersController.js
import { pool } from '../db/index.js';

/**
 * GET /api/users/by-email?email=...
 * or
 * GET /api/users/email/:email
 *
 * Authorization:
 *  - Admin can fetch any user
 *  - A user can fetch their own details (based on JWT email)
 *
 * Returns user fields (NOT password_hash)
 */
export async function getUserByEmail(req, res) {
  try {
    // Accept either query param or path param
    const email = (req.query.email || req.params.email || '').toString().trim();
    if (!email) return res.status(400).json({ error: 'Missing email parameter' });

    // Authorization: require authenticated user
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Allow if admin or requesting own record
    const requesterRole = req.user.role;
    const requesterEmail = req.user.email;

    if (requesterRole !== 'admin' && requesterEmail !== email) {
      return res.status(403).json({ error: 'Forbidden: can only fetch your own user or require admin role' });
    }

    const q = `
      SELECT id, email, name, role, department_id, roll_number, created_at, updated_at
      FROM users WHERE email = $1
      LIMIT 1
    `;
    const r = await pool.query(q, [email]);

    if (r.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    return res.json({ user: r.rows[0] });
  } catch (err) {
    console.error('getUserByEmail error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
