import { pool } from '../db/index.js';
import { getGoogleFormQuizResultsData } from './googleController.js';

let ensureQuizGoogleFormColumnsPromise = null;

async function ensureQuizGoogleFormColumns() {
  if (!ensureQuizGoogleFormColumnsPromise) {
    ensureQuizGoogleFormColumnsPromise = (async () => {
      await pool.query(`
        ALTER TABLE quizzes
        ADD COLUMN IF NOT EXISTS google_form_url TEXT,
        ADD COLUMN IF NOT EXISTS google_form_id TEXT
      `);
    })().catch(error => {
      ensureQuizGoogleFormColumnsPromise = null;
      throw error;
    });
  }

  return ensureQuizGoogleFormColumnsPromise;
}

// Get quiz details with questions for taking
export async function getQuiz(req, res) {
  try {
    const { quizId } = req.params;

    // Get quiz details
    const quizQuery = `
      SELECT q.*, c.code as course_code, c.title as course_title
      FROM quizzes q
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE q.id = $1
    `;
    const quizResult = await pool.query(quizQuery, [quizId]);
    
    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    const quiz = quizResult.rows[0];
    
    // Get questions
    const questionsQuery = `
      SELECT id, question_text, question_type, metadata
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY id
    `;
    const questionsResult = await pool.query(questionsQuery, [quizId]);
    
    // Parse metadata and remove correct answers for students
    const questions = questionsResult.rows.map(q => {
      const metadata = typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata;

      // Remove correct answer from metadata for students
      const studentMetadata = { ...metadata };
      if (q.question_type === 'mcq' || q.question_type === 'true_false') {
        delete studentMetadata.correct_answer;
      }

      return {
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        metadata: studentMetadata
      };
    });

    const responseData = {
      ...quiz,
      questions
    };

    console.log('Returning quiz data:', {
      id: responseData.id,
      title: responseData.title,
      is_proctored: responseData.is_proctored,
      time_limit: responseData.time_limit
    });

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quiz' });
  }
}

// Get quiz for grading (includes correct answers)
export async function getQuizForGrading(req, res) {
  try {
    const { quizId } = req.params;
    
    const quizQuery = 'SELECT * FROM quizzes WHERE id = $1';
    const quizResult = await pool.query(quizQuery, [quizId]);
    
    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    const questionsQuery = `
      SELECT id, question_text, question_type, metadata
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY id
    `;
    const questionsResult = await pool.query(questionsQuery, [quizId]);
    
    const questions = questionsResult.rows.map(q => ({
      ...q,
      metadata: typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata
    }));
    
    res.json({
      ...quizResult.rows[0],
      questions
    });
  } catch (error) {
    console.error('Error fetching quiz for grading:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quiz' });
  }
}

