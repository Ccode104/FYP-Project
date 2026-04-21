import { pool } from '../db/index.js';
import { google } from 'googleapis';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/auth/google/callback';

function getOAuth2Client() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

async function getAuthenticatedClient(userId) {
  const result = await pool.query(
    `SELECT * FROM user_oauth_tokens WHERE user_id = $1 AND provider = 'google'`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Google account not connected. Please connect your Google account first.');
  }

  const tokens = result.rows[0];
  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  if (tokens.expires_at && new Date(tokens.expires_at) < new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date).toISOString()
      : null;

    await pool.query(
      `UPDATE user_oauth_tokens SET access_token = $1, refresh_token = $2, expires_at = $3 WHERE user_id = $4 AND provider = 'google'`,
      [credentials.access_token, credentials.refresh_token, expiresAt, userId]
    );
  }

  return oauth2Client;
}

function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[<>]/g, '').trim();
}

function validateQuizData(quizData) {
  const errors = [];

  if (!quizData.title || sanitizeText(quizData.title).length === 0) {
    errors.push('Quiz title is required');
  }

  if (
    !quizData.questions ||
    !Array.isArray(quizData.questions) ||
    quizData.questions.length === 0
  ) {
    errors.push('At least one question is required');
  }

  for (let i = 0; i < quizData.questions.length; i++) {
    const q = quizData.questions[i];
    const qIndex = i + 1;

    if (!q.question || sanitizeText(q.question).length === 0) {
      errors.push(`Question ${qIndex}: Question text is required`);
    }

    if (!q.type) {
      errors.push(`Question ${qIndex}: Question type is required`);
    }

    if (q.type === 'mcq' || q.type === 'checkbox') {
      if (!q.options || q.options.length < 2) {
        errors.push(`Question ${qIndex}: At least 2 options are required for ${q.type} questions`);
      }

      if (!q.correct_answers || q.correct_answers.length === 0) {
        errors.push(`Question ${qIndex}: At least one correct answer is required`);
      }

      if (q.options) {
        const uniqueOptions = new Set(q.options.map(o => o.toLowerCase().trim()));
        if (uniqueOptions.size !== q.options.length) {
          errors.push(`Question ${qIndex}: Duplicate options are not allowed`);
        }
      }
    }
  }

  return errors;
}

