import { pool } from '../db/index.js';
import { google } from 'googleapis';
import axios from 'axios';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/auth/google/callback';

function getOAuth2Client() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

let ensureQuizSheetsTablePromise = null;

async function ensureQuizSheetsTable() {
  if (!ensureQuizSheetsTablePromise) {
    ensureQuizSheetsTablePromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS quiz_sheets (
          id BIGSERIAL PRIMARY KEY,
          quiz_id BIGINT UNIQUE NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
          spreadsheet_id TEXT UNIQUE NOT NULL,
          spreadsheet_url TEXT NOT NULL,
          created_by BIGINT REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    })().catch(error => {
      ensureQuizSheetsTablePromise = null;
      throw error;
    });
  }

  return ensureQuizSheetsTablePromise;
}

function extractGoogleFormId(url) {
  if (!url) return null;
  const match = String(url).match(/\/forms(?:\/u\/\d+)?\/d(?:\/e)?\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function getFormQuestionTitleMap(form) {
  const questionTitles = new Map();

  for (const item of form?.items || []) {
    const question = item?.questionItem?.question;
    if (question?.questionId) {
      questionTitles.set(question.questionId, item.title || question.questionId);
    }
  }

  return questionTitles;
}

function getFormMaxScore(form) {
  let total = 0;

  for (const item of form?.items || []) {
    const pointValue = item?.questionItem?.question?.grading?.pointValue;
    if (typeof pointValue === 'number') {
      total += pointValue;
    }
  }

  return total > 0 ? total : null;
}

function readAnswerValue(answer) {
  const textAnswers = answer?.textAnswers?.answers;
  if (Array.isArray(textAnswers) && textAnswers.length > 0) {
    return textAnswers.map(entry => entry.value).filter(Boolean).join(', ');
  }

  const fileUploadAnswers = answer?.fileUploadAnswers?.answers;
  if (Array.isArray(fileUploadAnswers) && fileUploadAnswers.length > 0) {
    return fileUploadAnswers.map(entry => entry.fileId || entry.fileName).filter(Boolean).join(', ');
  }

  return '';
}

function getResponseScore(response) {
  if (typeof response?.totalScore === 'number') {
    return response.totalScore;
  }

  const answers = Object.values(response?.answers || {});
  let total = 0;
  let hasGrades = false;

  for (const answer of answers) {
    const gradeScore = answer?.grade?.score;
    if (typeof gradeScore === 'number') {
      total += gradeScore;
      hasGrades = true;
    }
  }

  return hasGrades ? total : null;
}

export async function getGoogleFormQuizResultsData(quizId, userId) {
  const quizResult = await pool.query(
    `
      SELECT q.*, c.code AS course_code, c.title AS course_title
      FROM quizzes q
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE q.id = $1
    `,
    [quizId]
  );

  if (quizResult.rowCount === 0) {
    throw new Error('Quiz not found');
  }

  const quiz = quizResult.rows[0];
  const formId = quiz.google_form_id || extractGoogleFormId(quiz.google_form_url);

  if (!formId) {
    throw new Error('Linked Google Form is missing for this quiz');
  }

  const auth = await getAuthenticatedClient(userId);
  const forms = google.forms({ version: 'v1', auth });

  const [formResponse, responsesResponse] = await Promise.all([
    forms.forms.get({ formId }),
    forms.forms.responses.list({ formId }),
  ]);

  const form = formResponse.data || {};
  const responses = responsesResponse.data.responses || [];
  const questionTitles = getFormQuestionTitleMap(form);
  const derivedMaxScore = getFormMaxScore(form);
  const maxScore = Number(quiz.max_score || derivedMaxScore || 100);

  const attempts = responses.map(response => {
    const score = getResponseScore(response);
    const answers = Object.entries(response.answers || {}).map(([questionId, answer]) => ({
      question_id: questionId,
      question_title: questionTitles.get(questionId) || questionId,
      answer: readAnswerValue(answer),
      score: typeof answer?.grade?.score === 'number' ? answer.grade.score : null,
    }));
    const email = response.respondentEmail || null;
    const fallbackName = email ? email.split('@')[0] : 'Google Forms respondent';

    return {
      id: response.responseId,
      student_id: null,
      student_name: fallbackName,
      student_email: email,
      started_at: response.createTime || null,
      finished_at: response.lastSubmittedTime || response.createTime || null,
      score,
      grade: score,
      feedback: null,
      graded_at: response.lastSubmittedTime || null,
      violated: false,
      suspended_at: null,
      resumed_at: null,
      needs_manual_grading: score === null,
      answers,
    };
  });

  const scoredAttempts = attempts.filter(attempt => typeof attempt.score === 'number');
  const passThreshold = maxScore * 0.6;
  const averageScore = scoredAttempts.length
    ? scoredAttempts.reduce((sum, attempt) => sum + Number(attempt.score), 0) / scoredAttempts.length
    : null;
  const highestScore = scoredAttempts.length
    ? Math.max(...scoredAttempts.map(attempt => Number(attempt.score)))
    : null;
  const lowestScore = scoredAttempts.length
    ? Math.min(...scoredAttempts.map(attempt => Number(attempt.score)))
    : null;
  const passRate = scoredAttempts.length
    ? (scoredAttempts.filter(attempt => Number(attempt.score) >= passThreshold).length /
        scoredAttempts.length) *
      100
    : null;

  return {
    quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      course_offering_id: quiz.course_offering_id,
      course_code: quiz.course_code,
      course_title: quiz.course_title,
      max_score: maxScore,
      start_at: quiz.start_at,
      end_at: quiz.end_at,
      is_proctored: false,
      time_limit: null,
      google_form_url: quiz.google_form_url || null,
      google_form_id: formId,
    },
    summary: {
      total_attempts: attempts.length,
      scored_attempts: scoredAttempts.length,
      average_score: averageScore,
      highest_score: highestScore,
      lowest_score: lowestScore,
      pass_rate: passRate,
      violated_attempts: 0,
      pending_manual_grading: attempts.filter(attempt => attempt.score === null).length,
    },
    attempts,
  };
}

export async function initiateGoogleOAuth(req, res) {
  try {
    console.log('Google OAuth: Initiating OAuth flow');

    if (!GOOGLE_CLIENT_ID) {
      console.error('Google OAuth: Client ID not configured');
      return res.status(500).json({ error: 'Google OAuth not configured' });
    }

    const oauth2Client = getOAuth2Client();

    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.appdata', // For Application Data folder
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/forms', // Google Forms API
      'https://www.googleapis.com/auth/forms.body', // Google Forms body
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: req.user.id.toString(),
    });

    console.log('Google OAuth: Generated authUrl');
    res.json({ authUrl });
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    res.status(500).json({ error: 'Failed to initiate Google OAuth' });
  }
}

