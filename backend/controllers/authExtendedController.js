import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from '../db/index.js';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_TOKEN_TTL_DAYS = 30;

async function createRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 3600 * 1000);
  await pool.query(`INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)`, [userId, token, expiresAt]);
  return { token, expiresAt };
}

export async function refreshToken(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' });
  const r = await pool.query(`SELECT id, user_id, revoked, expires_at FROM refresh_tokens WHERE token=$1`, [refreshToken]);
  if (r.rowCount === 0) return res.status(401).json({ error: 'Invalid token' });
  const row = r.rows[0];
  if (row.revoked) return res.status(401).json({ error: 'Revoked' });
  if (new Date(row.expires_at) < new Date()) return res.status(401).json({ error: 'Expired' });

  const u = await pool.query(`SELECT id, email, role FROM users WHERE id=$1`, [row.user_id]);
  const user = u.rows[0];
  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

  await pool.query(`UPDATE refresh_tokens SET revoked=true WHERE id=$1`, [row.id]);
  const newToken = await createRefreshToken(user.id);

  res.json({ token, refreshToken: newToken.token, user });
}

export async function logout(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Missing refresh token' });
  await pool.query(`UPDATE refresh_tokens SET revoked=true WHERE token=$1`, [refreshToken]);
  res.json({ success: true });
}

export async function requestPasswordReset(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Missing email' });
  const r = await pool.query(`SELECT id, email FROM users WHERE email=$1`, [email]);
  if (r.rowCount === 0) return res.json({ success: true });
  const user = r.rows[0];
  const token = crypto.randomBytes(24).toString('hex');
  await pool.query(`INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [`pwdreset:${token}`, JSON.stringify({ user_id: user.id, created_at: new Date().toISOString() })]);
  logger.info(`Password reset token for ${email}: ${token}`);
  res.json({ success: true, token }); // remove token in production, send email instead
}

export async function confirmPasswordReset(req, res) {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Missing' });
  const r = await pool.query(`SELECT value FROM settings WHERE key=$1`, [`pwdreset:${token}`]);
  if (r.rowCount === 0) return res.status(400).json({ error: 'Invalid token' });
  const val = r.rows[0].value;
  const parsed = typeof val === 'string' ? JSON.parse(val) : val;
  const userId = parsed.user_id;
  const hashed = await bcrypt.hash(newPassword, 10);
  await pool.query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [hashed, userId]);
  await pool.query(`DELETE FROM settings WHERE key=$1`, [`pwdreset:${token}`]);
  res.json({ success: true });
}
