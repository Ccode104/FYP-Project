import { pool } from '../db/index.js';
import {
  calculateGamifiedScore,
  updateUserGamificationStats,
  checkAndUnlockAchievements,
  updateLeaderboards,
} from '../utils/gamification.js';
import { runPlagiarismCheck } from '../utils/plagiarism.js';
import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';
import { getAuthenticatedClient } from './googleController.js';
import { Readable } from 'stream';
import archiver from 'archiver';

/**
 * Upload files to Google Drive and grant teacher access
 * @param {Array} files - Array of multer file objects
 * @param {number} studentId - Student ID
 * @param {number} assignmentId - Assignment ID
 * @param {string} teacherEmail - Teacher's email to grant access
 * @returns {Promise<{driveUrl: string, driveFileId: string}> - Drive URL and file ID
 */
async function uploadToGoogleDrive(files, studentId, assignmentId, teacherEmail) {
  const auth = await getAuthenticatedClient(studentId);
  const drive = google.drive({ version: 'v3', auth });

  const folderName = `FYP_Submission_Assignment_${assignmentId}_Student_${studentId}`;
  let folderId;

  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: 'id',
  });
  folderId = folder.data.id;

  let driveFileUrl = `https://drive.google.com/drive/folders/${folderId}`;
  let driveFileId = folderId;
  const uploadedFilesData = [];

  for (const file of files) {
    const fileMetadata = {
      name: file.originalname,
      parents: [folderId],
    };

    const media = {
      mimeType: file.mimetype,
      body: Readable.from(file.buffer),
    };

    const uploadedFile = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    if (uploadedFile.data.webViewLink) {
      driveFileUrl = uploadedFile.data.webViewLink;
      driveFileId = uploadedFile.data.id;
    }

    uploadedFilesData.push({
      originalname: file.originalname,
      fileId: uploadedFile.data.id,
      webViewLink: uploadedFile.data.webViewLink,
      webContentLink: uploadedFile.data.webContentLink,
    });

    if (teacherEmail) {
      try {
        await drive.permissions.create({
          fileId: uploadedFile.data.id,
          requestBody: {
            type: 'user',
            role: 'writer',
            emailAddress: teacherEmail,
          },
        });
      } catch (permError) {
        console.error('[DEBUG] Failed to grant teacher permission:', permError.message);
      }
    }

    try {
      await drive.permissions.create({
        fileId: uploadedFile.data.id,
        requestBody: {
          type: 'anyone',
          role: 'reader',
        },
      });
    } catch (publicError) {
      console.error('[DEBUG] Failed to make file public:', publicError.message);
    }
  }

  return { driveUrl: driveFileUrl, driveFileId, files: uploadedFilesData };
}



async function getOrCreateSingleAssignmentSubmission(db, assignmentId, studentId, comments = null) {
  const existingResult = await db.query(
    `SELECT *
     FROM assignment_submissions
     WHERE assignment_id = $1 AND student_id = $2
     ORDER BY submitted_at DESC NULLS LAST, id DESC
     LIMIT 1`,
    [assignmentId, studentId]
  );

  if (existingResult.rowCount > 0) {
    const updated = await db.query(
      `UPDATE assignment_submissions
       SET submitted_at = NOW(),
           status = 'submitted',
           comments = COALESCE($2::text, comments),
           attempt = 1
       WHERE id = $1::int
       RETURNING *`,
      [existingResult.rows[0].id, comments]
    );
    return updated.rows[0];
  }

  const inserted = await db.query(
    `INSERT INTO assignment_submissions (assignment_id, student_id, comments, submitted_at, status, attempt)
     VALUES ($1::int, $2::int, $3::text, NOW(), 'submitted', 1)
     RETURNING *`,
    [assignmentId, studentId, comments]
  );
  return inserted.rows[0];
}

async function clearSubmissionArtifacts(db, submissionId) {
  const cleanupStatements = [
    'DELETE FROM submission_files WHERE submission_id = $1',
    'DELETE FROM file_submissions WHERE submission_id = $1',
    'DELETE FROM github_submissions WHERE submission_id = $1',
    'DELETE FROM mixed_submissions WHERE submission_id = $1',
  ];

  for (const statement of cleanupStatements) {
    try {
      await db.query(statement, [submissionId]);
    } catch (error) {
      if (!String(error.message || '').includes('does not exist')) {
        throw error;
      }
    }
  }
}

