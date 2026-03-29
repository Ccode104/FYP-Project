import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {return res.status(401).json({ error: 'Missing token' });}
  const token = auth.replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);

    let userResult = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1 LIMIT 1',
      [payload.id]
    );

    // During DB migrations/seeding, user IDs may change while an old token still exists.
    // If the token email still maps to a real account, recover to that account instead of
    // allowing downstream FK errors with a stale numeric user id.
    if (userResult.rowCount === 0 && payload.email) {
      userResult = await pool.query(
        'SELECT id, email, role FROM users WHERE email = $1 LIMIT 1',
        [payload.email]
      );
    }

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = userResult.rows[0];
    const effectiveRole = user.role === 'admin' && payload.role ? payload.role : user.role;

    req.user = { id: user.id, role: effectiveRole, email: user.email };
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {return res.status(401).json({ error: 'Unauthorized' });}
    if (!roles.includes(req.user.role)) {return res.status(403).json({ error: 'Forbidden' });}
    next();
  };
}
