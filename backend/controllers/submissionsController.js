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
  try {
    const { assignment_id, language, code, question_id } = req.body;
    const student_id = Number(req.user?.id);
    if (!assignment_id || !student_id || !language || !code) {
      return res.status(400).json({ error: 'Missing required fields: assignment_id, language, code' });
    }

    // Check if assignment exists and get its type
    const assignmentCheck = await pool.query(
      `SELECT id, assignment_type, allow_multiple_submissions FROM assignments WHERE id = $1`,
      [assignment_id]
    );
    if (assignmentCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentCheck.rows[0];

    // Get or create submission
    let submission;
    if (assignment.allow_multiple_submissions) {
      // Create new submission for each attempt
      const q = `INSERT INTO assignment_submissions (assignment_id, student_id, attempt)
                 VALUES ($1, $2, (SELECT COALESCE(MAX(attempt), 0) + 1 FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2))
                 RETURNING *`;
      const r = await pool.query(q, [assignment_id, student_id]);
      submission = r.rows[0];
    } else {
      // Check if submission already exists
      const existingQ = `SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2`;
      const existingR = await pool.query(existingQ, [assignment_id, student_id]);
      
      if (existingR.rowCount > 0) {
        submission = existingR.rows[0];
      } else {
        const q = `INSERT INTO assignment_submissions (assignment_id, student_id, attempt)
                   VALUES ($1, $2, 1) RETURNING *`;
        const r = await pool.query(q, [assignment_id, student_id]);
        submission = r.rows[0];
      }
    }

    // Get assignment_question_id if question_id is provided
    let assignment_question_id = null;
    if (question_id) {
      const aqQ = `SELECT id FROM assignment_questions WHERE assignment_id = $1 AND question_id = $2`;
      const aqR = await pool.query(aqQ, [assignment_id, question_id]);
      if (aqR.rowCount > 0) {
        assignment_question_id = aqR.rows[0].id;
      }
    }

    // Check if code submission already exists for this submission and question
    let codeSubmission;
    const existingCodeQ = `SELECT * FROM code_submissions WHERE submission_id = $1 AND (assignment_question_id = $2 OR ($2 IS NULL AND assignment_question_id IS NULL))`;
    const existingCodeR = await pool.query(existingCodeQ, [submission.id, assignment_question_id]);
    
    if (existingCodeR.rowCount > 0) {
      // Update existing code submission
      const updateQ = `UPDATE code_submissions SET language = $1, code = $2, created_at = now() WHERE id = $3 RETURNING *`;
      const updateR = await pool.query(updateQ, [language, code, existingCodeR.rows[0].id]);
      codeSubmission = updateR.rows[0];
    } else {
      // Insert new code submission
      const codeSubQ = `INSERT INTO code_submissions (submission_id, language, code, assignment_question_id) VALUES ($1, $2, $3, $4) RETURNING *`;
      const codeSubR = await pool.query(codeSubQ, [submission.id, language, code, assignment_question_id]);
      codeSubmission = codeSubR.rows[0];
    }

    // If question_id is provided, run test cases using Judge0
    let testResults = null;
    if (question_id) {
      try {
        const { executeCode } = await import('./judgeController.js');
        // Get ALL test cases for this question (not just one)
        const testCaseQ = `
          SELECT id, input_text, expected_text, input_path, expected_path, is_sample
          FROM code_question_testcases
          WHERE question_id = $1 AND is_sample = false
          ORDER BY id
        `;
        const testCaseR = await pool.query(testCaseQ, [question_id]);
        
        // Run test cases and collect results
        const testCaseResults = [];
        
        for (const testCase of testCaseR.rows) {
          const stdin = testCase.input_text || '';
          const expectedOutput = testCase.expected_text || '';
          
          // Log for debugging
          console.log(`Running test case ${testCase.id} with stdin: "${stdin}", expected: "${expectedOutput}"`);
          
          // Skip test cases with no input (some test cases might not need input)
          // But for most cases, we need input
          if (stdin === '' && testCase.input_path === null) {
            console.warn(`Test case ${testCase.id} has no input_text or input_path, skipping`);
            continue;
          }

          // Create a mock request/response for executeCode
          // Don't pass question_id to avoid re-fetching test case - stdin is already provided
          const mockReq = {
            body: {
              source_code: code,
              language: language,
              stdin: stdin, // Pass stdin directly - already fetched from test case
              question_id: null // Don't pass question_id to avoid double-fetching
            }
          };
          const mockRes = {
            json: (data) => {
              testResults = data;
            },
            status: (code) => ({
              json: (data) => {
                testResults = { error: data.error || 'Test execution failed' };
              }
            })
          };

          // Execute code (this will run synchronously)
          await executeCode(mockReq, mockRes);

          // Update code_submission with test results
          if (testResults && !testResults.error) {
            const passed = testResults.passed !== null ? testResults.passed : 
                          (testResults.stdout && expectedOutput && 
                           testResults.stdout.trim() === expectedOutput.trim());
            
            // Store summary in code_submissions
            await pool.query(
              `UPDATE code_submissions 
               SET test_results = $1, run_output = $2 
               WHERE id = $3`,
              [
                JSON.stringify({
                  passed,
                  stdout: testResults.stdout,
                  stderr: testResults.stderr,
                  status: testResults.status,
                  execution_time: testResults.time,
                  memory: testResults.memory
                }),
                testResults.stdout || '',
                codeSubmission.id
              ]
            );

            // Store detailed result in code_submission_results if testcase exists
            if (testCaseR.rows.length > 0) {
              const testcaseId = testCaseR.rows[0].id;
              // Use code_testcase_id column (added by migration) to reference code_question_testcases
              await pool.query(
                `INSERT INTO code_submission_results 
                 (code_submission_id, code_testcase_id, passed, student_output, error_output, execution_time_ms)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (code_submission_id, code_testcase_id) 
                 DO UPDATE SET 
                   passed = EXCLUDED.passed,
                   student_output = EXCLUDED.student_output,
                   error_output = EXCLUDED.error_output,
                   execution_time_ms = EXCLUDED.execution_time_ms,
                   created_at = now()`,
                [
                  codeSubmission.id,
                  testcaseId,
                  passed,
                  testResults.stdout || '',
                  testResults.stderr || testResults.compile_output || '',
                  testResults.time ? Math.round(testResults.time * 1000) : null
                ]
              );
            }

            // If test passes, auto-grade (optional - you can enable this)
            if (passed && assignment_question_id) {
              // Get points for this question
              const pointsQ = `SELECT points FROM assignment_questions WHERE id = $1`;
              const pointsR = await pool.query(pointsQ, [assignment_question_id]);
              if (pointsR.rowCount > 0) {
                const points = pointsR.rows[0].points;
                // Optionally update submission score automatically
                // await pool.query(
                //   `UPDATE assignment_submissions SET final_score = COALESCE(final_score, 0) + $1 WHERE id = $2`,
                //   [points, submission.id]
                // );
              }
            }
          }
        }
      } catch (judgeErr) {
        console.error('Error running test cases:', judgeErr);
        // Don't fail the submission if test execution fails
      }
    }

    res.json({ 
      submission,
      code_submission: codeSubmission,
      test_results: testResults
    });
  } catch (err) {
    console.error('Error submitting code assignment:', err);
    res.status(500).json({ error: err.message || 'Failed to submit code assignment' });
  }
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

    // Fetch code submissions with question_id from assignment_questions
    const codeQ = `
      SELECT cs.*, aq.question_id
      FROM code_submissions cs
      LEFT JOIN assignment_questions aq ON cs.assignment_question_id = aq.id
      WHERE cs.submission_id = $1
    `;
    const codeR = await pool.query(codeQ, [submissionId]);

    const gradesQ = `SELECT * FROM submission_grades WHERE submission_id = $1 ORDER BY created_at DESC`;
    const gradesR = await pool.query(gradesQ, [submissionId]);

    // Fetch test case results for each code submission
    const codeWithTestResults = await Promise.all(
      (codeR.rows || []).map(async (codeSub) => {
        // Get test case results for this code submission
        const testResultsQ = `
          SELECT 
            csr.*,
            cqt.input_text,
            cqt.expected_text,
            cqt.is_sample
          FROM code_submission_results csr
          LEFT JOIN code_question_testcases cqt ON csr.code_testcase_id = cqt.id
          WHERE csr.code_submission_id = $1
          ORDER BY csr.created_at ASC
        `;
        const testResultsR = await pool.query(testResultsQ, [codeSub.id]);
        
        return {
          ...codeSub,
          test_case_results: testResultsR.rows || [],
          // Parse test_results JSONB if it exists
          test_results: codeSub.test_results ? (typeof codeSub.test_results === 'string' ? JSON.parse(codeSub.test_results) : codeSub.test_results) : null
        };
      })
    );

    const result = Object.assign({}, submission, {
      files: filesR.rows || [],
      code: codeWithTestResults,
      grades: gradesR.rows || []
    });

    return res.json({ submission: result });
  } catch (err) {
    console.error('getSubmissionById error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
