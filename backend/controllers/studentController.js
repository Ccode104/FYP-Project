import { pool } from '../db/index.js';

export async function getCourseStats(req, res) {
  try {
    const studentId = Number(req.user?.id);
    const { offeringId } = req.params;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get pending assignments count (not yet submitted)
    const pendingResult = await pool.query(
      `SELECT COUNT(*) as count FROM assignments a
       WHERE a.course_offering_id = $1
       AND a.id NOT IN (
         SELECT assignment_id FROM assignment_submissions WHERE student_id = $2
       )`,
      [offeringId, studentId]
    );

    // Get completed assignments count (submitted)
    const completedResult = await pool.query(
      `SELECT COUNT(*) as count FROM assignments a
       WHERE a.course_offering_id = $1
       AND a.id IN (
         SELECT assignment_id FROM assignment_submissions WHERE student_id = $2
       )`,
      [offeringId, studentId]
    );

    // Get average grade for this course
    const gradeResult = await pool.query(
      `SELECT AVG(s.final_score) as avg_grade 
       FROM assignment_submissions s
       JOIN assignments a ON s.assignment_id = a.id
       WHERE a.course_offering_id = $1 AND s.student_id = $2 AND s.final_score IS NOT NULL`,
      [offeringId, studentId]
    );

    const pending = parseInt(pendingResult.rows[0]?.count || 0);
    const completed = parseInt(completedResult.rows[0]?.count || 0);
    const avgGrade = parseFloat(gradeResult.rows[0]?.avg_grade || 0);

    res.json({ pending, completed, avgGrade: Math.round(avgGrade * 100) / 100 });
  } catch (err) {
    console.error('getCourseStats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getEnrolledCourses(req, res) {
  try {
    const studentId = Number(req.user?.id);
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const q = `
      SELECT o.id, c.code AS course_code, c.title AS course_title, o.term, o.section
      FROM enrollments e
      JOIN course_offerings o ON e.course_offering_id = o.id
      JOIN courses c ON o.course_id = c.id
      WHERE e.student_id = $1
      ORDER BY o.id DESC
    `;
    const r = await pool.query(q, [studentId]);
    res.json(r.rows);
  } catch (err) {
    console.error('getEnrolledCourses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCourseDetails(req, res) {
  try {
    const { offeringId } = req.params;
    const result = await pool.query(
      `
      SELECT co.*, c.code AS course_code, c.title, c.description, c.credits, d.name AS department, u.name AS faculty_name
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON co.faculty_id = u.id
      WHERE co.id = $1
    `,
      [offeringId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Course offering not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('getCourseDetails error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCourseAssignments(req, res) {
  try {
    const { offeringId } = req.params;
    const studentId = req.user.id;
    const result = await pool.query(
      `SELECT a.*, 
              (s.id IS NOT NULL) as is_submitted,
              s.status as submission_status,
              s.submitted_at,
              s.final_score
       FROM assignments a
       LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = $1
       WHERE a.course_offering_id = $2 
       ORDER BY a.due_at ASC`,
      [studentId, offeringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCourseAssignments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function submitAssignment(req, res) {
  try {
    const studentId = req.user.id;
    const { assignmentId } = req.params;
    const { comments } = req.body; // Optionally accept comments
    const existing = await pool.query(
      `SELECT id
       FROM assignment_submissions
       WHERE assignment_id = $1 AND student_id = $2
       ORDER BY submitted_at DESC NULLS LAST, id DESC
       LIMIT 1`,
      [assignmentId, studentId]
    );

    let submission;
    if (existing.rowCount > 0) {
      const updated = await pool.query(
        `UPDATE assignment_submissions
         SET comments = $1,
             submitted_at = NOW(),
             status = 'submitted',
             attempt = 1
         WHERE id = $2
         RETURNING *`,
        [comments || null, existing.rows[0].id]
      );
      submission = updated.rows[0];
    } else {
      const inserted = await pool.query(
        `INSERT INTO assignment_submissions (assignment_id, student_id, comments, submitted_at, status, attempt)
         VALUES ($1, $2, $3, NOW(), 'submitted', 1)
         RETURNING *`,
        [assignmentId, studentId, comments || null]
      );
      submission = inserted.rows[0];
    }

    res.status(201).json({ message: 'Assignment submitted', submission });
  } catch (err) {
    console.error('submitAssignment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCourseSubmissions(req, res) {
  try {
    const studentId = req.user.id;
    const { offeringId } = req.params;
    const result = await pool.query(
      `SELECT s.*, a.title AS assignment_title, a.due_at,
              g.repo_url, g.repo_name, g.repo_description, g.repo_language,
              g.repo_stars, g.repo_forks
       FROM assignment_submissions s
       JOIN assignments a ON s.assignment_id = a.id
       LEFT JOIN github_submissions g ON s.id = g.submission_id
       WHERE s.student_id = $1 AND a.course_offering_id = $2
       ORDER BY s.submitted_at DESC`,
      [studentId, offeringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCourseSubmissions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAssignmentSubmissions(req, res) {
  try {
    const studentId = req.user.id;
    const { assignmentId } = req.params;
    const result = await pool.query(
      `SELECT s.*, g.repo_url, g.repo_name, g.repo_description, g.repo_language,
              g.repo_stars, g.repo_forks
       FROM assignment_submissions s
       LEFT JOIN github_submissions g ON s.id = g.submission_id
       WHERE s.student_id = $1 AND s.assignment_id = $2
       ORDER BY s.submitted_at DESC`,
      [studentId, assignmentId]
    );

    // Fetch files for each submission
    const submissionsWithFiles = await Promise.all(
      result.rows.map(async submission => {
        const filesResult = await pool.query(
          'SELECT id, storage_path, filename, file_size, mime_type FROM submission_files WHERE submission_id = $1',
          [submission.id]
        );
        return {
          ...submission,
          files: filesResult.rows,
        };
      })
    );

    res.json(submissionsWithFiles);
  } catch (err) {
    console.error('getAssignmentSubmissions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCourseGrades(req, res) {
  try {
    const studentId = req.user.id;
    const { offeringId } = req.params;
    const result = await pool.query(
      `SELECT a.title AS assignment_title, g.score, g.feedback, g.created_at AS graded_at
       FROM submission_grades g
       JOIN assignment_submissions s ON g.submission_id = s.id
       JOIN assignments a ON s.assignment_id = a.id
       WHERE s.student_id = $1 AND a.course_offering_id = $2
       ORDER BY g.created_at DESC`,
      [studentId, offeringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCourseGrades error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCourseQuizzes(req, res) {
  try {
    const studentId = req.user.id;
    const { offeringId } = req.params;
    const result = await pool.query(
      `SELECT q.id, q.title, q.description, q.start_at, q.end_at, q.max_score, q.time_limit,
              q.is_proctored, q.google_form_url, q.google_form_id,
              COALESCE((
                SELECT COUNT(*)::int FROM quiz_attempts a WHERE a.quiz_id = q.id AND a.finished_at IS NOT NULL
              ), 0) as total_submissions,
              COALESCE((
                SELECT AVG(a.score)::numeric(5,2) FROM quiz_attempts a WHERE a.quiz_id = q.id AND a.score IS NOT NULL AND a.finished_at IS NOT NULL
              ), 0) as average_score,
              (SELECT MAX(score) FROM quiz_attempts WHERE quiz_id = q.id AND student_id = $1 AND finished_at IS NOT NULL) as student_score,
              (SELECT status FROM quiz_attempts WHERE quiz_id = q.id AND student_id = $1 ORDER BY started_at DESC LIMIT 1) as student_status
       FROM quizzes q
       WHERE q.course_offering_id = $2
       ORDER BY q.start_at ASC`,
      [studentId, offeringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCourseQuizzes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function attemptQuiz(req, res) {
  try {
    const studentId = req.user.id;
    const { quizId } = req.params;
    const { answers } = req.body; // answers should be an object/array
    const result = await pool.query(
      `INSERT INTO quiz_attempts (quiz_id, student_id, started_at, finished_at, answers)
       VALUES ($1, $2, NOW(), NOW(), $3)
       RETURNING *`,
      [quizId, studentId, answers]
    );
    res.status(201).json({ message: 'Quiz attempted', attempt: result.rows[0] });
  } catch (err) {
    console.error('attemptQuiz error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function enrollInCourse(req, res) {
  try {
    const studentId = req.user.id;
    const { offeringId } = req.body;
    if (!offeringId) {
      return res.status(400).json({ error: 'offeringId is required' });
    }
    // Check if already enrolled
    const exists = await pool.query(
      'SELECT id FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
      [offeringId, studentId]
    );
    if (exists.rowCount > 0) {
      return res.status(409).json({ error: 'Already enrolled in this course offering' });
    }
    // Enroll
    const result = await pool.query(
      'INSERT INTO enrollments (course_offering_id, student_id) VALUES ($1, $2) RETURNING *',
      [offeringId, studentId]
    );
    res.status(201).json({ message: 'Enrolled successfully', enrollment: result.rows[0] });
  } catch (err) {
    console.error('enrollInCourse error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// List quiz attempts for the logged-in student (optionally filtered by quizId)
export async function getStudentQuizAttempts(req, res) {
  try {
    const authId = Number(req.user?.id);
    const { studentId } = req.params;
    const { quizId } = req.query;

    if (!authId || Number(studentId) !== authId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const params = [authId];
    let q = `
      SELECT qa.*, q.title AS quiz_title
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.student_id = $1
    `;
    if (quizId) {
      params.push(Number(quizId));
      q += ' AND qa.quiz_id = $2';
    }
    q += ' ORDER BY qa.finished_at DESC NULLS LAST, qa.started_at DESC NULLS LAST, qa.id DESC';

    const r = await pool.query(q, params);
    const attempts = r.rows.map(row => ({
      ...row,
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
    }));
    res.json(attempts);
  } catch (err) {
    console.error('getStudentQuizAttempts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getGradedAssignment(req, res) {
  try {
    const studentId = req.user.id;
    const { assignmentId } = req.params;

    // Get assignment submission
    const submissionQuery = `
      SELECT s.*, a.title as assignment_title, a.description, u.name as grader_name
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      LEFT JOIN users u ON s.grader_id = u.id
      WHERE s.assignment_id = $1 AND s.student_id = $2
    `;
    const submissionResult = await pool.query(submissionQuery, [assignmentId, studentId]);

    if (submissionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    // Get rubric grades
    const gradesQuery = `
      SELECT rg.*, rc.title as criterion_title, rc.description as criterion_description, rc.max_points
      FROM rubric_grades rg
      JOIN rubric_criteria rc ON rg.criterion_id = rc.id
      WHERE rg.submission_id = $1
      ORDER BY rc.position
    `;
    const gradesResult = await pool.query(gradesQuery, [submission.id]);

    // Calculate final score from rubric grades if not already set
    let finalScore = submission.final_score;
    if ((finalScore === null || finalScore === undefined) && gradesResult.rows.length > 0) {
      finalScore = gradesResult.rows.reduce((sum, grade) => sum + (grade.score || 0), 0);
      // Update the submission with the calculated score
      await pool.query('UPDATE assignment_submissions SET final_score = $1 WHERE id = $2', [
        finalScore,
        submission.id,
      ]);
      submission.final_score = finalScore;
    }

    // Get regrade requests for this submission
    const regradeQuery = `
      SELECT rr.*, rc.title as criterion_title
      FROM regrade_requests rr
      LEFT JOIN rubric_criteria rc ON rr.criterion_id = rc.id
      WHERE rr.submission_id = $1 AND rr.requested_by = $2
      ORDER BY rr.requested_at DESC
    `;
    const regradeResult = await pool.query(regradeQuery, [submission.id, studentId]);

    res.json({
      submission,
      rubricGrades: gradesResult.rows,
      regradeRequests: regradeResult.rows,
    });
  } catch (err) {
    console.error('getGradedAssignment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function submitRegradeRequest(req, res) {
  try {
    const studentId = req.user.id;
    const { submissionId, criterionId, reason } = req.body;

    if (!submissionId || !reason) {
      return res.status(400).json({ error: 'submissionId and reason are required' });
    }

    // Verify the submission belongs to the student
    const verifyQuery = `
      SELECT s.id FROM assignment_submissions s
      WHERE s.id = $1 AND s.student_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [submissionId, studentId]);

    if (verifyResult.rowCount === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Insert regrade request
    const insertQuery = `
      INSERT INTO regrade_requests (submission_id, criterion_id, reason, requested_by, requested_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    const insertResult = await pool.query(insertQuery, [
      submissionId,
      criterionId || null,
      reason,
      studentId,
    ]);

    res.status(201).json({
      message: 'Regrade request submitted',
      request: insertResult.rows[0],
    });
  } catch (err) {
    console.error('submitRegradeRequest error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Submit a resume request for a suspended quiz attempt
export async function submitResumeRequest(req, res) {
  try {
    const studentId = req.user.id;
    const { quizAttemptId, reason } = req.body;

    if (!quizAttemptId || !reason) {
      return res.status(400).json({ error: 'quizAttemptId and reason are required' });
    }

    // Verify the quiz attempt belongs to the student and is suspended
    const verifyQuery = `
      SELECT qa.id, qa.suspended_at, rr.id as existing_request
      FROM quiz_attempts qa
      LEFT JOIN resume_requests rr ON qa.id = rr.quiz_attempt_id AND rr.student_id = $2
      WHERE qa.id = $1 AND qa.student_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [quizAttemptId, studentId]);

    if (verifyResult.rowCount === 0) {
      return res.status(404).json({ error: 'Quiz attempt not found' });
    }

    const attempt = verifyResult.rows[0];

    if (!attempt.suspended_at) {
      return res.status(400).json({ error: 'Quiz attempt is not suspended' });
    }

    if (attempt.existing_request) {
      return res.status(409).json({ error: 'Resume request already exists for this attempt' });
    }

    // Insert resume request
    const insertQuery = `
      INSERT INTO resume_requests (student_id, quiz_attempt_id, reason, status, requested_at)
      VALUES ($1, $2, $3, 'pending', NOW())
      RETURNING *
    `;
    const insertResult = await pool.query(insertQuery, [studentId, quizAttemptId, reason]);

    res.status(201).json({
      message: 'Resume request submitted successfully',
      request: insertResult.rows[0],
    });
  } catch (err) {
    console.error('submitResumeRequest error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get student's resume requests
export async function getStudentResumeRequests(req, res) {
  try {
    const studentId = req.user.id;

    const query = `
      SELECT rr.*, qa.quiz_id, q.title as quiz_title, c.code as course_code
      FROM resume_requests rr
      JOIN quiz_attempts qa ON rr.quiz_attempt_id = qa.id
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE rr.student_id = $1
      ORDER BY rr.requested_at DESC
    `;

    const result = await pool.query(query, [studentId]);

    res.json({
      requests: result.rows,
    });
  } catch (err) {
    console.error('getStudentResumeRequests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get student's upcoming events (assignments, quizzes, lectures) for dashboard
export async function getUpcomingEvents(req, res) {
  try {
    const studentId = req.user.id;
    const today = new Date();

    // Fetch upcoming assignments due in the next 30 days
    const assignmentsQuery = `
      SELECT 
        a.id,
        a.title,
        a.due_at,
        'assignment' AS event_type,
        c.code AS course_code,
        c.title AS course_title,
        co.id AS course_offering_id
      FROM assignments a
      JOIN course_offerings co ON a.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN enrollments e ON e.course_offering_id = co.id
      WHERE e.student_id = $1
        AND a.due_at > NOW()
        AND a.due_at <= NOW() + INTERVAL '30 days'
      ORDER BY a.due_at ASC
    `;

    // Fetch upcoming quizzes
    const quizzesQuery = `
      SELECT 
        q.id,
        q.title,
        q.end_at AS due_at,
        'quiz' AS event_type,
        c.code AS course_code,
        c.title AS course_title,
        co.id AS course_offering_id
      FROM quizzes q
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN enrollments e ON e.course_offering_id = co.id
      WHERE e.student_id = $1
        AND q.end_at > NOW()
        AND q.end_at <= NOW() + INTERVAL '30 days'
      ORDER BY q.end_at ASC
    `;

    // Fetch upcoming live lectures
    const lecturesQuery = `
      SELECT 
        ll.id,
        ll.title,
        ll.scheduled_at AS due_at,
        'lecture' AS event_type,
        c.code AS course_code,
        c.title AS course_title,
        co.id AS course_offering_id,
        NULL AS location
      FROM live_lectures ll
      JOIN course_offerings co ON ll.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN enrollments e ON e.course_offering_id = co.id
      WHERE e.student_id = $1
        AND ll.scheduled_at > NOW()
        AND ll.scheduled_at <= NOW() + INTERVAL '30 days'
      ORDER BY ll.scheduled_at ASC
    `;

    const [assignmentsResult, quizzesResult, lecturesResult] = await Promise.all([
      pool.query(assignmentsQuery, [studentId]),
      pool.query(quizzesQuery, [studentId]),
      pool.query(lecturesQuery, [studentId]),
    ]);

    const allEvents = [
      ...assignmentsResult.rows,
      ...quizzesResult.rows,
      ...lecturesResult.rows,
    ].sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());

    res.json({ events: allEvents });
  } catch (err) {
    console.error('getUpcomingEvents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