export async function createQuiz(req, res) {
  try {
    const userId = req.user.id;
    const {
      course_offering_id,
      title,
      description,
      questions,
      start_at,
      end_at,
      max_score,
      time_limit,
      is_proctored,
    } = req.body;

    const quizData = { title, questions };
    const validationErrors = validateQuizData(quizData);

    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join('; ') });
    }

    if (req.user.role !== 'admin') {
      const checkQ = 'SELECT faculty_id FROM course_offerings WHERE id = $1';
      const checkR = await pool.query(checkQ, [course_offering_id]);
      if (checkR.rowCount === 0)
        return res.status(404).json({ error: 'Course offering not found' });

      const offering = checkR.rows[0];
      if (req.user.role === 'faculty' && req.user.id !== offering.faculty_id) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      if (req.user.role === 'ta') {
        const taCheck = await pool.query(
          'SELECT 1 FROM ta_assignments WHERE ta_id = $1 AND course_offering_id = $2',
          [userId, course_offering_id]
        );
        if (taCheck.rowCount === 0) {
          return res.status(403).json({ error: 'Not authorized' });
        }
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const quizQuery = `
        INSERT INTO quizzes (course_offering_id, title, description, start_at, end_at, max_score, time_limit, is_proctored)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const quizResult = await client.query(quizQuery, [
        course_offering_id,
        sanitizeText(title),
        description ? sanitizeText(description) : null,
        start_at || null,
        end_at || null,
        max_score || 100,
        time_limit || null,
        is_proctored || false,
      ]);
      const quiz = quizResult.rows[0];

      const questionQuery = `
        INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      for (const q of questions) {
        const metadata = {
          options: q.options || [],
          correct_answer: q.type === 'mcq' || q.type === 'checkbox' ? q.correct_answers[0] : null,
          correct_answers: q.correct_answers || [],
          points: q.points || 1,
        };

        await client.query(questionQuery, [
          quiz.id,
          sanitizeText(q.question),
          q.type,
          JSON.stringify(metadata),
        ]);
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

export async function getQuiz(req, res) {
  try {
    const { quizId } = req.params;

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

    const questionsQuery = `
      SELECT id, question_text, question_type, metadata
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY id
    `;
    const questionsResult = await pool.query(questionsQuery, [quizId]);

    const questions = questionsResult.rows.map(q => ({
      id: q.id,
      question: q.question_text,
      type: q.question_type,
      metadata: typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata,
    }));

    res.json({ ...quiz, questions });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quiz' });
  }
}

export async function generateAIQuestions(req, res) {
  try {
    const { topic, difficulty, num_questions, question_types } = req.body;

    if (
      !topic ||
      !difficulty ||
      !num_questions ||
      !question_types ||
      !Array.isArray(question_types) ||
      question_types.length === 0
    ) {
      return res
        .status(400)
        .json({ error: 'topic, difficulty, num_questions, and question_types are required' });
    }

    if (!GROQ_API_KEY) {
      return res.status(503).json({ error: 'AI service is not configured' });
    }

    const typeDescriptions = {
      mcq: 'Multiple Choice (single correct answer)',
      checkbox: 'Multiple Choice (multiple correct answers)',
      short: 'Short Answer',
      paragraph: 'Paragraph/Long Answer',
    };

    const typeStr = question_types.map(t => typeDescriptions[t] || t).join(', ');

    const systemPrompt = `You are an expert quiz generator. Generate quiz questions in JSON format only.
Return a JSON object with this exact structure:
{
  "title": "string - appropriate quiz title based on topic",
  "questions": [
    {
      "type": "mcq" | "checkbox" | "short" | "paragraph",
      "question": "string - the question text",
      "options": ["string"] - only for mcq/checkbox (4 options for mcq, 4-6 for checkbox),
      "correct_answers": ["string"] - for mcq: one answer, for checkbox: array of correct answers
    }
  ]
}

IMPORTANT RULES:
1. Return ONLY valid JSON, no extra text
2. For mcq: exactly 4 options with one correct answer
3. For checkbox: 4-6 options with multiple correct answers
4. For short/paragraph: no options field
5. Make questions clear and unambiguous
6. Ensure correct_answers match exactly one of the options for mcq/checkbox`;

    const userPrompt = `Generate ${num_questions} questions about "${topic}" at ${difficulty} difficulty.
Question types: ${typeStr}

Make sure questions are appropriate for ${difficulty} level.`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'Failed to generate questions' });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    if (!parsed.title || !parsed.questions || !Array.isArray(parsed.questions)) {
      return res.status(500).json({ error: 'Invalid AI response format' });
    }

    res.json(parsed);
  } catch (error) {
    console.error('Error generating AI questions:', error);
    res.status(500).json({ error: error.message || 'Failed to generate questions' });
  }
}

export async function exportToGoogleForm(req, res) {
  try {
    const userId = req.user.id;
    const { quiz } = req.body;

    if (!quiz || !quiz.title || !quiz.questions) {
      return res.status(400).json({ error: 'Quiz data is required' });
    }

    const validationErrors = validateQuizData(quiz);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join('; ') });
    }

    let auth;
    try {
      auth = await getAuthenticatedClient(userId);
    } catch (error) {
      return res
        .status(401)
        .json({ error: 'Google account not connected. Please connect your Google account first.' });
    }

    const forms = google.forms({ version: 'v1', auth });

    const formInfo = {
      info: {
        title: sanitizeText(quiz.title),
        description: quiz.description
          ? sanitizeText(quiz.description)
          : 'Quiz created via FYP Platform',
      },
    };

    const form = await forms.forms.create(formInfo);

    const formId = form.formId;
    const updateRequests = [];

    for (const q of quiz.questions) {
      const questionItem = {
        createItem: {
          item: {
            title: sanitizeText(q.question),
            question: {},
          },
          location: { index: updateRequests.length },
        },
      };

      if (q.type === 'mcq') {
        const options = (q.options || []).map(opt => ({
          value: sanitizeText(opt),
        }));

        const correctIndex = q.correct_answers?.[0] ? q.options?.indexOf(q.correct_answers[0]) : -1;

        questionItem.createItem.item.question = {
          choiceQuestion: {
            type: 'RADIO',
            options: options,
            shuffle: false,
          },
        };

        if (correctIndex >= 0) {
          questionItem.createItem.item.question.grading = {
            correctAnswer: {
              score: 1,
              answers: [{ value: sanitizeText(q.options[correctIndex]) }],
            },
          };
          questionItem.createItem.item.question.gradingPointValue = 1;
        }
      } else if (q.type === 'checkbox') {
        const options = (q.options || []).map(opt => ({
          value: sanitizeText(opt),
        }));

        questionItem.createItem.item.question = {
          choiceQuestion: {
            type: 'CHECKBOX',
            options: options,
            shuffle: false,
          },
        };

        if (q.correct_answers && q.correct_answers.length > 0) {
          const correctAnswers = q.correct_answers.map(a => ({ value: sanitizeText(a) }));
          questionItem.createItem.item.question.grading = {
            correctAnswers: { answers: correctAnswers },
            pointValue: q.correct_answers.length,
          };
        }
      } else if (q.type === 'short') {
        questionItem.createItem.item.question = {
          textQuestion: {},
        };
      } else if (q.type === 'paragraph') {
        questionItem.createItem.item.question = {
          textQuestion: {
            paragraph: true,
          },
        };
      }

      updateRequests.push(questionItem);
    }

    if (updateRequests.length > 0) {
      await forms.forms.batchUpdate({
        formId,
        requestBody: {
          requests: updateRequests,
        },
      });
    }

    const formUrl = `https://docs.google.com/forms/d/e/${formId}/viewform`;

    res.json({
      message: 'Google Form created successfully',
      formId,
      formUrl,
    });
  } catch (error) {
    console.error('Error exporting to Google Form:', error);
    res.status(500).json({ error: error.message || 'Failed to export to Google Form' });
  }
}