export async function handleGoogleOAuthCallback(req, res) {
  try {
    const { code, state } = req.query;
    const userId = state;

    if (!code || !userId) {
      return res.redirect(`${process.env.FRONTEND_URL}/?error=missing_params`);
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Convert expiry_date from milliseconds to proper timestamp
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

    // Store tokens in database
    await pool.query(
      `INSERT INTO user_oauth_tokens (user_id, provider, access_token, refresh_token, expires_at)
       VALUES ($1, 'google', $2, $3, $4)
       ON CONFLICT (user_id, provider) 
       DO UPDATE SET access_token = $2, refresh_token = $3, expires_at = $4`,
      [userId, tokens.access_token, tokens.refresh_token, expiresAt]
    );

    console.log('Google OAuth: Tokens stored for user:', userId);
    res.redirect(`${process.env.FRONTEND_URL}/?google_connected=true`);
  } catch (error) {
    console.error('Error handling Google OAuth callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/?error=oauth_failed`);
  }
}

export async function checkGoogleConnection(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM user_oauth_tokens WHERE user_id = $1 AND provider = 'google'`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ connected: false });
    }

    const tokens = result.rows[0];

    // Check if token needs refresh
    if (tokens.expires_at && new Date(tokens.expires_at) < new Date()) {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({
        refresh_token: tokens.refresh_token,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      const expiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : null;

      await pool.query(
        `UPDATE user_oauth_tokens SET access_token = $1, refresh_token = $2, expires_at = $3 WHERE user_id = $4 AND provider = 'google'`,
        [credentials.access_token, credentials.refresh_token, expiresAt, userId]
      );
    }

    res.json({ connected: true });
  } catch (error) {
    console.error('Error checking Google connection:', error);
    res.status(500).json({ error: 'Failed to check Google connection' });
  }
}

export async function getAuthenticatedClient(userId) {
  const result = await pool.query(
    `SELECT * FROM user_oauth_tokens WHERE user_id = $1 AND provider = 'google'`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Google not connected');
  }

  const tokens = result.rows[0];
  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  // Refresh if needed
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

export async function getOrCreateGradingSheet(req, res) {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;

    if (!assignmentId) {
      return res.status(400).json({ error: 'Missing assignment ID' });
    }

    // Check if sheet already exists for this assignment
    const existingSheet = await pool.query(
      `SELECT spreadsheet_id, spreadsheet_url FROM assignment_sheets WHERE assignment_id = $1`,
      [assignmentId]
    );

    if (existingSheet.rows.length > 0) {
      return res.json({
        spreadsheetId: existingSheet.rows[0].spreadsheet_id,
        spreadsheetUrl: existingSheet.rows[0].spreadsheet_url,
      });
    }

    // Get assignment details and submissions
    const assignmentResult = await pool.query(
      `SELECT a.*, c.code as course_code, c.title as course_title
       FROM assignments a
       JOIN course_offerings o ON a.course_offering_id = o.id
       JOIN courses c ON o.course_id = c.id
       WHERE a.id = $1`,
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentResult.rows[0];

    // Get submissions
    const submissionsResult = await pool.query(
      `SELECT s.*, u.name as student_name, u.email as student_email,
              COALESCE(s.github_repo_url, s.repo_url) as repository_url
       FROM assignment_submissions s
       JOIN users u ON s.student_id = u.id
       WHERE s.assignment_id = $1
       AND s.submitted_at = (
         SELECT MAX(s2.submitted_at) 
         FROM assignment_submissions s2 
         WHERE s2.assignment_id = s.assignment_id AND s2.student_id = s.student_id
       )
       ORDER BY u.name`,
      [assignmentId]
    );

    const submissions = submissionsResult.rows;

    // Create Google Sheet
    const auth = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    // Create new spreadsheet
    const spreadsheetTitle = `${assignment.course_code} - ${assignment.title} - Grading`;

    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: spreadsheetTitle },
        sheets: [
          {
            properties: { title: 'Submissions' },
          },
        ],
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    // Add header row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Submissions!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            'Student Name',
            'Email',
            'Submitted At',
            'Status',
            'Score',
            'Feedback',
            'Repository URL',
          ],
        ],
      },
    });

    // Add submission rows
    if (submissions.length > 0) {
      const rows = submissions.map(sub => [
        sub.student_name || '',
        sub.student_email || '',
        sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '',
        sub.status || 'pending',
        sub.final_score?.toString() || '',
        '',
        sub.repository_url || '',
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Submissions!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
    }

    // Store sheet info in database
    await pool.query(
      `INSERT INTO assignment_sheets (assignment_id, spreadsheet_id, spreadsheet_url, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (assignment_id) DO NOTHING`,
      [assignmentId, spreadsheetId, spreadsheetUrl, userId]
    );

    console.log('Google Sheet created:', spreadsheetUrl);
    res.json({ spreadsheetId, spreadsheetUrl });
  } catch (error) {
    console.error('Error creating grading sheet:', error);
    res.status(500).json({ error: error.message || 'Failed to create grading sheet' });
  }
}

export async function getOrCreateQuizResultsSheet(req, res) {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    if (!quizId) {
      return res.status(400).json({ error: 'Missing quiz ID' });
    }

    await ensureQuizSheetsTable();

    const quizResult = await pool.query(
      `SELECT q.*, c.code as course_code, c.title as course_title, co.faculty_id
       FROM quizzes q
       JOIN course_offerings co ON q.course_offering_id = co.id
       JOIN courses c ON co.course_id = c.id
       WHERE q.id = $1`,
      [quizId]
    );

    if (quizResult.rowCount === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult.rows[0];

    if (req.user.role !== 'admin') {
      if (req.user.role === 'faculty' && Number(req.user.id) !== Number(quiz.faculty_id)) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      if (req.user.role === 'ta') {
        const taCheck = await pool.query(
          'SELECT 1 FROM ta_assignments WHERE ta_id = $1 AND course_offering_id = $2',
          [req.user.id, quiz.course_offering_id]
        );
        if (taCheck.rowCount === 0) {
          return res.status(403).json({ error: 'Not authorized' });
        }
      }
    }

    const results = await getGoogleFormQuizResultsData(quizId, userId);
    const attempts = results.attempts;
    const scoredAttempts = attempts.filter(attempt => typeof attempt.score === 'number');
    const pendingManualGrading = results.summary.pending_manual_grading;
    const averageScore = results.summary.average_score;
    const passRate = results.summary.pass_rate;

    const auth = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    const existingSheet = await pool.query(
      'SELECT spreadsheet_id, spreadsheet_url FROM quiz_sheets WHERE quiz_id = $1',
      [quizId]
    );

    let spreadsheetId = existingSheet.rows[0]?.spreadsheet_id;
    let spreadsheetUrl = existingSheet.rows[0]?.spreadsheet_url;

    if (!spreadsheetId) {
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `${quiz.course_code} - ${quiz.title} - Quiz Results`,
          },
          sheets: [{ properties: { title: 'Summary' } }, { properties: { title: 'Attempts' } }],
        },
      });

      spreadsheetId = spreadsheet.data.spreadsheetId;
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

      await pool.query(
        `INSERT INTO quiz_sheets (quiz_id, spreadsheet_id, spreadsheet_url, created_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (quiz_id) DO UPDATE
         SET spreadsheet_id = EXCLUDED.spreadsheet_id,
             spreadsheet_url = EXCLUDED.spreadsheet_url,
             created_by = EXCLUDED.created_by`,
        [quizId, spreadsheetId, spreadsheetUrl, userId]
      );
    }

    const summaryRows = [
      ['Quiz Title', quiz.title || ''],
      ['Course', `${quiz.course_code || ''} - ${quiz.course_title || ''}`.trim()],
      ['Max Score', String(results.quiz.max_score || 100)],
      ['Total Attempts', String(attempts.length)],
      ['Scored Attempts', String(scoredAttempts.length)],
      ['Average Score', averageScore === null ? '' : Number(averageScore).toFixed(2)],
      ['Pass Rate', passRate === null ? '' : `${Number(passRate).toFixed(1)}%`],
      ['Pending Manual Grading', String(pendingManualGrading)],
      ['Violated Attempts', '0'],
      ['Linked Google Form', quiz.google_form_url || 'Not linked'],
    ];

    const attemptRows = attempts.map(attempt => [
      attempt.student_name || '',
      attempt.student_email || '',
      String(attempt.id),
      attempt.started_at ? new Date(attempt.started_at).toLocaleString() : '',
      attempt.finished_at ? new Date(attempt.finished_at).toLocaleString() : '',
      attempt.score === null || attempt.score === undefined ? '' : String(attempt.score),
      String(results.quiz.max_score || 100),
      attempt.score === null || attempt.score === undefined || !results.quiz.max_score
        ? ''
        : `${((Number(attempt.score) / Number(results.quiz.max_score)) * 100).toFixed(1)}%`,
      'Completed',
      attempt.needs_manual_grading ? 'Yes' : 'No',
    ]);

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Summary!A:Z',
    });
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Attempts!A:Z',
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Metric', 'Value'], ...summaryRows],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Attempts!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            'Student Name',
            'Email',
            'Attempt ID',
            'Started At',
            'Submitted At',
            'Score',
            'Max Score',
            'Percentage',
            'Status',
            'Needs Manual Grading',
          ],
          ...attemptRows,
        ],
      },
    });

    res.json({ spreadsheetId, spreadsheetUrl });
  } catch (error) {
    console.error('Error creating quiz results sheet:', error);
    if (error.message === 'Google not connected') {
      return res.status(403).json({ error: 'Connect Google to create the Google quiz results sheet' });
    }
    if (error.message === 'Linked Google Form is missing for this quiz') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to create quiz results sheet' });
  }
}

export async function disconnectGoogle(req, res) {
  try {
    const userId = req.user.id;

    await pool.query(`DELETE FROM user_oauth_tokens WHERE user_id = $1 AND provider = 'google'`, [
      userId,
    ]);

    res.json({ message: 'Google disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Google:', error);
    res.status(500).json({ error: 'Failed to disconnect Google' });
  }
}