export async function submitFileAssignment(req, res) {
  const assignment_id = Number(req.body.assignment_id);
  const student_id = Number(req.user?.id || req.body.student_id);
  if (!assignment_id || !student_id) {
    return res.status(400).json({ error: 'Missing' });
  }

  try {
    // Check if assignment allows multiple submissions and get GitHub repo option and file size limit
    const assignmentCheck = await pool.query(
      'SELECT allow_multiple_submissions, allow_github_repo, file_size_limit_mb FROM assignments WHERE id = $1',
      [assignment_id]
    );
    if (assignmentCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentCheck.rows[0];
    console.log(
      `[DEBUG] submitFileAssignment: allow_github_repo=${assignment.allow_github_repo}, allow_multiple=${assignment.allow_multiple_submissions}`
    );

    // Check file size limit
    const uploadedFiles = req.files || [];
    if (assignment.file_size_limit_mb && uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > assignment.file_size_limit_mb) {
          return res.status(400).json({
            error: `File "${file.originalname}" size (${fileSizeMB.toFixed(2)} MB) exceeds the limit of ${assignment.file_size_limit_mb} MB`,
          });
        }
      }
    }
    const submission = await getOrCreateSingleAssignmentSubmission(pool, assignment_id, student_id);
    await clearSubmissionArtifacts(pool, submission.id);

    const files = req.files || [];

    if (files.length > 0) {
      try {
        const driveResults = await uploadToGoogleDrive(files, student_id, assignment_id);
        
        if (driveResults.driveUrl) {
          await pool.query(
            `INSERT INTO file_submissions (submission_id, zip_file_url, submission_type) VALUES ($1, $2, $3)`,
            [submission.id, driveResults.driveUrl, 'file']
          );
        }

        for (const fileData of driveResults.files) {
          const originalFile = files.find(f => f.originalname === fileData.originalname);
          const url = `gdrive://${fileData.fileId}`;
          await pool.query(
            `INSERT INTO submission_files (submission_id, storage_path, filename, file_size, mime_type)
                             VALUES ($1,$2,$3,$4,$5)`,
            [submission.id, url, fileData.originalname, originalFile?.size || 0, originalFile?.mimetype || '']
          );
        }
      } catch (err) {
        console.error('Failed to upload files to Google Drive:', err);
        if (err.message === 'Google not connected') {
          return res.status(403).json({ error: 'Please connect Google Drive to submit files.' });
        }
        return res.status(500).json({ error: 'Failed to upload files to Google Drive.' });
      }
    }

    // Run plagiarism check asynchronously (don't block response)
    runPlagiarismCheck(assignment_id).catch(err => {
      console.error('File plagiarism check failed:', err);
    });

    res.json({ submission });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit' });
  }
}