export async function updateQuiz(req, res) {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;
    const { title, description, questions, start_at, end_at, max_score, time_limit, is_proctored } =
      req.body;

    const quizData = { title, questions };
    const validationErrors = validateQuizData(quizData);

    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join('; ') });
    }

    const checkQ =
      'SELECT q.*, co.faculty_id FROM quizzes q JOIN course_offerings co ON q.course_offering_id = co.id WHERE q.id = $1';
    const checkR = await pool.query(checkQ, [quizId]);
    if (checkR.rowCount === 0) return res.status(404).json({ error: 'Quiz not found' });

    const quiz = checkR.rows[0];
    if (req.user.role !== 'admin' && req.user.id !== quiz.faculty_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuizQuery = `
        UPDATE quizzes
        SET title = $1, description = $2, start_at = $3, end_at = $4, max_score = $5, time_limit = $6, is_proctored = $7
        WHERE id = $8
        RETURNING *
      `;
      const updatedQuiz = await client.query(updateQuizQuery, [
        sanitizeText(title),
        description ? sanitizeText(description) : null,
        start_at || null,
        end_at || null,
        max_score || 100,
        time_limit || null,
        is_proctored || false,
        quizId,
      ]);

      await client.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]);

      const questionQuery = `
        INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      for (const q of questions) {
        const metadata = {
          options: q.options || [],
          correct_answer: q.type === 'mcq' || q.type === 'checkbox' ? q.correct_answers?.[0] : null,
          correct_answers: q.correct_answers || [],
          points: q.points || 1,
        };

        await client.query(questionQuery, [
          quizId,
          sanitizeText(q.question),
          q.type,
          JSON.stringify(metadata),
        ]);
      }

      await client.query('COMMIT');
      res.json({ message: 'Quiz updated successfully', quiz: updatedQuiz.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to update quiz' });
  }
}

export async function deleteQuiz(req, res) {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    const checkQ =
      'SELECT q.*, co.faculty_id FROM quizzes q JOIN course_offerings co ON q.course_offering_id = co.id WHERE q.id = $1';
    const checkR = await pool.query(checkQ, [quizId]);
    if (checkR.rowCount === 0) return res.status(404).json({ error: 'Quiz not found' });

    const quiz = checkR.rows[0];
    if (req.user.role !== 'admin' && req.user.id !== quiz.faculty_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]);
      await client.query('DELETE FROM quizzes WHERE id = $1', [quizId]);
      await client.query('COMMIT');
      res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to delete quiz' });
  }
}

export async function listQuizzes(req, res) {
  try {
    const userId = req.user.id;
    const { course_offering_id } = req.params;

    let query;
    let params;

    if (req.user.role === 'student') {
      query = `
        SELECT q.*, c.code as course_code, c.title as course_title
        FROM quizzes q
        JOIN course_offerings co ON q.course_offering_id = co.id
        JOIN courses c ON co.course_id = c.id
        WHERE q.course_offering_id = $1
        ORDER BY q.created_at DESC
      `;
      params = [course_offering_id];
    } else {
      query = `
        SELECT q.*, c.code as course_code, c.title as course_title
        FROM quizzes q
        JOIN course_offerings co ON q.course_offering_id = co.id
        JOIN courses c ON co.course_id = c.id
        WHERE q.course_offering_id = $1
        ORDER BY q.created_at DESC
      `;
      params = [course_offering_id];
    }

    const result = await pool.query(query, params);

    const quizzes = await Promise.all(
      result.rows.map(async quiz => {
        const questionsCount = await pool.query(
          'SELECT COUNT(*) as count FROM quiz_questions WHERE quiz_id = $1',
          [quiz.id]
        );

        return {
          ...quiz,
          questions_count: parseInt(questionsCount.rows[0].count) || 0,
        };
      })
    );

    res.json(quizzes);
  } catch (error) {
    console.error('Error listing quizzes:', error);
    res.status(500).json({ error: error.message || 'Failed to list quizzes' });
  }
}
