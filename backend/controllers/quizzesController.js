import { pool } from '../db/index.js';

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
    
    const quizQuery = `SELECT * FROM quizzes WHERE id = $1`;
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

// Submit quiz attempt with auto-grading
export async function submitQuizAttempt(req, res) {
  try {
    const { quiz_id, student_id, answers, violated } = req.body;

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
      const quizQuery = `SELECT max_score FROM quizzes WHERE id = $1`;
      const quizResult = await client.query(quizQuery, [quiz_id]);
      const maxScore = quizResult.rows[0]?.max_score || 100;
      
      // Auto-grade answers
      let totalQuestions = questions.length;
      let correctAnswers = 0;
      
      const gradedAnswers = {};
      
      questions.forEach(question => {
        const studentAnswer = answers[question.id];
        const correctAnswer = question.metadata.correct_answer;
        
        if (question.question_type === 'mcq' || question.question_type === 'true_false') {
          // Auto-grade MCQ and True/False
          const isCorrect = String(studentAnswer) === String(correctAnswer);
          if (isCorrect) correctAnswers++;
          
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
      
      // Calculate score based on auto-graded questions
      // For quizzes with short answers, score will be partial until manual grading
      const autoGradedCount = questions.filter(q => 
        q.question_type === 'mcq' || q.question_type === 'true_false'
      ).length;
      
      const score = autoGradedCount > 0 
        ? (correctAnswers / autoGradedCount) * maxScore 
        : null; // null if all questions need manual grading
      
      // Insert quiz attempt
      const attemptQuery = `
        INSERT INTO quiz_attempts
        (quiz_id, student_id, started_at, finished_at, score, answers, violated)
        VALUES ($1, $2, NOW(), NOW(), $3, $4, $5)
        RETURNING *
      `;
      const attemptResult = await client.query(attemptQuery, [
        quiz_id,
        student_id,
        score,
        JSON.stringify(gradedAnswers),
        violated || false
      ]);
      
      await client.query('COMMIT');
      
      res.status(201).json({
        message: 'Quiz submitted successfully',
        attempt: attemptResult.rows[0],
        graded_answers: gradedAnswers,
        needs_manual_grading: totalQuestions !== autoGradedCount
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
    const { course_offering_id, title, description, start_at, end_at, max_score, questions, is_proctored, time_limit } = req.body;

    console.log('Creating quiz with data:', {
      course_offering_id,
      title,
      is_proctored,
      time_limit,
      questionCount: questions?.length || 0
    });

    // Validate required fields
    if (!course_offering_id || !title) {
      return res.status(400).json({ error: 'course_offering_id and title are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create quiz
      const quizQuery = `INSERT INTO quizzes (course_offering_id, title, start_at, end_at, max_score, is_proctored, time_limit) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
      const quizResult = await client.query(quizQuery, [
        course_offering_id,
        title,
        start_at || null,
        end_at || null,
        max_score || 100,
        is_proctored || false,
        time_limit || null
      ]);
      const quiz = quizResult.rows[0];
    
    // Insert questions if provided
    if (questions && Array.isArray(questions) && questions.length > 0) {
      const questionQuery = `INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata) VALUES ($1, $2, $3, $4) RETURNING *`;
      
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
        if (!answers[qid]) answers[qid] = { student_answer: null, is_correct: null, correct_answer: null };
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
          if (rec.is_correct) correctCount++;
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