export async function submitMixedAssignment(req, res) {
  try {
    const assignmentId = req.body.assignmentId || req.body.assignment_id;
    const { content, uploadToDrive } = req.body;
    const student_id = Number(req.user?.id);
    const shouldUploadToDrive = uploadToDrive === 'true';

    console.log(
      `[DEBUG] submitMixedAssignment: received assignmentId="${assignmentId}" (type: ${typeof assignmentId}), uploadToDrive=${shouldUploadToDrive}`
    );

    if (!assignmentId || !student_id) {
      return res.status(400).json({ error: 'Missing required field: assignmentId or assignment_id' });
    }

    const assignment_id = parseInt(assignmentId);

    if (isNaN(assignment_id) || assignment_id <= 0) {
      console.log(
        `[DEBUG] submitMixedAssignment: Invalid assignmentId="${assignmentId}", parsed as ${assignment_id}`
      );
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }

    const assignmentCheck = await pool.query(
      'SELECT id, assignment_type, allow_multiple_submissions, course_offering_id FROM assignments WHERE id = $1',
      [assignment_id]
    );
    if (assignmentCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentCheck.rows[0];

    const submission = await getOrCreateSingleAssignmentSubmission(
      pool,
      assignment_id,
      student_id,
      content?.trim() || null
    );

    // Selective cleanup: keep files that are explicitly mentioned
    const existingFileIds = req.body.existingFileIds
      ? (Array.isArray(req.body.existingFileIds) ? req.body.existingFileIds : [req.body.existingFileIds])
      : [];

    if (existingFileIds.length > 0) {
      await pool.query(
        'DELETE FROM submission_files WHERE submission_id = $1 AND id NOT IN (SELECT unnest($2::int[]))',
        [submission.id, existingFileIds.map(id => parseInt(id))]
      );
    } else {
      await pool.query('DELETE FROM submission_files WHERE submission_id = $1', [submission.id]);
    }

    // Clear other artifacts that are usually re-created or not needed
    await pool.query('DELETE FROM file_submissions WHERE submission_id = $1', [submission.id]);
    await pool.query('DELETE FROM github_submissions WHERE submission_id = $1', [submission.id]);

    if (content && content.trim()) {
      await pool.query('UPDATE assignment_submissions SET content = $1 WHERE id = $2', [
        content.trim(),
        submission.id,
      ]);
    }

    const files = req.files || [];
    let driveUrl = null;
    let driveFileId = null;

    if (files.length > 0) {
      try {
        const courseOfferingQ = `
          SELECT o.faculty_id, u.email as teacher_email
          FROM course_offerings o
          JOIN users u ON o.faculty_id = u.id
          WHERE o.id = $1
        `;
        const courseOfferingR = await pool.query(courseOfferingQ, [
          assignment.course_offering_id,
        ]);

        const teacherEmail = courseOfferingR.rows[0]?.teacher_email || null;
        
        const driveResults = await uploadToGoogleDrive(files, student_id, assignment_id, teacherEmail);
        driveUrl = driveResults.driveUrl;
        driveFileId = driveResults.driveFileId;

        await pool.query(
          `UPDATE assignment_submissions SET drive_url = $1, drive_file_id = $2 WHERE id = $3`,
          [driveUrl, driveFileId, submission.id]
        );

        if (driveUrl) {
          await pool.query(
            `INSERT INTO file_submissions (submission_id, zip_file_url, submission_type) VALUES ($1, $2, $3)`,
            [submission.id, driveUrl, 'mixed']
          );
        }

        for (const fileData of driveResults.files) {
          const originalFile = files.find(f => f.originalname === fileData.originalname);
          const url = `gdrive://${fileData.fileId}`;
          await pool.query(
            `INSERT INTO submission_files (submission_id, storage_path, filename, file_size, mime_type)
                             VALUES ($1,$2,$3,$4,$5)`,
            [submission.id, url, fileData.originalname, originalFile?.size || 0, originalFile?.mimetype || '']
          );
        }

        console.log(`[DEBUG] submitMixedAssignment: Drive upload successful, url=${driveUrl}`);
      } catch (err) {
        console.error('Failed to upload files to Google Drive:', err);
        if (err.message === 'Google not connected') {
          return res.status(403).json({ error: 'Please connect Google Drive to submit files.' });
        }
        return res.status(500).json({ error: 'Failed to upload files to Google Drive.' });
      }
    }

    runPlagiarismCheck(assignment_id).catch(err => {
      console.error('File plagiarism check failed:', err);
    });

    res.json({ submission, filesCount: files.length, driveUrl, driveFileId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit mixed assignment' });
  }
}

function getMimeTypeByFilename(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py':
      return 'text/x-python';
    case 'java':
      return 'text/x-java-source';
    case 'js':
      return 'application/javascript';
    case 'ts':
      return 'application/typescript';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'h':
      return 'text/x-c++src';
    case 'c':
      return 'text/x-csrc';
    case 'json':
      return 'application/json';
    case 'md':
      return 'text/markdown';
    case 'html':
      return 'text/html';
    case 'css':
      return 'text/css';
    case 'txt':
      return 'text/plain';
    default:
      return 'text/plain';
  }
}

export async function submitCodeAssignment(req, res) {
  try {
    const {
      assignment_id,
      language,
      code,
      question_id,
      started_at,
      time_spent_seconds,
      repo_link,
    } = req.body;
    const student_id = Number(req.user?.id);
    if (!assignment_id || !student_id || (!code && !repo_link)) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: assignment_id and either code or repo_link' });
    }

    // Check if assignment exists and get its type
    const assignmentCheck = await pool.query(
      'SELECT id, assignment_type, allow_multiple_submissions, course_offering_id FROM assignments WHERE id = $1',
      [assignment_id]
    );
    if (assignmentCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentCheck.rows[0];

    // Get or create submission
    const submission = await getOrCreateSingleAssignmentSubmission(pool, assignment_id, student_id);

    // Get assignment_question_id if question_id is provided
    let assignment_question_id = null;
    if (question_id) {
      const aqQ =
        'SELECT id FROM assignment_questions WHERE assignment_id = $1 AND question_id = $2';
      const aqR = await pool.query(aqQ, [assignment_id, question_id]);
      if (aqR.rowCount > 0) {
        assignment_question_id = aqR.rows[0].id;
      }
    }

    // Check if code submission already exists for this submission and question
    let codeSubmission;
    const existingCodeQ =
      'SELECT * FROM code_submissions WHERE submission_id = $1::int AND (assignment_question_id = $2::int OR ($2::int IS NULL AND assignment_question_id IS NULL))';
    const existingCodeR = await pool.query(existingCodeQ, [submission.id, assignment_question_id]);

    if (existingCodeR.rowCount > 0) {
      // Update existing code submission
      const updateQ =
        'UPDATE code_submissions SET language = $1, code = $2, repo_link = $3, created_at = now() WHERE id = $4 RETURNING *';
      const updateR = await pool.query(updateQ, [
        language || existingCodeR.rows[0].language,
        code || existingCodeR.rows[0].code,
        repo_link || existingCodeR.rows[0].repo_link,
        existingCodeR.rows[0].id,
      ]);
      codeSubmission = updateR.rows[0];
    } else {
      // Insert new code submission
      const codeSubQ =
        'INSERT INTO code_submissions (submission_id, language, code, repo_link, assignment_question_id) VALUES ($1, $2, $3, $4, $5) RETURNING *';
      const codeSubR = await pool.query(codeSubQ, [
        submission.id,
        language || null,
        code || null,
        repo_link || null,
        assignment_question_id,
      ]);
      codeSubmission = codeSubR.rows[0];
    }

    if (repo_link) {
      try {
        await pool.query(
          'DELETE FROM submission_files WHERE submission_id = $1 AND storage_path LIKE $2',
          [submission.id, '%github.com/%']
        );
      } catch (deleteErr) {
        console.warn('Failed to remove old GitHub file links for submission', deleteErr);
      }

      const filename = repo_link.split('/').pop() || 'github-file';
      const mimeType = getMimeTypeByFilename(filename);
      await pool.query(
        'INSERT INTO submission_files (submission_id, storage_path, filename, mime_type) VALUES ($1, $2, $3, $4)',
        [submission.id, repo_link, filename, mimeType]
      );
    }

    // Get question difficulty for gamification
    let questionDifficulty = 'medium';
    if (question_id) {
      const questionQ = await pool.query('SELECT difficulty FROM code_questions WHERE id = $1', [
        question_id,
      ]);
      if (questionQ.rowCount > 0) {
        questionDifficulty = questionQ.rows[0].difficulty || 'medium';
      }
    }

    // Initialize gamification data
    let allTestsPassed = false;
    let totalExecutionTime = 0;
    let totalMemoryUsed = 0;
    let testCaseCount = 0;

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
        let passedTests = 0;

        for (const testCase of testCaseR.rows) {
          const stdin = testCase.input_text || '';
          const expectedOutput = testCase.expected_text || '';

          // Log for debugging
          console.log(
            `Running test case ${testCase.id} with stdin: "${stdin}", expected: "${expectedOutput}"`
          );

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
              question_id: null, // Don't pass question_id to avoid double-fetching
            },
          };
          const mockRes = {
            json: data => {
              testResults = data;
            },
            // eslint-disable-next-line no-unused-vars
            status: _code => ({
              json: data => {
                testResults = { error: data.error || 'Test execution failed' };
              },
            }),
          };

          // Execute code (this will run synchronously)
          await executeCode(mockReq, mockRes);

          testCaseCount++;

          // Update code_submission with test results
          if (testResults && !testResults.error) {
            const passed =
              testResults.passed !== null
                ? testResults.passed
                : (testResults.stdout || '').trim() === (expectedOutput || '').trim();

            if (passed) {
              passedTests++;
            }

            // Accumulate execution metrics
            if (testResults.time) {
              totalExecutionTime += testResults.time;
            }
            if (testResults.memory) {
              totalMemoryUsed = Math.max(totalMemoryUsed, testResults.memory);
            }

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
                  memory: testResults.memory,
                }),
                testResults.stdout || '',
                codeSubmission.id,
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
                  testResults.time ? Math.round(testResults.time * 1000) : null,
                ]
              );
            }
          }
        }

        // Check if all tests passed
        allTestsPassed = testCaseCount > 0 && passedTests === testCaseCount;
      } catch (judgeErr) {
        console.error('Error running test cases:', judgeErr);
        // Don't fail the submission if test execution fails
      }
    }

    // Calculate gamified score
    const timeSpent = time_spent_seconds || 0;
    const scoreData = calculateGamifiedScore({
      allTestsPassed,
      timeSpentSeconds: timeSpent,
      difficulty: questionDifficulty,
      attempts: submission.attempt || 1,
      codeLength: code.length,
      executionTime: totalExecutionTime,
      memoryUsed: totalMemoryUsed,
    });

    // Update code submission with gamification data
    const completedAt = started_at
      ? new Date(Date.parse(started_at) + timeSpent * 1000)
      : new Date();
    await pool.query(
      `UPDATE code_submissions SET
        started_at = $1,
        completed_at = $2,
        time_spent_seconds = $3,
        gamified_score = $4,
        attempts_count = $5,
        efficiency_score = $6
      WHERE id = $7`,
      [
        started_at || completedAt.toISOString(),
        completedAt.toISOString(),
        timeSpent,
        scoreData.totalScore,
        submission.attempt || 1,
        scoreData.efficiencyBonus,
        codeSubmission.id,
      ]
    );

    // Update user gamification stats
    let isFirstSolve = false;
    if (question_id && allTestsPassed) {
      // Check if this is the first time solving this question
      const previousSolve = await pool.query(
        `SELECT 1 FROM code_submissions cs
         JOIN assignment_submissions ass ON cs.submission_id = ass.id
         WHERE cs.assignment_question_id IS NOT NULL
         AND ass.student_id = $1
         AND cs.id != $2
         AND EXISTS (
           SELECT 1 FROM assignment_questions aq
           WHERE aq.id = cs.assignment_question_id
           AND aq.question_id = $3
         )
         AND (cs.test_results->>'passed')::boolean = true`,
        [student_id, codeSubmission.id, question_id]
      );
      isFirstSolve = previousSolve.rowCount === 0;
    }

    const updatedStats = await updateUserGamificationStats(
      student_id,
      scoreData,
      isFirstSolve,
      questionDifficulty
    );

    // Check for achievements
    const unlockedAchievements = await checkAndUnlockAchievements(student_id, updatedStats, {
      totalScore: scoreData.totalScore,
      timeSpentSeconds: timeSpent,
    });

    // Update leaderboards
    if (scoreData.totalScore > 0) {
      await updateLeaderboards(
        student_id,
        assignment_id,
        assignment.course_offering_id,
        scoreData.totalScore,
        timeSpent
      );
    }

    // Run plagiarism check asynchronously (don't block response)
    runPlagiarismCheck(assignment_id).catch(err => {
      console.error('Plagiarism check failed:', err);
    });

    res.json({
      submission,
      code_submission: {
        ...codeSubmission,
        gamified_score: scoreData.totalScore,
        score_breakdown: scoreData.breakdown,
      },
      test_results: testResults,
      gamification: {
        score: scoreData.totalScore,
        breakdown: scoreData.breakdown,
        user_stats: updatedStats,
        unlocked_achievements: unlockedAchievements,
        all_tests_passed: allTestsPassed,
      },
    });
  } catch (err) {
    console.error('Error submitting code assignment:', err);
    res.status(500).json({ error: err.message || 'Failed to submit code assignment' });
  }
}

