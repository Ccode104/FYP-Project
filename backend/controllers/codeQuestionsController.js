import { pool } from '../db/index.js';
// import { uploadBufferToS3 } from '../middleware/upload.js';

// Create a new code question
export async function createCodeQuestion(req, res) {
  try {
    const { title, description, constraints, course_offering_id, test_cases } = req.body;
    const created_by = req.user?.id || null;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Insert the question
    const q = `INSERT INTO code_questions (title, description, constraints, created_by)
              VALUES ($1, $2, $3, $4) RETURNING *`;
    const r = await pool.query(q, [title, description, constraints || null, created_by]);
    const question = r.rows[0];

    // Insert test cases if provided
    if (test_cases && Array.isArray(test_cases)) {
      for (const testCase of test_cases) {
        const { is_sample, input_text, expected_text, input_file, expected_file } = testCase;
        
        // If files are provided as base64 or text, we can store them directly
        // For file uploads, you might want to use S3 storage
        let input_path = null;
        let expected_path = null;

        // If input_file is provided as base64 or buffer, upload to S3
        if (input_file && input_file.data) {
          try {
            input_path = await uploadBufferToS3(
              Buffer.from(input_file.data, input_file.encoding || 'base64'),
              input_file.filename || 'input.txt',
              'text/plain'
            );
          } catch (err) {
            console.error('Error uploading input file:', err);
          }
        }

        // If expected_file is provided as base64 or buffer, upload to S3
        if (expected_file && expected_file.data) {
          try {
            expected_path = await uploadBufferToS3(
              Buffer.from(expected_file.data, expected_file.encoding || 'base64'),
              expected_file.filename || 'expected.txt',
              'text/plain'
            );
          } catch (err) {
            console.error('Error uploading expected file:', err);
          }
        }

        const tcQ = `INSERT INTO code_question_testcases 
                     (question_id, is_sample, input_text, expected_text, input_path, expected_path)
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
        await pool.query(tcQ, [
          question.id,
          is_sample || false,
          input_text || null,
          expected_text || null,
          input_path || null,
          expected_path || null
        ]);
      }
    }

    res.json(question);
  } catch (err) {
    console.error('Error creating code question:', err);
    res.status(500).json({ error: err.message || 'Failed to create code question' });
  }
}

// Get all code questions for a course offering (or all if no offering specified)
export async function getCodeQuestions(req, res) {
  try {
    const offeringId = req.params.offeringId || req.query.offeringId;
    
    let q;
    let params;

    if (offeringId) {
      // Get questions that might be associated with a course offering
      // For now, we'll get all questions created by faculty teaching this offering
      q = `SELECT cq.*, 
                  COALESCE(
                    json_agg(
                      json_build_object(
                        'id', cqt.id,
                        'is_sample', cqt.is_sample,
                        'input_text', cqt.input_text,
                        'expected_text', cqt.expected_text,
                        'input_path', cqt.input_path,
                        'expected_path', cqt.expected_path
                      )
                    ) FILTER (WHERE cqt.id IS NOT NULL),
                    '[]'::json
                  ) as test_cases
           FROM code_questions cq
           LEFT JOIN code_question_testcases cqt ON cq.id = cqt.question_id
           WHERE cq.created_by IN (
             SELECT faculty_id FROM course_offerings WHERE id = $1
             UNION
             SELECT ta_id FROM ta_assignments WHERE course_offering_id = $1
           )
           GROUP BY cq.id
           ORDER BY cq.created_at DESC`;
      params = [offeringId];
    } else {
      // Get all questions (for admin or if no offering specified)
      q = `SELECT cq.*,
                  COALESCE(
                    json_agg(
                      json_build_object(
                        'id', cqt.id,
                        'is_sample', cqt.is_sample,
                        'input_text', cqt.input_text,
                        'expected_text', cqt.expected_text,
                        'input_path', cqt.input_path,
                        'expected_path', cqt.expected_path
                      )
                    ) FILTER (WHERE cqt.id IS NOT NULL),
                    '[]'::json
                  ) as test_cases
           FROM code_questions cq
           LEFT JOIN code_question_testcases cqt ON cq.id = cqt.question_id
           GROUP BY cq.id
           ORDER BY cq.created_at DESC`;
      params = [];
    }

    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (err) {
    console.error('Error fetching code questions:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch code questions' });
  }
}

// Get a single code question by ID
export async function getCodeQuestionById(req, res) {
  try {
    const { id } = req.params;
    
    const q = `SELECT cq.*,
                  COALESCE(
                    json_agg(
                      json_build_object(
                        'id', cqt.id,
                        'is_sample', cqt.is_sample,
                        'input_text', cqt.input_text,
                        'expected_text', cqt.expected_text,
                        'input_path', cqt.input_path,
                        'expected_path', cqt.expected_path
                      )
                    ) FILTER (WHERE cqt.id IS NOT NULL),
                    '[]'::json
                  ) as test_cases
               FROM code_questions cq
               LEFT JOIN code_question_testcases cqt ON cq.id = cqt.question_id
               WHERE cq.id = $1
               GROUP BY cq.id`;
    
    const r = await pool.query(q, [id]);
    
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Code question not found' });
    }

    res.json(r.rows[0]);
  } catch (err) {
    console.error('Error fetching code question:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch code question' });
  }
}

// Update a code question
export async function updateCodeQuestion(req, res) {
  try {
    const { id } = req.params;
    const { title, description, constraints, test_cases } = req.body;

    // Check if question exists and user has permission
    const checkQ = `SELECT created_by FROM code_questions WHERE id = $1`;
    const checkR = await pool.query(checkQ, [id]);
    
    if (checkR.rows.length === 0) {
      return res.status(404).json({ error: 'Code question not found' });
    }

    // Only creator or admin can update
    if (req.user.role !== 'admin' && req.user.id !== checkR.rows[0].created_by) {
      return res.status(403).json({ error: 'Not authorized to update this question' });
    }

    // Update question
    const updateQ = `UPDATE code_questions 
                     SET title = COALESCE($1, title),
                         description = COALESCE($2, description),
                         constraints = COALESCE($3, constraints)
                     WHERE id = $4 RETURNING *`;
    const updateR = await pool.query(updateQ, [title || null, description || null, constraints || null, id]);

    // If test cases are provided, update them
    if (test_cases && Array.isArray(test_cases)) {
      // Delete existing test cases
      await pool.query(`DELETE FROM code_question_testcases WHERE question_id = $1`, [id]);

      // Insert new test cases
      for (const testCase of test_cases) {
        const { is_sample, input_text, expected_text, input_file, expected_file } = testCase;
        
        let input_path = null;
        let expected_path = null;

        if (input_file && input_file.data) {
          try {
            input_path = await uploadBufferToS3(
              Buffer.from(input_file.data, input_file.encoding || 'base64'),
              input_file.filename || 'input.txt',
              'text/plain'
            );
          } catch (err) {
            console.error('Error uploading input file:', err);
          }
        }

        if (expected_file && expected_file.data) {
          try {
            expected_path = await uploadBufferToS3(
              Buffer.from(expected_file.data, expected_file.encoding || 'base64'),
              expected_file.filename || 'expected.txt',
              'text/plain'
            );
          } catch (err) {
            console.error('Error uploading expected file:', err);
          }
        }

        const tcQ = `INSERT INTO code_question_testcases 
                     (question_id, is_sample, input_text, expected_text, input_path, expected_path)
                     VALUES ($1, $2, $3, $4, $5, $6)`;
        await pool.query(tcQ, [
          id,
          is_sample || false,
          input_text || null,
          expected_text || null,
          input_path || null,
          expected_path || null
        ]);
      }
    }

    res.json(updateR.rows[0]);
  } catch (err) {
    console.error('Error updating code question:', err);
    res.status(500).json({ error: err.message || 'Failed to update code question' });
  }
}

// Delete a code question
export async function deleteCodeQuestion(req, res) {
  try {
    const { id } = req.params;

    // Check if question exists and user has permission
    const checkQ = `SELECT created_by FROM code_questions WHERE id = $1`;
    const checkR = await pool.query(checkQ, [id]);
    
    if (checkR.rows.length === 0) {
      return res.status(404).json({ error: 'Code question not found' });
    }

    // Only creator or admin can delete
    if (req.user.role !== 'admin' && req.user.id !== checkR.rows[0].created_by) {
      return res.status(403).json({ error: 'Not authorized to delete this question' });
    }

    // Delete question (cascade will delete test cases)
    await pool.query(`DELETE FROM code_questions WHERE id = $1`, [id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting code question:', err);
    res.status(500).json({ error: err.message || 'Failed to delete code question' });
  }
}

