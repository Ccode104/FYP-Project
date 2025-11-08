import { pool } from '../db/index.js';
import { uploadBufferToS3 } from '../middleware/upload.js';

export async function submitFileAssignment(req, res) {
  const assignment_id = Number(req.body.assignment_id);
  const student_id = Number(req.user?.id || req.body.student_id);
  if (!assignment_id || !student_id) return res.status(400).json({ error: 'Missing' });

  try {
    const attempt = 1;
    const q = `INSERT INTO assignment_submissions (assignment_id, student_id, attempt)
               VALUES ($1,$2,$3) RETURNING *`;
    const r = await pool.query(q, [assignment_id, student_id, attempt]);
    const submission = r.rows[0];

    const files = req.files || [];
    for (const f of files) {
      const url = await uploadBufferToS3(f.buffer, f.originalname, f.mimetype);
      await pool.query(`INSERT INTO submission_files (submission_id, storage_path, filename, file_size, mime_type)
                        VALUES ($1,$2,$3,$4,$5)`, [submission.id, url, f.originalname, f.size, f.mimetype]);
    }

    res.json({ submission });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit' });
  }
}

export async function submitCodeAssignment(req, res) {
  const { assignment_id, language, code } = req.body;
  const student_id = Number(req.user?.id);
  if (!assignment_id || !student_id) return res.status(400).json({ error: 'Missing' });

  const q = `INSERT INTO assignment_submissions (assignment_id, student_id, attempt)
             VALUES ($1,$2,$3) RETURNING *`;
  const r = await pool.query(q, [assignment_id, student_id, 1]);
  const submission = r.rows[0];

  await pool.query(`INSERT INTO code_submissions (submission_id, language, code) VALUES ($1,$2,$3)`, [submission.id, language, code]);

  // TODO: enqueue to grader queue
  res.json({ submission });
}

export async function submitLinkAssignment(req, res) {
  const assignment_id = Number(req.body.assignment_id)
  const url = String(req.body.url || '')
  const student_id = Number(req.user?.id)
  if (!assignment_id || !student_id || !url) return res.status(400).json({ error: 'Missing' })
  try {
    const r = await pool.query(`INSERT INTO assignment_submissions (assignment_id, student_id, attempt) VALUES ($1,$2,$3) RETURNING *`, [assignment_id, student_id, 1])
    const submission = r.rows[0]
    const filename = url.split('/').pop() || url
    await pool.query(`INSERT INTO submission_files (submission_id, storage_path, filename) VALUES ($1,$2,$3)`, [submission.id, url, filename])
    res.json({ submission })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to submit link' })
  }
}

export async function gradeSubmission(req, res) {
  const { submission_id, score, feedback } = req.body;
  const grader_id = req.user?.id;
  if (!submission_id || score === undefined) return res.status(400).json({ error: 'Missing' });

  await pool.query(`INSERT INTO submission_grades (submission_id, grader_id, score, feedback) VALUES ($1,$2,$3,$4)`, [submission_id, grader_id, score, feedback || null]);
  await pool.query(`UPDATE assignment_submissions SET final_score=$1, grader_id=$2, graded_at=now(), status='graded' WHERE id=$3`, [score, grader_id, submission_id]);

  res.json({ success: true });
}

export async function getSubmissionById(req, res) {
  try {
    const submissionId = Number(req.params.submissionId || req.params.id);
    if (!submissionId) return res.status(400).json({ error: 'Missing submission id' });

    // Fetch submission with assignment and offering info
    const q = `
      SELECT s.*, a.id AS assignment_id, a.course_offering_id, o.faculty_id, u.name as student_name, u.email as student_email
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN course_offerings o ON a.course_offering_id = o.id
      JOIN users u ON s.student_id = u.id
      WHERE s.id = $1
      LIMIT 1
    `;
    const r = await pool.query(q, [submissionId]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Submission not found' });

    const submission = r.rows[0];

    // Authorization: faculty can only view submissions for their own offerings
    if (req.user?.role === 'faculty' && req.user.id !== submission.faculty_id) {
      return res.status(403).json({ error: 'Not authorized - you can only view submissions in your own courses' });
    }

    // Fetch files, code and grades
    const filesQ = `SELECT id, storage_path, filename, mime_type FROM submission_files WHERE submission_id = $1`;
    const filesR = await pool.query(filesQ, [submissionId]);

    const codeQ = `SELECT * FROM code_submissions WHERE submission_id = $1`;
    const codeR = await pool.query(codeQ, [submissionId]);

    const gradesQ = `SELECT * FROM submission_grades WHERE submission_id = $1 ORDER BY created_at DESC`;
    const gradesR = await pool.query(gradesQ, [submissionId]);

    const result = Object.assign({}, submission, {
      files: filesR.rows || [],
      code: codeR.rows || [],
      grades: gradesR.rows || []
    });

    return res.json({ submission: result });
  } catch (err) {
    console.error('getSubmissionById error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
