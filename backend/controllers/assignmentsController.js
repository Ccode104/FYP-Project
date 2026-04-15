import { pool } from '../db/index.js';

export async function createAssignment(req, res) {
  const {
    course_offering_id,
    title,
    description,
    assignment_type, // Legacy field for backward compatibility
    assignment_config, // New flexible configuration
    submission_requirements, // New submission requirements
    grading_config, // New grading configuration
    release_at,
    due_at,
    max_score,
    total_points, // New field for component-based assignments
    allow_multiple_submissions,
    is_graded,
    file_size_limit_mb, // New field for global file size limit
    allow_github_repo, // New field for GitHub repository submissions
    question_ids, // Legacy field for backward compatibility
  } = req.body;

  // Check if user has permission to create assignments for this offering
  if (req.user.role !== 'admin') {
    const checkQ = 'SELECT faculty_id FROM course_offerings WHERE id = $1';
    const checkR = await pool.query(checkQ, [course_offering_id]);
    if (checkR.rowCount === 0) {
      return res.status(404).json({ error: 'Course offering not found' });
    }

    const offering = checkR.rows[0];
    if (req.user.role === 'faculty' && req.user.id !== offering.faculty_id) {
      return res
        .status(403)
        .json({ error: 'Not authorized - you can only create assignments for your own courses' });
    }
    // For TA, check if they are assigned to this offering
    if (req.user.role === 'ta') {
      const taCheck = await pool.query(
        'SELECT 1 FROM ta_assignments WHERE ta_id = $1 AND course_offering_id = $2',
        [req.user.id, course_offering_id]
      );
      if (taCheck.rowCount === 0) {
        return res
          .status(403)
          .json({ error: 'Not authorized - you are not assigned to this course' });
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Prepare data for insertion
    const created_by = req.user?.id || null;
    const final_total_points = total_points || max_score || 100;
    const final_allow_multiple = allow_multiple_submissions || false;
    const final_is_graded = is_graded !== undefined ? is_graded : true;

    // Handle both legacy and new assignment formats
    let final_assignment_config = assignment_config;
    let final_submission_requirements = submission_requirements;
    let final_grading_config = grading_config;

    // If using legacy format, convert to new format
    if (!assignment_config && assignment_type) {
      let component_type = 'other';
      let submission_type = 'text';
      let accepted_formats = ['*'];

      // Handle new assignment types
      if (assignment_type === 'pdf') {
        component_type = 'document';
        submission_type = 'url';
        accepted_formats = ['url'];
      } else if (assignment_type === 'ppt') {
        component_type = 'presentation';
        submission_type = 'url';
        accepted_formats = ['url'];
      } else if (assignment_type === 'mixed') {
        component_type = 'repository';
        submission_type = 'url';
        accepted_formats = ['url'];
      } else if (assignment_type === 'code') {
        component_type = 'code';
        submission_type = 'file_upload';
        accepted_formats = ['.py', '.java', '.cpp', '.js', '.ts'];
      } else if (assignment_type === 'homework') {
        component_type = 'document';
        submission_type = 'file_upload';
        accepted_formats = ['.pdf', '.docx', '.txt'];
      } else if (assignment_type === 'project') {
        component_type = 'code';
        submission_type = 'file_upload';
        accepted_formats = ['.zip', '.tar.gz', '.rar'];
      } else if (assignment_type === 'exam') {
        component_type = 'assessment';
        submission_type = 'text';
        accepted_formats = ['*'];
      }

      final_assignment_config = {
        assignment_type: 'simple',
        components: [
          {
            id: 'main_component',
            type: component_type,
            subtype: assignment_type,
            title: title,
            description: description,
            points: final_total_points,
          },
        ],
        settings: {
          allow_group_work: false,
          peer_review_required: false,
          auto_grading_enabled: assignment_type === 'code',
          plagiarism_check: true,
        },
      };

      final_submission_requirements = [
        {
          component_id: 'main_component',
          submission_type: submission_type,
          accepted_formats: accepted_formats,
          max_file_size_mb:
            assignment_type === 'pdf' || assignment_type === 'ppt' || assignment_type === 'mixed'
              ? null
              : 10,
          required: true,
          instructions:
            assignment_type === 'pdf'
              ? 'Upload your PDF file to Google Drive and submit the shareable link'
              : assignment_type === 'ppt'
                ? 'Upload your PPT file to Google Drive and submit the shareable link'
                : assignment_type === 'mixed'
                  ? 'Create a GitHub repository with your project files and submit the repository URL'
                  : null,
        },
      ];

      final_grading_config = {
        grading_type: 'simple',
        use_rubric: false,
        allow_partial_credit: true,
        grade_visibility: 'after_due_date',
      };
    }

    // Insert the assignment
    const insertQ = `
      INSERT INTO assignments (
        course_offering_id, title, description, assignment_config,
        submission_requirements, grading_config, total_points,
        allow_multiple_submissions, is_graded, release_at, due_at, created_by, file_size_limit_mb, allow_github_repo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const insertValues = [
      course_offering_id,
      title,
      description,
      JSON.stringify(final_assignment_config),
      JSON.stringify(final_submission_requirements),
      JSON.stringify(final_grading_config),
      final_total_points,
      final_allow_multiple,
      final_is_graded,
      release_at,
      due_at,
      created_by,
      file_size_limit_mb || null,
      allow_github_repo || false,
    ];

    const r = await client.query(insertQ, insertValues);
    const assignment = r.rows[0];

    // Handle legacy question_ids for backward compatibility
    if (
      assignment_type === 'code' &&
      question_ids &&
      Array.isArray(question_ids) &&
      question_ids.length > 0
    ) {
      for (let i = 0; i < question_ids.length; i++) {
        const question_id = Number(question_ids[i]);
        if (question_id) {
          const pointsPerQuestion = final_total_points / question_ids.length;
          await client.query(
            `INSERT INTO assignment_questions (assignment_id, question_id, points, position)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (assignment_id, question_id) DO NOTHING`,
            [assignment.id, question_id, pointsPerQuestion, i + 1]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json(assignment);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  } finally {
    client.release();
  }
}

export async function publishAssignment(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Missing assignment id' });
  }

  // First get the assignment and its offering details
  const checkQ = `
    SELECT a.id, a.course_offering_id, o.faculty_id 
    FROM assignments a 
    JOIN course_offerings o ON a.course_offering_id = o.id 
    WHERE a.id = $1
  `;
  const checkR = await pool.query(checkQ, [id]);
  if (checkR.rowCount === 0) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  // Check if current user is faculty for this offering (skip check for admin)
  const assignment = checkR.rows[0];
  if (req.user.role === 'faculty' && req.user.id !== assignment.faculty_id) {
    return res
      .status(403)
      .json({ error: 'Not authorized - you can only publish assignments in your own courses' });
  }

  const q =
    'UPDATE assignments SET release_at = COALESCE(release_at, now()) WHERE id=$1 RETURNING *';
  const r = await pool.query(q, [id]);
  res.json(r.rows[0]);
}

export async function listAssignmentSubmissions(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Missing assignment id' });
  }

  // First verify the user has access to this assignment's offering
  const checkQ = `
    SELECT a.id, a.course_offering_id, o.faculty_id 
    FROM assignments a 
    JOIN course_offerings o ON a.course_offering_id = o.id 
    WHERE a.id = $1
  `;
  const checkR = await pool.query(checkQ, [id]);
  if (checkR.rowCount === 0) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  // Check if current user is faculty for this offering (skip check for admin/ta)
  const assignment = checkR.rows[0];
  if (req.user.role === 'faculty' && req.user.id !== assignment.faculty_id) {
    return res
      .status(403)
      .json({ error: 'Not authorized - you can only view submissions in your own courses' });
  }

  // Fetch only the latest submission per student with student info
  const q = `
    SELECT s.*, u.name as student_name, u.email as student_email,
           g.repo_url, g.repo_name
    FROM assignment_submissions s 
    JOIN users u ON s.student_id = u.id
    LEFT JOIN github_submissions g ON s.id = g.submission_id
    WHERE s.assignment_id = $1 
    AND s.submitted_at = (
      SELECT MAX(s2.submitted_at) 
      FROM assignment_submissions s2 
      WHERE s2.assignment_id = s.assignment_id AND s2.student_id = s.student_id
    )
    ORDER BY s.submitted_at DESC`;
  const r = await pool.query(q, [id]);
  const submissions = r.rows || [];

  if (submissions.length === 0) {
    return res.json({ submissions: [] });
  }

  // Fetch files for all submissions in one query
  const ids = submissions.map(s => s.id);
  const filesQ =
    "SELECT submission_id, json_agg(json_build_object('id', id, 'storage_path', storage_path, 'filename', filename, 'mime_type', mime_type)) as files FROM submission_files WHERE submission_id = ANY($1::bigint[]) GROUP BY submission_id";
  const filesR2 = await pool.query(filesQ, [ids]);
  const filesMap = {};
  for (const row of filesR2.rows) {
    filesMap[row.submission_id] = row.files || [];
  }

  const enhanced = submissions.map(s => Object.assign({}, s, { files: filesMap[s.id] || [] }));
  res.json({ submissions: enhanced });
}

export async function getAssignment(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Missing assignment id' });
  }

  // Get assignment with course offering details
  const q = `
    SELECT a.*, o.faculty_id, o.term, c.code as course_code, c.title as course_name
    FROM assignments a
    JOIN course_offerings o ON a.course_offering_id = o.id
    JOIN courses c ON o.course_id = c.id
    WHERE a.id = $1
  `;
  const r = await pool.query(q, [id]);
  if (r.rowCount === 0) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  const assignment = r.rows[0];

  // Parse JSONB fields for flexible assignments (pg library returns them as objects)
  if (assignment.assignment_config && typeof assignment.assignment_config === 'string') {
    assignment.assignment_config = JSON.parse(assignment.assignment_config);
  }
  if (
    assignment.submission_requirements &&
    typeof assignment.submission_requirements === 'string'
  ) {
    assignment.submission_requirements = JSON.parse(assignment.submission_requirements);
  }
  if (assignment.grading_config && typeof assignment.grading_config === 'string') {
    assignment.grading_config = JSON.parse(assignment.grading_config);
  }

  // Only derive assignment_type from allow_github_repo if not explicitly set in DB
  // Use 'github' type when allow_github_repo is true
  if (!assignment.assignment_type || assignment.assignment_type === 'file') {
    if (assignment.allow_github_repo) {
      assignment.assignment_type = 'github';
    } else {
      assignment.assignment_type = assignment.assignment_type || 'file';
    }
  }

  // Check if user has access to this assignment (enrolled in the course or faculty/admin)
  if (req.user.role === 'student') {
    const enrollCheck = await pool.query(
      'SELECT 1 FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
      [assignment.course_offering_id, req.user.id]
    );
    if (enrollCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }
  } else if (req.user.role === 'faculty' && req.user.id !== assignment.faculty_id) {
    return res.status(403).json({ error: 'Not authorized to view this assignment' });
  }

  res.json(assignment);
}

export async function deleteAssignment(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Missing assignment id' });
  }
  // Verify ownership: creator or faculty for offering, or admin
  const checkQ =
    'SELECT a.id, a.created_by, o.faculty_id FROM assignments a JOIN course_offerings o ON a.course_offering_id=o.id WHERE a.id=$1';
  const r = await pool.query(checkQ, [id]);
  if (r.rowCount === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  const row = r.rows[0];
  const uid = req.user?.id;
  const role = req.user?.role;
  const isOwner = uid && (uid === row.created_by || uid === row.faculty_id);
  if (!(isOwner || role === 'admin')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await pool.query('DELETE FROM assignments WHERE id=$1', [id]);
  res.json({ success: true });
}

// Get questions for an assignment
export async function getAssignmentQuestions(req, res) {
  try {
    const assignmentId = Number(req.params.id);
    if (!assignmentId) {
      return res.status(400).json({ error: 'Missing assignment id' });
    }

    // Verify assignment exists and user has access
    const checkQ = `
      SELECT a.id, a.assignment_type, a.course_offering_id, o.faculty_id
      FROM assignments a
      JOIN course_offerings o ON a.course_offering_id = o.id
      WHERE a.id = $1
    `;
    const checkR = await pool.query(checkQ, [assignmentId]);
    if (checkR.rowCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // For code assignments, get questions from assignment_questions
    // Note: Since we removed assignment_type, this check will need to be updated
    // For now, assume assignments with questions are code assignments
    const hasQuestions = await pool.query(
      'SELECT 1 FROM assignment_questions WHERE assignment_id = $1 LIMIT 1',
      [assignmentId]
    );
    if (hasQuestions.rowCount > 0) {
      const questionsQ = `
        SELECT cq.id, cq.title, cq.description, cq.constraints, cq.template_code, cq.driver_code, aq.points, aq.position,
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
        FROM assignment_questions aq
        JOIN code_questions cq ON aq.question_id = cq.id
        LEFT JOIN code_question_testcases cqt ON cq.id = cqt.question_id
        WHERE aq.assignment_id = $1
        GROUP BY cq.id, aq.points, aq.position
        ORDER BY aq.position
      `;
      const questionsR = await pool.query(questionsQ, [assignmentId]);
      // Parse JSONB fields for each question
      const questions = questionsR.rows.map(q => {
        if (q.template_code && typeof q.template_code === 'string') {
          q.template_code = JSON.parse(q.template_code);
        }
        if (q.driver_code && typeof q.driver_code === 'string') {
          q.driver_code = JSON.parse(q.driver_code);
        }
        return q;
      });
      return res.json(questions);
    }

    return res.json([]);
  } catch (err) {
    console.error('Error fetching assignment questions:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch assignment questions' });
  }
}

// Submit component-based assignment
export async function submitComponentAssignment(req, res) {
  try {
    const assignmentId = Number(req.params.id);
    const { components } = req.body; // Array of { component_id, submission_type, content, file_path, metadata }

    if (!assignmentId || !components || !Array.isArray(components)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify assignment exists and user is enrolled
    const assignmentCheck = await pool.query(
      `
      SELECT a.id, a.course_offering_id, a.assignment_config, a.submission_requirements
      FROM assignments a
      JOIN course_offerings o ON a.course_offering_id = o.id
      WHERE a.id = $1
    `,
      [assignmentId]
    );

    if (assignmentCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentCheck.rows[0];

    // Check enrollment for students
    if (req.user.role === 'student') {
      const enrollCheck = await pool.query(
        'SELECT 1 FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
        [assignment.course_offering_id, req.user.id]
      );
      if (enrollCheck.rowCount === 0) {
        return res.status(403).json({ error: 'Not enrolled in this course' });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create or update main assignment submission
      const submissionResult = await client.query(
        `
        SELECT id FROM assignment_submissions
        WHERE assignment_id = $1 AND student_id = $2
      `,
        [assignmentId, req.user.id]
      );

      let submissionId;
      if (submissionResult.rowCount === 0) {
        // Create new submission
        const newSubmission = await client.query(
          `
          INSERT INTO assignment_submissions (assignment_id, student_id, submitted_at, status)
          VALUES ($1, $2, NOW(), 'submitted')
          RETURNING id
        `,
          [assignmentId, req.user.id]
        );
        submissionId = newSubmission.rows[0].id;
      } else {
        submissionId = submissionResult.rows[0].id;
        // Update submission timestamp
        await client.query(
          `
          UPDATE assignment_submissions SET submitted_at = NOW() WHERE id = $1
        `,
          [submissionId]
        );
      }

      // Insert component submissions
      for (const component of components) {
        await client.query(
          `
          INSERT INTO assignment_component_submissions
          (assignment_submission_id, component_id, submission_type, content, file_path, metadata, submitted_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (assignment_submission_id, component_id) DO UPDATE SET
            submission_type = EXCLUDED.submission_type,
            content = EXCLUDED.content,
            file_path = EXCLUDED.file_path,
            metadata = EXCLUDED.metadata,
            submitted_at = NOW()
        `,
          [
            submissionId,
            component.component_id,
            component.submission_type,
            component.content || null,
            component.file_path || null,
            JSON.stringify(component.metadata || {}),
          ]
        );
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
    console.error('Error submitting component assignment:', err);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
}

// Grade component-based submission
export async function gradeComponentSubmission(req, res) {
  try {
    const submissionId = Number(req.params.id);
    const { componentGrades, overallFeedback } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submission id' });
    }

    // Verify the user has permission to grade this submission
    const checkQ = `
      SELECT s.id, s.assignment_id, a.course_offering_id, o.faculty_id, a.grading_config
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN course_offerings o ON a.course_offering_id = o.id
      WHERE s.id = $1
    `;
    const checkR = await pool.query(checkQ, [submissionId]);
    if (checkR.rowCount === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = checkR.rows[0];

    // Check if current user is faculty for this offering or admin
    if (req.user.role !== 'admin' && req.user.id !== submission.faculty_id) {
      return res.status(403).json({ error: 'Not authorized to grade this submission' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let totalScore = 0;

      // Insert component grades
      if (componentGrades && Array.isArray(componentGrades)) {
        for (const cg of componentGrades) {
          await client.query(
            `
            INSERT INTO component_grades
            (assignment_submission_id, component_id, score, feedback, graded_by, graded_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (assignment_submission_id, component_id) DO UPDATE SET
              score = EXCLUDED.score,
              feedback = EXCLUDED.feedback,
              graded_by = EXCLUDED.graded_by,
              graded_at = NOW()
          `,
            [submissionId, cg.component_id, cg.score, cg.feedback || '', req.user.id]
          );

          totalScore += cg.score;
          // You might want to get the max points for each component from assignment_config
        }
      }

      // Calculate final grade (simplified - you might want more complex logic)
      const finalGrade = totalScore; // Or calculate based on assignment config

      // Update the main submission
      const updateQ = `
        UPDATE assignment_submissions
        SET final_score = $1, comments = $2, graded_at = NOW(), grader_id = $3
        WHERE id = $4
        RETURNING *
      `;
      const updateR = await client.query(updateQ, [
        finalGrade,
        overallFeedback || '',
        req.user.id,
        submissionId,
      ]);

      await client.query('COMMIT');
      res.json(updateR.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error grading component submission:', err);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
}

// Get component submissions for a submission
export async function getComponentSubmissions(req, res) {
  try {
    const submissionId = Number(req.params.id);
    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submission id' });
    }

    const components = await pool.query(
      `
      SELECT acs.*, acs.metadata as submission_metadata
      FROM assignment_component_submissions acs
      WHERE acs.assignment_submission_id = $1
      ORDER BY acs.submitted_at DESC
    `,
      [submissionId]
    );

    // Parse metadata JSON (pg library returns jsonb as objects)
    const parsedComponents = components.rows.map(comp => ({
      ...comp,
      submission_metadata:
        comp.submission_metadata && typeof comp.submission_metadata === 'string'
          ? JSON.parse(comp.submission_metadata)
          : comp.submission_metadata || {},
    }));

    res.json({ components: parsedComponents });
  } catch (err) {
    console.error('Error getting component submissions:', err);
    res.status(500).json({ error: 'Failed to get component submissions' });
  }
}

// Legacy gradeSubmission function (for backward compatibility)
export async function gradeSubmission(req, res) {
  try {
    const submissionId = Number(req.params.id);
    const { grade, feedback, rubricGrades } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submission id' });
    }

    // Verify the user has permission to grade this submission
    const checkQ = `
      SELECT s.id, s.assignment_id, a.course_offering_id, o.faculty_id
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN course_offerings o ON a.course_offering_id = o.id
      WHERE s.id = $1
    `;
    const checkR = await pool.query(checkQ, [submissionId]);
    if (checkR.rowCount === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = checkR.rows[0];

    // Check if current user is faculty for this offering or admin
    if (req.user.role !== 'admin' && req.user.id !== submission.faculty_id) {
      return res.status(403).json({ error: 'Not authorized to grade this submission' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let finalGrade = grade;

      // If rubric grades are provided, calculate total grade and store individual criteria grades
      if (rubricGrades && Array.isArray(rubricGrades) && rubricGrades.length > 0) {
        // Delete existing rubric grades for this submission
        await client.query('DELETE FROM rubric_grades WHERE submission_id = $1', [submissionId]);

        // Insert new rubric grades
        let totalWeightedScore = 0;
        let totalWeight = 0;

        for (const rg of rubricGrades) {
          await client.query(
            `
            INSERT INTO rubric_grades (submission_id, criterion_id, score, feedback, graded_by, graded_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
          `,
            [submissionId, rg.criterionId, rg.score, rg.feedback || '', req.user.id]
          );

          // Get criterion weight for calculation
          const criterionResult = await client.query(
            'SELECT weight FROM rubric_criteria WHERE id = $1',
            [rg.criterionId]
          );
          if (criterionResult.rowCount > 0) {
            const weight = criterionResult.rows[0].weight;
            totalWeightedScore += rg.score * weight;
            totalWeight += weight;
          }
        }

        // Calculate final grade if not provided
        if (finalGrade === undefined || finalGrade === null) {
          finalGrade = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
        }
      }

      // Update the submission with grade
      const updateQ = `
        UPDATE assignment_submissions
        SET final_score = $1, comments = $2, graded_at = NOW(), grader_id = $3
        WHERE id = $4
        RETURNING *
      `;
      const updateR = await client.query(updateQ, [
        finalGrade,
        feedback || '',
        req.user.id,
        submissionId,
      ]);

      await client.query('COMMIT');
      res.json(updateR.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error grading submission:', err);
    res.status(500).json({ error: err.message || 'Failed to grade submission' });
  }
}
