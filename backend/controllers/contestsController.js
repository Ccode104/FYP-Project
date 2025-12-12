import { pool } from '../db/index.js';

export async function createContest(req, res) {
  const {
    course_offering_id,
    title,
    description,
    start_at,
    end_at,
    max_score,
    allow_multiple_submissions,
    question_ids
  } = req.body;

  // Check if user has permission to create contests for this offering
  if (req.user.role !== 'admin') {
    const checkQ = `SELECT faculty_id FROM course_offerings WHERE id = $1`;
    const checkR = await pool.query(checkQ, [course_offering_id]);
    if (checkR.rowCount === 0) return res.status(404).json({ error: 'Course offering not found' });

    const offering = checkR.rows[0];
    if (req.user.role === 'faculty' && req.user.id !== offering.faculty_id) {
      return res.status(403).json({ error: 'Not authorized - you can only create contests for your own courses' });
    }
    // For TA, check if they are assigned to this offering
    if (req.user.role === 'ta') {
      const taCheck = await pool.query('SELECT 1 FROM ta_assignments WHERE ta_id = $1 AND course_offering_id = $2', [req.user.id, course_offering_id]);
      if (taCheck.rowCount === 0) {
        return res.status(403).json({ error: 'Not authorized - you are not assigned to this course' });
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const created_by = req.user?.id || null;
    const final_max_score = max_score || 100;
    const final_allow_multiple = allow_multiple_submissions || false;

    // Insert the contest
    const insertQ = `
      INSERT INTO contests (
        course_offering_id, title, description, start_at, end_at,
        max_score, allow_multiple_submissions, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const insertValues = [
      course_offering_id,
      title,
      description,
      start_at,
      end_at,
      final_max_score,
      final_allow_multiple,
      created_by
    ];

    const r = await client.query(insertQ, insertValues);
    const contest = r.rows[0];

    // Handle question_ids for the contest
    if (question_ids && Array.isArray(question_ids) && question_ids.length > 0) {
      for (let i = 0; i < question_ids.length; i++) {
        const question_id = Number(question_ids[i]);
        if (question_id) {
          const pointsPerQuestion = final_max_score / question_ids.length;
          await client.query(
            `INSERT INTO contest_questions (contest_id, question_id, points, position)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (contest_id, question_id) DO NOTHING`,
            [contest.id, question_id, pointsPerQuestion, i + 1]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json(contest);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating contest:', error);
    res.status(500).json({ error: 'Failed to create contest' });
  } finally {
    client.release();
  }
}

export async function getContest(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Missing contest id' });

  // Get contest with course offering details
  const q = `
    SELECT c.*, o.faculty_id, o.term, co.code as course_code, co.title as course_name
    FROM contests c
    JOIN course_offerings o ON c.course_offering_id = o.id
    JOIN courses co ON o.course_id = co.id
    WHERE c.id = $1
  `;
  const r = await pool.query(q, [id]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Contest not found' });

  const contest = r.rows[0];

  // Check if user has access to this contest (enrolled in the course or faculty/admin)
  if (req.user.role === 'student') {
    const enrollCheck = await pool.query(
      'SELECT 1 FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
      [contest.course_offering_id, req.user.id]
    );
    if (enrollCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }
  } else if (req.user.role === 'faculty' && req.user.id !== contest.faculty_id) {
    return res.status(403).json({ error: 'Not authorized to view this contest' });
  }

  res.json(contest);
}

export async function getContestByOffering(req, res) {
  const offeringId = Number(req.params.offeringId);
  const contestId = Number(req.params.contestId);
  if (!offeringId || !contestId) return res.status(400).json({ error: 'Missing offering or contest id' });

  // Get contest with course offering details
  const q = `
    SELECT c.*, o.faculty_id, o.term, co.code as course_code, co.title as course_name
    FROM contests c
    JOIN course_offerings o ON c.course_offering_id = o.id
    JOIN courses co ON o.course_id = co.id
    WHERE c.id = $1 AND c.course_offering_id = $2
  `;
  const r = await pool.query(q, [contestId, offeringId]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Contest not found for this course offering' });

  const contest = r.rows[0];

  // Check if user has access to this contest (enrolled in the course or faculty/admin)
  if (req.user.role === 'student') {
    const enrollCheck = await pool.query(
      'SELECT 1 FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
      [contest.course_offering_id, req.user.id]
    );
    if (enrollCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }
  } else if (req.user.role === 'faculty' && req.user.id !== contest.faculty_id) {
    return res.status(403).json({ error: 'Not authorized to view this contest' });
  }

  res.json(contest);
}

export async function listContests(req, res) {
  const offeringId = Number(req.params.offeringId);
  if (!offeringId) return res.status(400).json({ error: 'Missing course offering id' });

  // Check if user has access to this course offering
  if (req.user.role === 'student') {
    const enrollCheck = await pool.query(
      'SELECT 1 FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
      [offeringId, req.user.id]
    );
    if (enrollCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }
  } else if (req.user.role === 'faculty') {
    const facultyCheck = await pool.query(
      'SELECT 1 FROM course_offerings WHERE id = $1 AND faculty_id = $2',
      [offeringId, req.user.id]
    );
    if (facultyCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Not authorized to view contests for this course' });
    }
  }

  const q = `SELECT * FROM contests WHERE course_offering_id = $1 ORDER BY start_at DESC`;
  const r = await pool.query(q, [offeringId]);
  res.json(r.rows);
}

export async function getContestQuestions(req, res) {
  try {
    const contestId = Number(req.params.id);
    if (!contestId) return res.status(400).json({ error: 'Missing contest id' });

    // Verify contest exists and user has access
    const checkQ = `
      SELECT c.id, c.course_offering_id, o.faculty_id
      FROM contests c
      JOIN course_offerings o ON c.course_offering_id = o.id
      WHERE c.id = $1
    `;
    const checkR = await pool.query(checkQ, [contestId]);
    if (checkR.rowCount === 0) return res.status(404).json({ error: 'Contest not found' });

    const contest = checkR.rows[0];

    // Check access permissions
    if (req.user.role === 'student') {
      const enrollCheck = await pool.query(
        'SELECT 1 FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
        [contest.course_offering_id, req.user.id]
      );
      if (enrollCheck.rowCount === 0) {
        return res.status(403).json({ error: 'Not enrolled in this course' });
      }
    } else if (req.user.role === 'faculty' && req.user.id !== contest.faculty_id) {
      return res.status(403).json({ error: 'Not authorized to view this contest' });
    }

    const questionsQ = `
      SELECT cq.id, cq.title, cq.description, cq.constraints, cq.template_code, cq.driver_code,
             cqt.is_sample, cqt.input_text, cqt.expected_text, cqt.input_path, cqt.expected_path,
             cqst.points, cqst.position
      FROM contest_questions cqst
      JOIN code_questions cq ON cqst.question_id = cq.id
      LEFT JOIN code_question_testcases cqt ON cq.id = cqt.question_id
      WHERE cqst.contest_id = $1
      ORDER BY cqst.position
    `;
    const questionsR = await pool.query(questionsQ, [contestId]);

    // Parse JSONB fields and group test cases
    const questionsMap = new Map();

    for (const row of questionsR.rows) {
      console.log(`Row ID: ${row.id}, template_code type: ${typeof row.template_code}, value:`, row.template_code);
      console.log(`Row ID: ${row.id}, driver_code type: ${typeof row.driver_code}, value:`, row.driver_code);
      if (!questionsMap.has(row.id)) {
        questionsMap.set(row.id, {
          id: row.id,
          title: row.title,
          description: row.description,
          constraints: row.constraints,
          template_code: row.template_code && typeof row.template_code === 'string' ? JSON.parse(row.template_code) : row.template_code,
          driver_code: row.driver_code && typeof row.driver_code === 'string' ? JSON.parse(row.driver_code) : row.driver_code,
          points: row.points,
          position: row.position,
          test_cases: []
        });
      }

      if (row.is_sample !== null) {
        questionsMap.get(row.id).test_cases.push({
          id: row.id,
          is_sample: row.is_sample,
          input_text: row.input_text,
          expected_text: row.expected_text,
          input_path: row.input_path,
          expected_path: row.expected_path
        });
      }
    }

    const questions = Array.from(questionsMap.values());
    res.json(questions);
  } catch (err) {
    console.error('Error fetching contest questions:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch contest questions' });
  }
}

export async function submitContest(req, res) {
  try {
    const contestId = Number(req.params.id);
    const { submissions } = req.body; // Array of { question_id, code, language }

    if (!contestId || !submissions || !Array.isArray(submissions)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify contest exists and user is enrolled
    const contestCheck = await pool.query(`
      SELECT c.id, c.course_offering_id, c.start_at, c.end_at
      FROM contests c
      WHERE c.id = $1
    `, [contestId]);

    if (contestCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    const contest = contestCheck.rows[0];

    // Check if contest is active
    const now = new Date();
    const startTime = new Date(contest.start_at);
    const endTime = new Date(contest.end_at);

    if (now < startTime) {
      return res.status(400).json({ error: 'Contest has not started yet' });
    }

    if (now > endTime) {
      return res.status(400).json({ error: 'Contest has ended' });
    }

    // Check enrollment for students
    if (req.user.role === 'student') {
      const enrollCheck = await pool.query(
        'SELECT 1 FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
        [contest.course_offering_id, req.user.id]
      );
      if (enrollCheck.rowCount === 0) {
        return res.status(403).json({ error: 'Not enrolled in this course' });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create or update contest submission
      let submissionResult = await client.query(`
        SELECT id FROM contest_submissions
        WHERE contest_id = $1 AND student_id = $2
      `, [contestId, req.user.id]);

      let submissionId;
      if (submissionResult.rowCount === 0) {
        // Create new submission
        const newSubmission = await client.query(`
          INSERT INTO contest_submissions (contest_id, student_id, submitted_at)
          VALUES ($1, $2, NOW())
          RETURNING id
        `, [contestId, req.user.id]);
        submissionId = newSubmission.rows[0].id;
      } else {
        submissionId = submissionResult.rows[0].id;
        // Update submission timestamp
        await client.query(`
          UPDATE contest_submissions SET submitted_at = NOW() WHERE id = $1
        `, [submissionId]);
      }

      // Insert submission details
      for (const submission of submissions) {
        await client.query(`
          INSERT INTO contest_submission_details
          (contest_submission_id, question_id, code, language, submitted_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (contest_submission_id, question_id) DO UPDATE SET
            code = EXCLUDED.code,
            language = EXCLUDED.language,
            submitted_at = NOW()
        `, [
          submissionId,
          submission.question_id,
          submission.code,
          submission.language
        ]);
      }

      await client.query('COMMIT');
      res.json({ success: true, submissionId });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Error submitting contest:', err);
    res.status(500).json({ error: 'Failed to submit contest' });
  }
}

export async function getContestSubmissions(req, res) {
  const contestId = Number(req.params.id);
  if (!contestId) return res.status(400).json({ error: 'Missing contest id' });

  // Check permissions
  const contestCheck = await pool.query(`
    SELECT c.course_offering_id, o.faculty_id
    FROM contests c
    JOIN course_offerings o ON c.course_offering_id = o.id
    WHERE c.id = $1
  `, [contestId]);

  if (contestCheck.rowCount === 0) return res.status(404).json({ error: 'Contest not found' });

  const contest = contestCheck.rows[0];

  if (req.user.role !== 'admin' && req.user.id !== contest.faculty_id) {
    return res.status(403).json({ error: 'Not authorized to view submissions' });
  }

  const q = `
    SELECT cs.*, u.name as student_name, u.email as student_email
    FROM contest_submissions cs
    JOIN users u ON cs.student_id = u.id
    WHERE cs.contest_id = $1
    ORDER BY cs.submitted_at DESC
  `;
  const r = await pool.query(q, [contestId]);
  res.json({ submissions: r.rows });
}

export async function gradeContestSubmission(req, res) {
  try {
    const submissionId = Number(req.params.id);
    const { questionGrades, overallFeedback } = req.body;

    if (!submissionId) return res.status(400).json({ error: 'Missing submission id' });

    // Verify the user has permission to grade this submission
    const checkQ = `
      SELECT cs.id, cs.contest_id, c.course_offering_id, o.faculty_id
      FROM contest_submissions cs
      JOIN contests c ON cs.contest_id = c.id
      JOIN course_offerings o ON c.course_offering_id = o.id
      WHERE cs.id = $1
    `;
    const checkR = await pool.query(checkQ, [submissionId]);
    if (checkR.rowCount === 0) return res.status(404).json({ error: 'Submission not found' });

    const submission = checkR.rows[0];

    // Check if current user is faculty for this offering or admin
    if (req.user.role !== 'admin' && req.user.id !== submission.faculty_id) {
      return res.status(403).json({ error: 'Not authorized to grade this submission' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let totalScore = 0;

      // Update individual question grades
      if (questionGrades && Array.isArray(questionGrades)) {
        for (const qg of questionGrades) {
          await client.query(`
            UPDATE contest_submission_details
            SET score = $1, feedback = $2
            WHERE contest_submission_id = $3 AND question_id = $4
          `, [qg.score, qg.feedback || '', submissionId, qg.question_id]);

          totalScore += qg.score || 0;
        }
      }

      // Update the main submission
      const updateQ = `
        UPDATE contest_submissions
        SET final_score = $1, comments = $2, graded_at = NOW(), grader_id = $3
        WHERE id = $4
        RETURNING *
      `;
      const updateR = await client.query(updateQ, [totalScore, overallFeedback || '', req.user.id, submissionId]);

      await client.query('COMMIT');
      res.json(updateR.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Error grading contest submission:', err);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
}

export async function deleteContest(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Missing contest id' });

  // Verify ownership
  const checkQ = `SELECT c.id, c.created_by, o.faculty_id FROM contests c JOIN course_offerings o ON c.course_offering_id = o.id WHERE c.id = $1`;
  const r = await pool.query(checkQ, [id]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Contest not found' });

  const row = r.rows[0];
  const uid = req.user?.id;
  const role = req.user?.role;
  const isOwner = uid && (uid === row.created_by || uid === row.faculty_id);
  if (!(isOwner || role === 'admin')) return res.status(403).json({ error: 'Forbidden' });

  await pool.query(`DELETE FROM contests WHERE id = $1`, [id]);
  res.json({ success: true });
}