export async function submitLinkAssignment(req, res) {
  const assignment_id = Number(req.body.assignment_id);
  const url = String(req.body.url || '');
  const student_id = Number(req.user?.id);
  if (!assignment_id || !student_id || !url) {
    return res.status(400).json({ error: 'Missing' });
  }
  try {
    const submission = await getOrCreateSingleAssignmentSubmission(pool, assignment_id, student_id);
    await clearSubmissionArtifacts(pool, submission.id);
    const filename = url.split('/').pop() || url;
    await pool.query(
      'INSERT INTO submission_files (submission_id, storage_path, filename) VALUES ($1,$2,$3)',
      [submission.id, url, filename]
    );

    // Also insert into file_submissions for consistency
    await pool.query(
      'INSERT INTO file_submissions (submission_id, submission_type) VALUES ($1, $2)',
      [submission.id, 'link']
    );

    res.json({ submission });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit link' });
  }
}

export async function submitGitHubRepoAssignment(req, res) {
  const { assignment_id, repo_url } = req.body;
  const student_id = Number(req.user?.id);

  if (!assignment_id || !student_id || !repo_url) {
    return res.status(400).json({ error: 'Missing required fields: assignment_id, repo_url' });
  }

  try {
    // Validate GitHub repository URL format
    const repoUrlRegex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/.*)?$/;
    const match = repo_url.match(repoUrlRegex);
    if (!match) {
      return res.status(400).json({ error: 'Invalid GitHub repository URL format' });
    }

    const [, owner, repo] = match;

    // Get user's GitHub access token
    const userQuery = await pool.query(
      'SELECT github_access_token, github_token_expires_at FROM users WHERE id = $1',
      [student_id]
    );

    if (userQuery.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userQuery.rows[0];

    if (!user.github_access_token) {
      return res
        .status(400)
        .json({ error: 'GitHub not connected. Please connect your GitHub account first.' });
    }

    // Check if token is expired
    if (user.github_token_expires_at && new Date(user.github_token_expires_at) < new Date()) {
      return res
        .status(401)
        .json({ error: 'GitHub token expired. Please reconnect your GitHub account.' });
    }

    // Validate token
    const { validateGitHubToken } = await import('../utils/github.js');
    const isValid = await validateGitHubToken(user.github_access_token);
    if (!isValid) {
      return res
        .status(401)
        .json({ error: 'Invalid GitHub token. Please reconnect your GitHub account.' });
    }

    // Fetch repository details from GitHub API
    const { createGitHubClient } = await import('../utils/github.js');
    const octokit = createGitHubClient(user.github_access_token);

    let repoData;
    try {
      const response = await octokit.repos.get({
        owner,
        repo,
      });
      repoData = response.data;
    } catch (error) {
      if (error.status === 404) {
        return res
          .status(404)
          .json({ error: 'Repository not found or you do not have access to it' });
      }
      if (error.status === 403) {
        return res.status(403).json({ error: 'Access denied to repository' });
      }
      throw error;
    }

    // Check if assignment exists
    const assignmentCheck = await pool.query(
      'SELECT id, allow_github_repo, allow_multiple_submissions FROM assignments WHERE id = $1',
      [assignment_id]
    );
    if (assignmentCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentCheck.rows[0];
    console.log(
      `[DEBUG] submitGitHubRepoAssignment: allow_github_repo=${assignment.allow_github_repo}, allow_multiple=${assignment.allow_multiple_submissions}`
    );

    // Get or create submission
    const submission = await getOrCreateSingleAssignmentSubmission(pool, assignment_id, student_id);
    console.log(`[DEBUG] submitGitHubRepoAssignment: Using canonical submission id=${submission.id}`);

    // Insert GitHub submission data - check if exists first
    const checkExisting = await pool.query(
      'SELECT id FROM github_submissions WHERE submission_id = $1',
      [submission.id]
    );

    if (checkExisting.rows.length > 0) {
      // Update existing
      await pool.query(
        `UPDATE github_submissions SET
          repo_url = $1, repo_name = $2, repo_description = $3, repo_language = $4,
          repo_private = $5, repo_stars = $6, repo_forks = $7, repo_created_at = $8,
          repo_updated_at = $9, repo_default_branch = $10, repo_size_kb = $11
        WHERE submission_id = $12`,
        [
          repoData.html_url,
          repoData.name,
          repoData.description,
          repoData.language,
          repoData.private,
          repoData.stargazers_count,
          repoData.forks_count,
          repoData.created_at,
          repoData.updated_at,
          repoData.default_branch,
          Math.ceil(repoData.size / 1024),
          submission.id,
        ]
      );
    } else {
      // Insert new
      await pool.query(
        `INSERT INTO github_submissions (
          submission_id, repo_url, repo_name, repo_description, repo_language,
          repo_private, repo_stars, repo_forks, repo_created_at, repo_updated_at,
          repo_default_branch, repo_size_kb
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          submission.id,
          repoData.html_url,
          repoData.name,
          repoData.description,
          repoData.language,
          repoData.private,
          repoData.stargazers_count,
          repoData.forks_count,
          repoData.created_at,
          repoData.updated_at,
          repoData.default_branch,
          Math.ceil(repoData.size / 1024),
        ]
      );
    }

    // Run plagiarism check asynchronously (don't block response)
    const { runPlagiarismCheck } = await import('../utils/plagiarism.js');
    runPlagiarismCheck(assignment_id).catch(err => {
      console.error('GitHub repository plagiarism check failed:', err);
    });

    res.json({
      submission,
      repository: {
        name: repoData.name,
        full_name: repoData.full_name,
        description: repoData.description,
        html_url: repoData.html_url,
        language: repoData.language,
        private: repoData.private,
        stargazers_count: repoData.stargazers_count,
        forks_count: repoData.forks_count,
        created_at: repoData.created_at,
        updated_at: repoData.updated_at,
        default_branch: repoData.default_branch,
        size_kb: Math.ceil(repoData.size / 1024),
      },
    });
  } catch (err) {
    console.error('Error submitting GitHub repository assignment:', err);
    res.status(500).json({ error: err.message || 'Failed to submit GitHub repository assignment' });
  }
}

export async function gradeSubmission(req, res) {
  const { submission_id, score, feedback, rubricGrades, overall_feedback } = req.body;
  const grader_id = req.user?.id;
  if (
    !submission_id ||
    (score === undefined && !(Array.isArray(rubricGrades) && rubricGrades.length > 0))
  ) {
    return res.status(400).json({ error: 'Missing submission_id or grading data' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let finalScore = score;
    const comments = feedback || overall_feedback || null;

    if (Array.isArray(rubricGrades) && rubricGrades.length > 0) {
      for (const grade of rubricGrades) {
        await client.query(
          `
          INSERT INTO rubric_grades (submission_id, criterion_id, score, feedback, graded_by, graded_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (submission_id, criterion_id)
          DO UPDATE SET score = EXCLUDED.score, feedback = EXCLUDED.feedback, graded_by = EXCLUDED.graded_by, graded_at = NOW()
        `,
          [submission_id, grade.criterionId, grade.score, grade.feedback || null, grader_id]
        );
      }

      const totalResult = await client.query(
        `
        SELECT COALESCE(SUM(score), 0) AS total_score
        FROM rubric_grades
        WHERE submission_id = $1
      `,
        [submission_id]
      );

      finalScore = parseFloat(totalResult.rows[0]?.total_score) || 0;
    }

    if (finalScore === undefined) {
      finalScore = 0;
    }

    await client.query(
      'INSERT INTO submission_grades (submission_id, grader_id, score, feedback) VALUES ($1,$2,$3,$4)',
      [submission_id, grader_id, finalScore, comments]
    );

    await client.query(
      "UPDATE assignment_submissions SET final_score=$1, grader_id=$2, graded_at=now(), status='graded' WHERE id=$3",
      [finalScore, grader_id, submission_id]
    );

    await client.query('COMMIT');
    res.json({ success: true, score: finalScore });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error grading submission:', err);
    res.status(500).json({ error: err.message || 'Failed to grade submission' });
  } finally {
    client.release();
  }
}

export async function getSubmissionById(req, res) {
  try {
    const submissionId = Number(req.params.submissionId || req.params.id);
    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submission id' });
    }

    // Fetch submission with assignment and offering info
    const q = `
      SELECT s.*, a.id AS assignment_id, a.title AS assignment_title, a.description AS assignment_description,
             a.due_at, a.max_score AS total_points, a.allow_multiple_submissions, a.assignment_type,
             a.submission_requirements, a.grading_config, a.course_offering_id, o.faculty_id,
             u.name as student_name, u.email as student_email
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN course_offerings o ON a.course_offering_id = o.id
      JOIN users u ON s.student_id = u.id
      WHERE s.id = $1
      LIMIT 1
    `;
    const r = await pool.query(q, [submissionId]);
    if (r.rowCount === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = r.rows[0];
    console.log(
      `[DEBUG] getSubmissionById: submission id=${submission.id}, assignment_type=${submission.assignment_type}`
    );

    if (
      submission.submission_requirements &&
      typeof submission.submission_requirements === 'string'
    ) {
      try {
        submission.submission_requirements = JSON.parse(submission.submission_requirements);
      } catch (parseErr) {
        submission.submission_requirements = submission.submission_requirements;
      }
    }

    if (submission.grading_config && typeof submission.grading_config === 'string') {
      try {
        submission.grading_config = JSON.parse(submission.grading_config);
      } catch (parseErr) {
        submission.grading_config = submission.grading_config;
      }
    }

    // Authorization: faculty can only view submissions for their own offerings
    if (req.user?.role === 'faculty' && req.user.id !== submission.faculty_id) {
      return res
        .status(403)
        .json({ error: 'Not authorized - you can only view submissions in your own courses' });
    }

    // Authorization: students can only view their own submissions
    if (req.user?.role === 'student' && req.user.id !== submission.student_id) {
      return res
        .status(403)
        .json({ error: 'Not authorized - you can only view your own submissions' });
    }

    // Fetch files, code and grades
    const filesQ =
      'SELECT id, storage_path, filename, mime_type FROM submission_files WHERE submission_id = $1';
    const filesR = await pool.query(filesQ, [submissionId]);

    // Fetch code submissions with question_id from assignment_questions
    const codeQ = `
      SELECT cs.*, aq.question_id
      FROM code_submissions cs
      LEFT JOIN assignment_questions aq ON cs.assignment_question_id = aq.id
      WHERE cs.submission_id = $1
    `;
    const codeR = await pool.query(codeQ, [submissionId]);

    const gradesQ =
      'SELECT * FROM submission_grades WHERE submission_id = $1 ORDER BY created_at DESC';
    const gradesR = await pool.query(gradesQ, [submissionId]);

    // Fetch type-specific data - now always check for GitHub submissions if assignment allows it
    const typeSpecificData = {};

    // Always check for GitHub submissions (since all assignments can optionally have them)
    const githubQ = 'SELECT * FROM github_submissions WHERE submission_id = $1';
    const githubR = await pool.query(githubQ, [submissionId]);
    if (githubR.rows.length > 0) {
      typeSpecificData.github = githubR.rows[0];
    }

    // Check for file submissions
    const fileQ = 'SELECT * FROM file_submissions WHERE submission_id = $1';
    const fileR = await pool.query(fileQ, [submissionId]);
    if (fileR.rows.length > 0) {
      typeSpecificData.file = fileR.rows[0];
    }

    // Fetch test case results for each code submission
    const codeWithTestResults = await Promise.all(
      (codeR.rows || []).map(async codeSub => {
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

        let parsedTestResults = null;
        if (codeSub.test_results) {
          if (typeof codeSub.test_results === 'string') {
            try {
              parsedTestResults = JSON.parse(codeSub.test_results);
            } catch (e) {
              console.warn('Failed to parse test_results JSON for code_submission', codeSub.id);
              parsedTestResults = null; // or codeSub.test_results, but null is safer
            }
          } else {
            parsedTestResults = codeSub.test_results;
          }
        }

        return {
          ...codeSub,
          test_case_results: testResultsR.rows || [],
          // Parse test_results JSONB if it exists safely
          test_results: parsedTestResults,
        };
      })
    );

    const rubricGradesQ = `
      SELECT rg.*, rc.title AS criterion_title, rc.description AS criterion_description,
             rc.max_points, rc.weight
      FROM rubric_grades rg
      LEFT JOIN rubric_criteria rc ON rg.criterion_id = rc.id
      WHERE rg.submission_id = $1
      ORDER BY rc.position ASC
    `;
    const rubricGradesR = await pool.query(rubricGradesQ, [submissionId]);

    const result = Object.assign({}, submission, {
      files: filesR.rows || [],
      code: codeWithTestResults,
      grades: gradesR.rows || [],
      rubric_grades: rubricGradesR.rows || [],
      ...typeSpecificData,
    });

    console.log(
      `[DEBUG] getSubmissionById: returning submission with ${filesR.rows?.length || 0} files`
    );

    return res.json({ submission: result });
  } catch (err) {
    console.error('getSubmissionById error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteSubmission(req, res) {
  const client = await pool.connect();
  try {
    const submissionId = Number(req.params.id);
    const studentId = req.user?.id;

    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submission ID' });
    }

    // Verify the submission belongs to the student
    const checkQ = `
      SELECT id, student_id, assignment_id FROM assignment_submissions 
      WHERE id = $1
    `;
    const checkR = await client.query(checkQ, [submissionId]);

    if (checkR.rowCount === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = checkR.rows[0];

    // Only allow student to delete their own submission, or faculty/ta for their courses
    const isOwner = submission.student_id === studentId;
    const isFaculty =
      req.user?.role === 'faculty' || req.user?.role === 'ta' || req.user?.role === 'admin';

    if (!isOwner && !isFaculty) {
      return res.status(403).json({ error: 'Not authorized to delete this submission' });
    }

    await client.query('BEGIN');

    // Delete from github_submissions first (if exists)
    await client.query('DELETE FROM github_submissions WHERE submission_id = $1', [submissionId]);

    // Delete from assignment_submissions
    await client.query('DELETE FROM assignment_submissions WHERE id = $1', [submissionId]);

    await client.query('COMMIT');

    return res.json({ message: 'Submission deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('deleteSubmission error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

export async function downloadSubmissionFile(req, res) {
  try {
    const fileId = req.params.id;
    if (!fileId) {
      return res.status(400).json({ error: 'Missing file ID' });
    }

    const result = await pool.query(
      `SELECT sf.storage_path, sf.filename, sf.mime_type, s.student_id 
       FROM submission_files sf
       JOIN assignment_submissions s ON sf.submission_id = s.id
       WHERE sf.id = $1`,
      [fileId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];
    const storagePath = file.storage_path;

    if (storagePath.startsWith('gdrive://')) {
      const gDriveFileId = storagePath.replace('gdrive://', '');
      try {
        // Use student's auth to fetch the file (they own it)
        const auth = await getAuthenticatedClient(file.student_id);
        const drive = google.drive({ version: 'v3', auth });

        const driveResponse = await drive.files.get(
          { fileId: gDriveFileId, alt: 'media' },
          { responseType: 'stream' }
        );

        res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
        
        driveResponse.data
          .on('error', (err) => {
            console.error('Drive stream error:', err);
            if (!res.headersSent) res.status(500).end();
          })
          .pipe(res);
        return;
      } catch (driveErr) {
        console.error('Failed to fetch from Google Drive:', driveErr);
        return res.status(500).json({ error: 'Failed to fetch file from Google Drive.' });
      }
    }

    if (storagePath.startsWith('http')) {
      // It's a Cloudinary URL (or other external URL)
      return res.redirect(storagePath);
    } else if (storagePath.startsWith('local://')) {
      return res.status(400).json({
        error: 'File only stored as placeholder locally. Preview not available.',
      });
    }

    // Default: try to send as download if it's a local path (not implemented yet but for future)
    res.status(400).json({ error: 'Unsupported storage path' });
  } catch (err) {
    console.error('downloadSubmissionFile error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
