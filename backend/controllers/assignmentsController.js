import { pool } from '../db/index.js';

export async function createAssignment(req, res) {
  const { course_offering_id, title, description, assignment_type, release_at, due_at, max_score, allow_multiple_submissions } = req.body;
  const q = `INSERT INTO assignments (course_offering_id, title, description, assignment_type, release_at, due_at, max_score, allow_multiple_submissions, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
  const created_by = req.user?.id || null;
  const r = await pool.query(q, [course_offering_id, title, description, assignment_type, release_at, due_at, max_score || 100, allow_multiple_submissions || false, created_by]);
  res.json(r.rows[0]);
}

export async function publishAssignment(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Missing assignment id' });

  // First get the assignment and its offering details
  const checkQ = `
    SELECT a.id, a.course_offering_id, o.faculty_id 
    FROM assignments a 
    JOIN course_offerings o ON a.course_offering_id = o.id 
    WHERE a.id = $1
  `;
  const checkR = await pool.query(checkQ, [id]);
  if (checkR.rowCount === 0) return res.status(404).json({ error: 'Assignment not found' });

  // Check if current user is faculty for this offering (skip check for admin)
  const assignment = checkR.rows[0];
  if (req.user.role === 'faculty' && req.user.id !== assignment.faculty_id) {
    return res.status(403).json({ error: 'Not authorized - you can only publish assignments in your own courses' });
  }

  const q = `UPDATE assignments SET release_at = COALESCE(release_at, now()) WHERE id=$1 RETURNING *`;
  const r = await pool.query(q, [id]);
  res.json(r.rows[0]);
}

export async function listAssignmentSubmissions(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Missing assignment id' });

  // First verify the user has access to this assignment's offering
  const checkQ = `
    SELECT a.id, a.course_offering_id, o.faculty_id 
    FROM assignments a 
    JOIN course_offerings o ON a.course_offering_id = o.id 
    WHERE a.id = $1
  `;
  const checkR = await pool.query(checkQ, [id]);
  if (checkR.rowCount === 0) return res.status(404).json({ error: 'Assignment not found' });

  // Check if current user is faculty for this offering (skip check for admin/ta)
  const assignment = checkR.rows[0];
  if (req.user.role === 'faculty' && req.user.id !== assignment.faculty_id) {
    return res.status(403).json({ error: 'Not authorized - you can only view submissions in your own courses' });
  }

  // Fetch submissions with student info
  const q = `SELECT s.*, u.name as student_name, u.email as student_email FROM assignment_submissions s JOIN users u ON s.student_id = u.id WHERE s.assignment_id=$1 ORDER BY s.submitted_at DESC`;
  const r = await pool.query(q, [id]);
  const submissions = r.rows || [];

  if (submissions.length === 0) return res.json({ submissions: [] });

  // Fetch files for all submissions in one query
  const ids = submissions.map((s) => s.id);
  const filesQ = `SELECT submission_id, json_agg(json_build_object('id', id, 'storage_path', storage_path, 'filename', filename, 'mime_type', mime_type)) as files FROM submission_files WHERE submission_id = ANY($1::bigint[]) GROUP BY submission_id`;
  const filesR2 = await pool.query(filesQ, [ids]);
  const filesMap = {};
  for (const row of filesR2.rows) {
    filesMap[row.submission_id] = row.files || [];
  }

  const enhanced = submissions.map((s) => Object.assign({}, s, { files: filesMap[s.id] || [] }));
  res.json({ submissions: enhanced });

}