// Submit quiz attempt with auto-grading and proctoring integration
export async function submitQuizAttempt(req, res) {
  try {
    const { quiz_id, student_id, answers, proctoring_session_id } = req.body;

    if (!quiz_id || !student_id) {
      return res.status(400).json({ error: 'quiz_id and student_id are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Disallow multiple submissions by the same student for the same quiz
      const existsRes = await client.query('SELECT id FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2 LIMIT 1', [quiz_id, student_id]);
      if (existsRes.rowCount > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'You have already submitted this quiz.' });
      }

      // Check proctoring violations if session exists
      let violationStatus = { violated: false, critical_violations: 0, total_violations: 0 };
      if (proctoring_session_id) {
        const violationsQuery = `
          SELECT severity, COUNT(*) as count
          FROM proctoring_violations
          WHERE session_id = $1
          GROUP BY severity
        `;
        const violationsResult = await client.query(violationsQuery, [proctoring_session_id]);

        let totalViolations = 0;
        let criticalViolations = 0;

        violationsResult.rows.forEach(row => {
          const count = parseInt(row.count);
          totalViolations += count;
          if (parseInt(row.severity) >= 3) { // Critical violations
            criticalViolations += count;
          }
        });

        violationStatus = {
          violated: criticalViolations > 0,
          critical_violations: criticalViolations,
          total_violations: totalViolations
        };

        // Update proctoring session as completed
        await client.query(
          'UPDATE proctoring_sessions SET status = $1, ended_at = NOW() WHERE id = $2',
          ['completed', proctoring_session_id]
        );
      }

      // Get quiz questions with correct answers
      const questionsQuery = `
        SELECT id, question_text, question_type, metadata
        FROM quiz_questions
        WHERE quiz_id = $1
        ORDER BY id
      `;
      const questionsResult = await client.query(questionsQuery, [quiz_id]);
      const questions = questionsResult.rows.map(q => ({
        ...q,
        metadata: typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata
      }));

      // Get quiz max score
      const quizQuery = 'SELECT max_score FROM quizzes WHERE id = $1';
      const quizResult = await client.query(quizQuery, [quiz_id]);
      const maxScore = quizResult.rows[0]?.max_score || 100;

      // Auto-grade answers
      const totalQuestions = questions.length;
      let correctAnswers = 0;

      const gradedAnswers = {};

      questions.forEach(question => {
        const studentAnswer = answers[question.id];
        const correctAnswer = question.metadata.correct_answer;

        if (question.question_type === 'mcq' || question.question_type === 'true_false') {
          // Auto-grade MCQ and True/False
          const isCorrect = String(studentAnswer) === String(correctAnswer);
          if (isCorrect) {correctAnswers++;}

          gradedAnswers[question.id] = {
            student_answer: studentAnswer,
            is_correct: isCorrect,
            correct_answer: correctAnswer
          };
        } else {
          // Short answer - needs manual grading
          gradedAnswers[question.id] = {
            student_answer: studentAnswer,
            is_correct: null, // null means pending manual grading
            correct_answer: correctAnswer || null
          };
        }
      });

      // Calculate base score based on auto-graded questions
      const autoGradedCount = questions.filter(q =>
        q.question_type === 'mcq' || q.question_type === 'true_false'
      ).length;

      const baseScore = autoGradedCount > 0
        ? (correctAnswers / autoGradedCount) * maxScore
        : null; // null if all questions need manual grading

      // Apply proctoring penalties
      let finalScore = baseScore;
      let scorePenalty = 0;

      if (violationStatus.violated) {
        // Zero score for critical violations (as per user requirements)
        finalScore = 0;
        scorePenalty = baseScore || 0;
      }

      // Insert quiz attempt
      const attemptQuery = `
        INSERT INTO quiz_attempts
        (quiz_id, student_id, started_at, finished_at, score, answers, violated, proctoring_session_id, suspension_reason)
        VALUES ($1, $2, NOW(), NOW(), $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const suspensionReason = violationStatus.violated
        ? `Quiz suspended due to ${violationStatus.critical_violations} critical proctoring violation(s)`
        : null;

      const attemptResult = await client.query(attemptQuery, [
        quiz_id,
        student_id,
        finalScore,
        JSON.stringify(gradedAnswers),
        violationStatus.violated,
        proctoring_session_id || null,
        suspensionReason
      ]);

      // Update proctoring analytics if session exists
      if (proctoring_session_id) {
        await updateProctoringAnalytics(client, proctoring_session_id);
      }

      // Update quiz performance stats and check achievements (only for non-violated attempts)
      if (!violationStatus.violated && finalScore !== null) {
        await updateQuizGamificationStats(client, student_id, finalScore, quiz_id);
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: violationStatus.violated ? 'Quiz submitted with violations - score penalized' : 'Quiz submitted successfully',
        attempt: attemptResult.rows[0],
        graded_answers: gradedAnswers,
        needs_manual_grading: totalQuestions !== autoGradedCount,
        proctoring_result: {
          violated: violationStatus.violated,
          total_violations: violationStatus.total_violations,
          critical_violations: violationStatus.critical_violations,
          score_penalty: scorePenalty,
          final_score: finalScore
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    res.status(500).json({ error: error.message || 'Failed to submit quiz' });
  }
}

export async function createQuiz(req, res) {
  try {
    // eslint-disable-next-line no-unused-vars
    const {
      course_offering_id,
      title,
      _description,
      start_at,
      end_at,
      max_score,
      questions,
      is_proctored,
      time_limit,
      google_form_url,
      google_form_id,
    } = req.body;

    await ensureQuizGoogleFormColumns();

    console.log('Creating quiz with data:', {
      course_offering_id,
      title,
      is_proctored,
      time_limit,
      questionCount: questions?.length || 0,
      google_form_url,
      google_form_id,
    });

    // Validate required fields
    if (!course_offering_id || !title) {
      return res.status(400).json({ error: 'course_offering_id and title are required' });
    }

    // Check if user has permission to create quizzes for this offering
    if (req.user.role !== 'admin') {
      const checkQ = 'SELECT faculty_id FROM course_offerings WHERE id = $1';
      const checkR = await pool.query(checkQ, [course_offering_id]);
      if (checkR.rowCount === 0) {return res.status(404).json({ error: 'Course offering not found' });}

      const offering = checkR.rows[0];
      if (req.user.role === 'faculty' && req.user.id !== offering.faculty_id) {
        return res.status(403).json({ error: 'Not authorized - you can only create quizzes for your own courses' });
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

      // Create quiz
      const quizQuery = `
        INSERT INTO quizzes (
          course_offering_id, title, start_at, end_at, max_score, is_proctored, time_limit,
          google_form_url, google_form_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
      `;
      const quizResult = await client.query(quizQuery, [
        course_offering_id,
        title,
        start_at || null,
        end_at || null,
        max_score || 100,
        is_proctored || false,
        time_limit || null,
        google_form_url || null,
        google_form_id || null
      ]);
      const quiz = quizResult.rows[0];
    
      // Insert questions if provided
      if (questions && Array.isArray(questions) && questions.length > 0) {
        const questionQuery = 'INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata) VALUES ($1, $2, $3, $4) RETURNING *';
      
        for (const q of questions) {
          await client.query(questionQuery, [
            quiz.id,
            q.question_text,
            q.question_type || 'mcq',
            JSON.stringify(q.metadata || {})
          ]);
        }
      }
      
      await client.query('COMMIT');
      res.status(201).json({ message: 'Quiz created successfully', quiz });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to create quiz' });
  }
}

// List attempts for a quiz (grading view)
export async function listQuizAttempts(req, res) {
  try {
    const { quizId } = req.params;
    const q = `
      SELECT qa.*, u.name AS student_name, u.email AS student_email
      FROM quiz_attempts qa
      JOIN users u ON qa.student_id = u.id
      WHERE qa.quiz_id = $1
      ORDER BY qa.finished_at DESC NULLS LAST, qa.started_at DESC NULLS LAST, qa.id DESC
    `;
    const r = await pool.query(q, [quizId]);
    const attempts = r.rows.map(row => ({
      ...row,
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers
    }));
    res.json(attempts);
  } catch (error) {
    console.error('Error listing quiz attempts:', error);
    res.status(500).json({ error: error.message || 'Failed to list attempts' });
  }
}

// Grade a quiz attempt (manual grading of short answers)
export async function gradeQuizAttempt(req, res) {
  try {
    const { attemptId } = req.params;
    const { decisions } = req.body; // { [questionId]: boolean }

    if (!decisions || typeof decisions !== 'object') {
      return res.status(400).json({ error: 'decisions object required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Load attempt
      const aRes = await client.query('SELECT * FROM quiz_attempts WHERE id = $1', [attemptId]);
      if (aRes.rowCount === 0) {
        return res.status(404).json({ error: 'Attempt not found' });
      }
      const attempt = aRes.rows[0];
      const quizId = attempt.quiz_id;

      // Load quiz meta
      const quizRes = await client.query('SELECT max_score FROM quizzes WHERE id = $1', [quizId]);
      const maxScore = quizRes.rows[0]?.max_score || 100;

      // Load questions (for counting)
      const qRes = await client.query('SELECT id FROM quiz_questions WHERE quiz_id = $1 ORDER BY id', [quizId]);
      const totalQuestions = qRes.rowCount;

      // Merge decisions into answers
      const answers = typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : attempt.answers || {};
      for (const [qidRaw, val] of Object.entries(decisions)) {
        const qid = Number(qidRaw);
        if (!answers[qid]) {answers[qid] = { student_answer: null, is_correct: null, correct_answer: null };}
        const v = (val === true || val === 'true');
        answers[qid].is_correct = v;
      }

      // Recompute score: count only graded questions; if all graded, scale by totalQuestions
      let gradedCount = 0;
      let correctCount = 0;
      for (const qid of Object.keys(answers)) {
        const rec = answers[qid];
        if (rec && typeof rec.is_correct === 'boolean') {
          gradedCount++;
          if (rec.is_correct) {correctCount++;}
        }
      }
      const denom = gradedCount > 0 ? (gradedCount === totalQuestions ? totalQuestions : gradedCount) : 1;
      const score = (correctCount / denom) * Number(maxScore);

      const upd = await client.query(
        'UPDATE quiz_attempts SET answers = $1, score = $2 WHERE id = $3 RETURNING *',
        [JSON.stringify(answers), score, attemptId]
      );

      await client.query('COMMIT');

      const updated = upd.rows[0];
      res.json({ attempt: { ...updated, answers }, score, fully_graded: gradedCount === totalQuestions });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error grading quiz attempt:', error);
    res.status(500).json({ error: error.message || 'Failed to grade attempt' });
  }
}

// Helper function to update proctoring analytics
async function updateProctoringAnalytics(client, sessionId) {
  // Calculate violation statistics
  const violationsQuery = `
    SELECT
      COUNT(*) as total_violations,
      COUNT(CASE WHEN severity = 1 THEN 1 END) as severity_1,
      COUNT(CASE WHEN severity = 2 THEN 1 END) as severity_2,
      COUNT(CASE WHEN severity = 3 THEN 1 END) as severity_3,
      COUNT(CASE WHEN severity = 4 THEN 1 END) as severity_4
    FROM proctoring_violations
    WHERE session_id = $1
  `;

  const violationsResult = await client.query(violationsQuery, [sessionId]);
  const violationStats = violationsResult.rows[0];

  // Get session duration
  const sessionQuery = 'SELECT started_at, ended_at FROM proctoring_sessions WHERE id = $1';
  const sessionResult = await client.query(sessionQuery, [sessionId]);
  const session = sessionResult.rows[0];

  const duration = session.ended_at
    ? Math.floor((new Date(session.ended_at) - new Date(session.started_at)) / 1000)
    : Math.floor((new Date() - new Date(session.started_at)) / 1000);

  // Calculate compliance score (0-100, lower violations = higher score)
  const totalViolations = parseInt(violationStats.total_violations) || 0;
  const complianceScore = Math.max(0, 100 - (totalViolations * 10)); // Deduct 10 points per violation

  // Determine risk level
  let riskLevel = 'low';
  if (totalViolations >= 5) {riskLevel = 'critical';}
  else if (totalViolations >= 3) {riskLevel = 'high';}
  else if (totalViolations >= 1) {riskLevel = 'medium';}

  // Upsert analytics
  await client.query(`
    INSERT INTO proctoring_analytics
    (session_id, total_violations, violations_by_severity, session_duration_seconds, compliance_score, risk_level)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (session_id) DO UPDATE SET
      total_violations = EXCLUDED.total_violations,
      violations_by_severity = EXCLUDED.violations_by_severity,
      session_duration_seconds = EXCLUDED.session_duration_seconds,
      compliance_score = EXCLUDED.compliance_score,
      risk_level = EXCLUDED.risk_level
  `, [
    sessionId,
    totalViolations,
    JSON.stringify({
      1: parseInt(violationStats.severity_1) || 0,
      2: parseInt(violationStats.severity_2) || 0,
      3: parseInt(violationStats.severity_3) || 0,
      4: parseInt(violationStats.severity_4) || 0
    }),
    duration,
    complianceScore,
    riskLevel
  ]);
}

// Suspend a quiz attempt (teacher-controlled)
export async function suspendQuizAttempt(req, res) {
  try {
    const { attemptId } = req.params;
    const { reason, suspendedBy } = req.body;

    if (!reason || !suspendedBy) {
      return res.status(400).json({ error: 'reason and suspendedBy are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if attempt exists
      const attemptCheck = await client.query('SELECT * FROM quiz_attempts WHERE id = $1', [attemptId]);
      if (attemptCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Quiz attempt not found' });
      }

      // eslint-disable-next-line no-unused-vars
      const _attempt = attemptCheck.rows[0];

      // Mark attempt as suspended (don't set finished_at so it can be resumed)
      const suspendQuery = `
        UPDATE quiz_attempts
        SET suspension_reason = $1, suspended_at = NOW(), resumed_at = NULL, violated = true
        WHERE id = $2
        RETURNING *
      `;
      const attemptResult = await client.query(suspendQuery, [reason, attemptId]);

      // Update proctoring session status if exists
      const sessionQuery = `
        UPDATE proctoring_sessions
        SET status = 'suspended'
        WHERE quiz_attempt_id = $1
      `;
      await client.query(sessionQuery, [attemptId]);

      await client.query('COMMIT');

      // Notify student via WebSocket if session exists
      const sessionCheck = await client.query('SELECT session_token FROM proctoring_sessions WHERE quiz_attempt_id = $1', [attemptId]);
      if (sessionCheck.rows.length > 0) {
        const io = req.app.get('io');
        if (io) {
          io.to(`proctoring-${sessionCheck.rows[0].session_token}`).emit('session-suspended', {
            reason,
            suspendedBy,
            timestamp: new Date().toISOString()
          });
        }
      }

      res.json({
        message: 'Quiz attempt suspended successfully',
        attempt: attemptResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error suspending quiz attempt:', error);
    res.status(500).json({ error: error.message || 'Failed to suspend attempt' });
  }
}

// Resume a suspended quiz attempt (teacher-controlled)
export async function resumeQuizAttempt(req, res) {
  try {
    const { attemptId } = req.params;
    const { resumedBy } = req.body;

    if (!resumedBy) {
      return res.status(400).json({ error: 'resumedBy is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update quiz attempt to resume
      const updateQuery = `
        UPDATE quiz_attempts
        SET resumed_at = NOW()
        WHERE id = $1 AND suspended_at IS NOT NULL
        RETURNING *
      `;
      const attemptResult = await client.query(updateQuery, [attemptId]);

      if (attemptResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Suspended quiz attempt not found' });
      }

      // Update proctoring session status if exists
      const sessionQuery = `
        UPDATE proctoring_sessions
        SET status = 'active'
        WHERE quiz_attempt_id = $1
      `;
      await client.query(sessionQuery, [attemptId]);

      await client.query('COMMIT');

      // Notify student via WebSocket if session exists
      const sessionCheck = await client.query('SELECT session_token FROM proctoring_sessions WHERE quiz_attempt_id = $1', [attemptId]);
      if (sessionCheck.rows.length > 0) {
        const io = req.app.get('io');
        if (io) {
          io.to(`proctoring-${sessionCheck.rows[0].session_token}`).emit('session-resumed', {
            resumedBy,
            timestamp: new Date().toISOString()
          });
        }
      }

      res.json({
        message: 'Quiz attempt resumed successfully',
        attempt: attemptResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error resuming quiz attempt:', error);
    res.status(500).json({ error: error.message || 'Failed to resume attempt' });
  }
}

// Get suspended quiz attempts for a teacher
export async function getSuspendedAttempts(req, res) {
  try {
    const teacherId = req.user?.id;
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get courses taught by this teacher
    const coursesQuery = `
      SELECT DISTINCT co.id as course_offering_id
      FROM course_offerings co
      WHERE co.faculty_id = $1
    `;
    const coursesResult = await pool.query(coursesQuery, [teacherId]);

    if (coursesResult.rows.length === 0) {
      return res.json({ suspended_attempts: [] });
    }

    const courseOfferingIds = coursesResult.rows.map(row => row.course_offering_id);

    // Get suspended quiz attempts for these courses (including resumed ones)
    const attemptsQuery = `
      SELECT
        qa.*,
        u.name as student_name,
        u.email as student_email,
        q.title as quiz_title,
        c.code as course_code,
        c.title as course_title,
        ps.session_token,
        ps.status as proctoring_status
      FROM quiz_attempts qa
      JOIN users u ON qa.student_id = u.id
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      LEFT JOIN proctoring_sessions ps ON qa.proctoring_session_id = ps.id
      WHERE co.id = ANY($1)
        AND (
          qa.suspended_at IS NOT NULL
          OR ps.status = 'suspended'
        )
        AND qa.finished_at IS NULL
      ORDER BY COALESCE(qa.suspended_at, ps.updated_at) DESC
    `;

    const attemptsResult = await pool.query(attemptsQuery, [courseOfferingIds]);

    // Get violation details for each attempt
    const suspendedAttempts = await Promise.all(
      attemptsResult.rows.map(async (attempt) => {
        if (attempt.proctoring_session_id) {
          const violationsQuery = `
            SELECT violation_type, severity, description, timestamp
            FROM proctoring_violations
            WHERE session_id = $1
            ORDER BY timestamp DESC
            LIMIT 10
          `;
          const violationsResult = await pool.query(violationsQuery, [attempt.proctoring_session_id]);
          attempt.violations = violationsResult.rows;
        }
        return attempt;
      })
    );

    res.json({ suspended_attempts: suspendedAttempts });
  } catch (error) {
    console.error('Error fetching suspended attempts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch suspended attempts' });
  }
}

// Mark a suspended quiz attempt as violated with score -1
export async function markAttemptAsViolated(req, res) {
  try {
    const { attemptId } = req.params;
    const { markedBy } = req.body;

    if (!markedBy) {
      return res.status(400).json({ error: 'markedBy is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update quiz attempt as violated with score -1
      const updateQuery = `
        UPDATE quiz_attempts
        SET violated = true, score = -1, finished_at = NOW(), suspension_reason = 'Marked as violated by teacher'
        WHERE id = $1
        RETURNING *
      `;
      const attemptResult = await client.query(updateQuery, [attemptId]);

      if (attemptResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Suspended quiz attempt not found' });
      }

      // Update proctoring session status if exists
      const sessionQuery = `
        UPDATE proctoring_sessions
        SET status = 'completed'
        WHERE quiz_attempt_id = $1
      `;
      await client.query(sessionQuery, [attemptId]);

      await client.query('COMMIT');

      res.json({
        message: 'Quiz attempt marked as violated successfully',
        attempt: attemptResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error marking attempt as violated:', error);
    res.status(500).json({ error: error.message || 'Failed to mark attempt as violated' });
  }
}

// Delete a quiz attempt (for resetting violated attempts)
export async function deleteQuizAttempt(req, res) {
  try {
    const { attemptId } = req.params;

    const result = await pool.query('DELETE FROM quiz_attempts WHERE id = $1 RETURNING *', [attemptId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    res.json({ message: 'Attempt deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz attempt:', error);
    res.status(500).json({ error: error.message || 'Failed to delete attempt' });
  }
}

// Helper function to update quiz gamification stats and check achievements
async function updateQuizGamificationStats(client, userId, score, quizId) {
  try {
    // Get quiz details for score calculation
    const quizQuery = 'SELECT max_score FROM quizzes WHERE id = $1';
    const quizResult = await client.query(quizQuery, [quizId]);
    const quiz = quizResult.rows[0];

    if (!quiz) {return;}

    // Calculate score percentage
    const scorePercentage = quiz.max_score > 0 ? (score / quiz.max_score) * 100 : 0;

    // Get current stats
    const statsQuery = 'SELECT * FROM user_gamification_stats WHERE user_id = $1';
    const statsResult = await client.query(statsQuery, [userId]);
    let stats = statsResult.rows[0];

    if (!stats) {
      // Create initial stats
      const insertResult = await client.query(
        'INSERT INTO user_gamification_stats (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
      stats = insertResult.rows[0];
    }

    // Update quiz stats
    const updates = {
      quizzes_completed: stats.quizzes_completed + 1,
      total_quiz_score: stats.total_quiz_score + score,
      last_quiz_date: new Date().toISOString().split('T')[0]
    };

    // Calculate new average
    updates.average_quiz_score = Math.round((updates.total_quiz_score / updates.quizzes_completed) * 100) / 100;

    // Check for perfect score (100%)
    if (scorePercentage >= 100) {
      updates.perfect_quiz_scores = (stats.perfect_quiz_scores || 0) + 1;
    }

    // Check for high score (90%+)
    if (scorePercentage >= 90) {
      updates.high_quiz_scores = (stats.high_quiz_scores || 0) + 1;
    }

    // Update database
    await client.query(`
      UPDATE user_gamification_stats SET
        quizzes_completed = $1,
        perfect_quiz_scores = $2,
        high_quiz_scores = $3,
        total_quiz_score = $4,
        average_quiz_score = $5,
        last_quiz_date = $6,
        total_points = total_points + 10,
        updated_at = now()
      WHERE user_id = $7
    `, [
      updates.quizzes_completed,
      updates.perfect_quiz_scores || stats.perfect_quiz_scores || 0,
      updates.high_quiz_scores || stats.high_quiz_scores || 0,
      updates.total_quiz_score,
      updates.average_quiz_score,
      updates.last_quiz_date,
      userId
    ]);

    // Check and unlock quiz achievements
    await checkQuizAchievements(client, userId, updates);

  } catch (error) {
    console.error('Error updating quiz gamification stats:', error);
    // Don't throw error to avoid breaking quiz submission
  }
}

// Grade a quiz attempt with overall grade and feedback
export async function gradeQuizAttemptOverall(req, res) {
  try {
    const attemptId = Number(req.params.attemptId);
    const { grade, feedback } = req.body;

    if (!attemptId) {return res.status(400).json({ error: 'Missing attempt id' });}
    if (grade === undefined || grade === null) {return res.status(400).json({ error: 'Grade is required' });}

    // Verify the user has permission to grade this attempt
    const checkQ = `
      SELECT qa.id, qa.quiz_id, q.course_offering_id, co.faculty_id
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN course_offerings co ON q.course_offering_id = co.id
      WHERE qa.id = $1
    `;
    const checkR = await pool.query(checkQ, [attemptId]);
    if (checkR.rowCount === 0) {return res.status(404).json({ error: 'Attempt not found' });}

    const attempt = checkR.rows[0];

    // Check if current user is faculty for this offering or admin
    if (req.user.role !== 'admin' && req.user.id !== attempt.faculty_id) {
      return res.status(403).json({ error: 'Not authorized to grade this attempt' });
    }

    // Update the attempt with grade
    const updateQ = `
      UPDATE quiz_attempts
      SET grade = $1, feedback = $2, graded_at = NOW(), graded_by = $3
      WHERE id = $4
      RETURNING *
    `;
    const updateR = await pool.query(updateQ, [grade, feedback || '', req.user.id, attemptId]);

    res.json(updateR.rows[0]);
  } catch (err) {
    console.error('Error grading quiz attempt:', err);
    res.status(500).json({ error: err.message || 'Failed to grade attempt' });
  }
}

// Get quiz results summary for teachers/TAs/admins
export async function getQuizResultsSummary(req, res) {
  try {
    const { quizId } = req.params;

    const quizQuery = `
      SELECT q.*, c.code as course_code, c.title as course_title, co.faculty_id
      FROM quizzes q
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE q.id = $1
    `;
    const quizResult = await pool.query(quizQuery, [quizId]);

    if (quizResult.rowCount === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult.rows[0];

    if (req.user.role !== 'admin') {
      if (req.user.role === 'faculty' && Number(req.user.id) !== Number(quiz.faculty_id)) {
        return res.status(403).json({ error: 'Not authorized to view this quiz' });
      }

      if (req.user.role === 'ta') {
        const taCheck = await pool.query(
          'SELECT 1 FROM ta_assignments WHERE ta_id = $1 AND course_offering_id = $2',
          [req.user.id, quiz.course_offering_id]
        );
        if (taCheck.rowCount === 0) {
          return res.status(403).json({ error: 'Not authorized to view this quiz' });
        }
      }
    }

    res.json(await getGoogleFormQuizResultsData(quizId, req.user.id));
  } catch (error) {
    console.error('Error fetching quiz results summary:', error);
    if (error.message === 'Google not connected') {
      return res.status(403).json({ error: 'Connect Google to view Google Form quiz results' });
    }
    if (error.message === 'Linked Google Form is missing for this quiz') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to fetch quiz results summary' });
  }
}

// Get quiz results for a student (their attempts)
export async function getQuizResults(req, res) {
  try {
    const { quizId } = req.params;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get quiz details
    const quizQuery = `
      SELECT q.*, c.code as course_code, c.title as course_title
      FROM quizzes q
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE q.id = $1
    `;
    const quizResult = await pool.query(quizQuery, [quizId]);

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult.rows[0];

    // Get student's attempts for this quiz
    const attemptsQuery = `
      SELECT
        qa.*,
        CASE WHEN qa.violated THEN 'Violated - Score Penalized' ELSE 'Completed' END as status_text
      FROM quiz_attempts qa
      WHERE qa.quiz_id = $1 AND qa.student_id = $2
      ORDER BY qa.finished_at DESC NULLS LAST, qa.started_at DESC NULLS LAST
    `;
    const attemptsResult = await pool.query(attemptsQuery, [quizId, studentId]);

    // Parse answers for each attempt
    const attempts = attemptsResult.rows.map(attempt => ({
      ...attempt,
      answers: typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : attempt.answers
    }));

    // Get quiz questions (without correct answers for security)
    const questionsQuery = `
      SELECT id, question_text, question_type, metadata
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY id
    `;
    const questionsResult = await pool.query(questionsQuery, [quizId]);

    // Remove correct answers from questions for security
    const questions = questionsResult.rows.map(q => {
      const metadata = typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata;
      const studentMetadata = { ...metadata };
      if (q.question_type === 'mcq' || q.question_type === 'true_false') {
        delete studentMetadata.correct_answer;
      }
      return {
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        metadata: studentMetadata
      };
    });

    res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        max_score: quiz.max_score,
        is_proctored: quiz.is_proctored,
        course_code: quiz.course_code,
        course_title: quiz.course_title
      },
      attempts,
      questions
    });
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quiz results' });
  }
}

// Get all quiz attempts for a student across all quizzes
export async function getStudentQuizAttempts(req, res) {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const query = `
      SELECT
        qa.*,
        q.title as quiz_title,
        q.max_score as quiz_max_score,
        c.code as course_code,
        c.title as course_title,
        CASE WHEN qa.violated THEN 'Violated - Score Penalized' ELSE 'Completed' END as status_text
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE qa.student_id = $1
      ORDER BY qa.finished_at DESC NULLS LAST, qa.started_at DESC NULLS LAST
    `;

    const result = await pool.query(query, [studentId]);

    // Parse answers for each attempt
    const attempts = result.rows.map(attempt => ({
      ...attempt,
      answers: typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : attempt.answers
    }));

    res.json({ attempts });
  } catch (error) {
    console.error('Error fetching student quiz attempts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quiz attempts' });
  }
}

// Helper function to check and unlock quiz achievements
async function checkQuizAchievements(client, userId, stats) {
  try {
    const unlockedAchievements = [];

    // Get all quiz achievements
    const achievements = await client.query(
      'SELECT * FROM achievements WHERE category = \'quiz\' AND is_active = true'
    );

    for (const achievement of achievements.rows) {
      // Check if user already has this achievement
      const existing = await client.query(
        'SELECT 1 FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
        [userId, achievement.id]
      );

      if (existing.rows.length > 0) {continue;} // Already unlocked

      let shouldUnlock = false;

      // Check achievement requirements
      switch (achievement.requirement_type) {
      case 'quizzes_completed':
        shouldUnlock = stats.quizzes_completed >= achievement.requirement_value;
        break;
      case 'perfect_quiz_score':
        shouldUnlock = (stats.perfect_quiz_scores || 0) >= achievement.requirement_value;
        break;
      case 'high_quiz_scores':
        shouldUnlock = (stats.high_quiz_scores || 0) >= achievement.requirement_value;
        break;
      case 'consistent_quiz_performance':
        shouldUnlock = stats.average_quiz_score >= 80;
        break;
        // Add more achievement types as needed
      }

      if (shouldUnlock) {
        // Unlock achievement
        await client.query(
          'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
          [userId, achievement.id]
        );

        // Add achievement points
        await client.query(
          'UPDATE user_gamification_stats SET total_points = total_points + $1 WHERE user_id = $2',
          [achievement.points_reward, userId]
        );

        unlockedAchievements.push(achievement);
      }
    }

    return unlockedAchievements;
  } catch (error) {
    console.error('Error checking quiz achievements:', error);
    return [];
  }
}
