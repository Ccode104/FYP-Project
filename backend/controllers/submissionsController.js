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
