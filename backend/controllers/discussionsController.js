import { pool } from '../db/index.js';

async function hasAccess(offeringId, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const id = Number(offeringId);
  if (!id) return false;

  if (user.role === 'faculty') {
    const r = await pool.query('SELECT 1 FROM course_offerings WHERE id=$1 AND faculty_id=$2', [id, user.id]);
    if (r.rowCount > 0) return true;
  }

  if (user.role === 'ta') {
    const r = await pool.query('SELECT 1 FROM ta_assignments WHERE course_offering_id=$1 AND ta_id=$2', [id, user.id]);
    if (r.rowCount > 0) return true;
  }

  if (user.role === 'student') {
    const r = await pool.query('SELECT 1 FROM enrollments WHERE course_offering_id=$1 AND student_id=$2', [id, user.id]);
    if (r.rowCount > 0) return true;
  }

  return false;
}

export async function listMessages(req, res) {
  try {
    const offeringId = Number(req.params.offeringId);
    if (!offeringId) return res.status(400).json({ error: 'Invalid offeringId' });
    if (!(await hasAccess(offeringId, req.user))) return res.status(403).json({ error: 'Forbidden' });

    const after = req.query.after ? new Date(String(req.query.after)) : null;
    const limit = Math.min(Number(req.query.limit || 200), 500);

    const params = [offeringId];
    let where = 'WHERE m.course_offering_id = $1';
    if (after && !isNaN(after.getTime())) {
      params.push(after.toISOString());
      where += ` AND m.created_at > $${params.length}`;
    }

    const q = `
      SELECT m.id, m.course_offering_id, m.user_id, m.parent_id, m.content, m.created_at,
             u.name AS author_name, u.role AS author_role
      FROM discussion_messages m
      LEFT JOIN users u ON u.id = m.user_id
      ${where}
      ORDER BY m.created_at ASC, m.id ASC
      LIMIT ${limit}
    `;
    const r = await pool.query(q, params);
    res.json({ messages: r.rows });
  } catch (err) {
    console.error('listMessages error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function postMessage(req, res) {
  try {
    const offeringId = Number(req.params.offeringId);
    const user = req.user;
    const { content, parent_id } = req.body || {};

    if (!offeringId) return res.status(400).json({ error: 'Invalid offeringId' });
    if (!(await hasAccess(offeringId, user))) return res.status(403).json({ error: 'Forbidden' });

    const text = (content || '').toString().trim();
    if (!text) return res.status(400).json({ error: 'Content required' });

    let parentId = parent_id ? Number(parent_id) : null;
    if (Number.isNaN(parentId)) parentId = null;

    // Students can only reply; teachers/TAs/admin can create top-level
    if (!parentId && user.role === 'student') {
      return res.status(403).json({ error: 'Students can only reply to a thread' });
    }

    if (parentId) {
      // Validate parent exists and belongs to same offering
      const p = await pool.query('SELECT id FROM discussion_messages WHERE id=$1 AND course_offering_id=$2', [parentId, offeringId]);
      if (p.rowCount === 0) return res.status(400).json({ error: 'Invalid parent_id' });
    }

    const r = await pool.query(
      `INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content)
       VALUES ($1,$2,$3,$4)
       RETURNING id, course_offering_id, user_id, parent_id, content, created_at`,
      [offeringId, user.id || null, parentId, text]
    );

    res.status(201).json({ message: r.rows[0] });
  } catch (err) {
    console.error('postMessage error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
