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

let ensureLiveLectureAttendanceSheetsTablePromise = null;

async function ensureLiveLectureAttendanceSheetsTable() {
  if (!ensureLiveLectureAttendanceSheetsTablePromise) {
    ensureLiveLectureAttendanceSheetsTablePromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS live_lecture_attendance_sheets (
          id BIGSERIAL PRIMARY KEY,
          course_offering_id BIGINT UNIQUE NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
          spreadsheet_id TEXT UNIQUE NOT NULL,
          spreadsheet_url TEXT NOT NULL,
          created_by BIGINT REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    })().catch(error => {
      ensureLiveLectureAttendanceSheetsTablePromise = null;
      throw error;
    });
  }

  return ensureLiveLectureAttendanceSheetsTablePromise;
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

  const emails = responses.map(r => r.respondentEmail).filter(Boolean);
  let userMap = new Map();
  let dbAttemptsMap = new Map();

  if (emails.length > 0) {
    const userResult = await pool.query(
      'SELECT id, name, email FROM users WHERE email = ANY($1)',
      [emails]
    );
    userResult.rows.forEach(user => {
      userMap.set(user.email.toLowerCase(), user);
    });

    const studentIds = userResult.rows.map(u => u.id);
    const dbAttempts = await pool.query(
      'SELECT id, student_id, score, violated, suspended_at, finished_at FROM quiz_attempts WHERE quiz_id = $1 AND student_id = ANY($2)',
      [quizId, studentIds]
    );
    dbAttempts.rows.forEach(att => {
      dbAttemptsMap.set(att.student_id, att);
    });
  }

  const attempts = responses.map(response => {
    const score = getResponseScore(response);
    const answers = Object.entries(response.answers || {}).map(([questionId, answer]) => ({
      question_id: questionId,
      question_title: questionTitles.get(questionId) || questionId,
      answer: readAnswerValue(answer),
      score: typeof answer?.grade?.score === 'number' ? answer.grade.score : null,
    }));
    
    const email = response.respondentEmail ? response.respondentEmail.toLowerCase() : null;
    const dbUser = email ? userMap.get(email) : null;
    const dbAttempt = dbUser ? dbAttemptsMap.get(dbUser.id) : null;
    
    const studentName = dbUser ? dbUser.name : (email ? email.split('@')[0] : 'Google Forms respondent');
    const studentId = dbUser ? dbUser.id : null;

    return {
      id: dbAttempt ? dbAttempt.id : response.responseId,
      google_response_id: response.responseId,
      student_id: studentId,
      student_name: studentName,
      student_email: email,
      started_at: dbAttempt?.started_at || response.createTime || null,
      finished_at: dbAttempt?.finished_at || response.lastSubmittedTime || response.createTime || null,
      score: dbAttempt ? dbAttempt.score : score,
      grade: dbAttempt ? dbAttempt.score : score,
      feedback: null,
      graded_at: response.lastSubmittedTime || null,
      violated: dbAttempt ? dbAttempt.violated : false,
      suspended_at: dbAttempt ? dbAttempt.suspended_at : null,
      resumed_at: null,
      needs_manual_grading: score === null && !dbAttempt,
      answers,
      is_in_db: !!dbAttempt,
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
      'https://www.googleapis.com/auth/youtube.upload', // YouTube Upload scope
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
              gs.repo_url as repository_url
       FROM assignment_submissions s
       JOIN users u ON s.student_id = u.id
       LEFT JOIN github_submissions gs ON s.id = gs.submission_id
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

    // Determine columns based on assignment type
    const assignmentType = assignment.assignment_type || 'file';
    const isGithub = assignmentType === 'github';
    
    const headers = [
      'Student Name',
      'Email',
      'Submitted At',
      'Status',
      'Score',
      'Feedback',
    ];

    if (isGithub) {
      headers.push('Repository URL');
    } else {
      headers.push('Files Count');
      headers.push('Submission Notes');
    }

    // Add header row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Submissions!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });

    // Add submission rows
    if (submissions.length > 0) {
      const rows = submissions.map(sub => {
        const row = [
          sub.student_name || '',
          sub.student_email || '',
          sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '',
          sub.status || 'pending',
          sub.final_score?.toString() || '',
          '', // Placeholder for Feedback
        ];

        if (isGithub) {
          row.push(sub.repository_url || '');
        } else {
          const filesCount = Array.isArray(sub.files) ? sub.files.length : 0;
          row.push(filesCount.toString());
          row.push(sub.content || '');
        }
        return row;
      });

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

export async function getOrCreateLiveLectureAttendanceSheet(req, res) {
  try {
    const { courseOfferingId } = req.params;
    const userId = req.user.id;

    if (!courseOfferingId) {
      return res.status(400).json({ error: 'Missing course offering ID' });
    }

    await ensureLiveLectureAttendanceSheetsTable();

    // Check if sheet already exists for this course
    const existingSheet = await pool.query(
      'SELECT spreadsheet_id, spreadsheet_url FROM live_lecture_attendance_sheets WHERE course_offering_id = $1',
      [courseOfferingId]
    );

    // Fetch course details
    const courseResult = await pool.query(
      `SELECT c.code, c.title 
       FROM course_offerings co 
       JOIN courses c ON co.course_id = c.id 
       WHERE co.id = $1`,
      [courseOfferingId]
    );

    if (courseResult.rowCount === 0) {
      return res.status(404).json({ error: 'Course offering not found' });
    }

    const course = courseResult.rows[0];

    // Fetch all students enrolled in this course
    const studentsResult = await pool.query(
      `SELECT u.id, u.name, u.email 
       FROM enrollments e 
       JOIN users u ON e.student_id = u.id 
       WHERE e.course_offering_id = $1 
       ORDER BY u.name`,
      [courseOfferingId]
    );
    const students = studentsResult.rows;

    // Fetch all completed live lectures for this course
    const lecturesResult = await pool.query(
      `SELECT id, title, started_at 
       FROM live_lectures 
       WHERE course_offering_id = $1 AND status = 'ended' 
       ORDER BY started_at ASC`,
      [courseOfferingId]
    );
    const lectures = lecturesResult.rows;

    // Fetch attendance data
    const attendanceResult = await pool.query(
      `SELECT live_lecture_id, user_id 
       FROM live_lecture_participants 
       WHERE live_lecture_id IN (SELECT id FROM live_lectures WHERE course_offering_id = $1)`,
      [courseOfferingId]
    );
    const attendanceMap = new Set(attendanceResult.rows.map(r => `${r.live_lecture_id}-${r.user_id}`));

    const auth = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    let spreadsheetId = existingSheet.rows[0]?.spreadsheet_id;
    let spreadsheetUrl = existingSheet.rows[0]?.spreadsheet_url;

    if (!spreadsheetId) {
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `${course.code} - ${course.title} - Live Lecture Attendance`,
          },
          sheets: [{ properties: { title: 'Attendance' } }],
        },
      });

      spreadsheetId = spreadsheet.data.spreadsheetId;
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

      await pool.query(
        `INSERT INTO live_lecture_attendance_sheets (course_offering_id, spreadsheet_id, spreadsheet_url, created_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (course_offering_id) DO UPDATE
         SET spreadsheet_id = EXCLUDED.spreadsheet_id,
             spreadsheet_url = EXCLUDED.spreadsheet_url,
             created_by = EXCLUDED.created_by`,
        [courseOfferingId, spreadsheetId, spreadsheetUrl, userId]
      );
    }

    // Prepare headers
    const headers = ['Student Name', 'Email', ...lectures.map(l => l.title), 'Total Attendance'];

    // Prepare rows
    const rows = students.map(student => {
      let presentCount = 0;
      const studentRow = [student.name || '', student.email || ''];
      
      lectures.forEach(lecture => {
        const isPresent = attendanceMap.has(`${lecture.id}-${student.id}`);
        if (isPresent) presentCount++;
        studentRow.push(isPresent ? 'Present' : 'Absent');
      });
      
      studentRow.push(presentCount.toString());
      return studentRow;
    });

    // Clear and update sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Attendance!A:Z',
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Attendance!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers, ...rows],
      },
    });

    res.json({ spreadsheetId, spreadsheetUrl });
  } catch (error) {
    console.error('Error creating live lecture attendance sheet:', error);
    if (error.message === 'Google not connected') {
      return res.status(403).json({ error: 'Connect Google to create the attendance sheet' });
    }
    res.status(500).json({ error: error.message || 'Failed to create attendance sheet' });
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

export async function updateGradingSheetRow(req, res) {
  try {
    const { assignmentId } = req.params;
    const { email, score, comments } = req.body;
    const userId = req.user.id;

    if (!assignmentId || !email) {
      return res.status(400).json({ error: 'Missing assignment ID or student email' });
    }

    // Get spreadsheet ID
    const sheetResult = await pool.query(
      `SELECT spreadsheet_id FROM assignment_sheets WHERE assignment_id = $1`,
      [assignmentId]
    );

    if (sheetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Grading sheet not found for this assignment' });
    }

    const spreadsheetId = sheetResult.rows[0].spreadsheet_id;
    const auth = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    // Get all values to find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Submissions!A:Z',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No data found in the sheet' });
    }

    const headers = rows[0];
    const emailIndex = headers.indexOf('Email');
    const scoreIndex = headers.indexOf('Score');
    const feedbackIndex = headers.indexOf('Feedback');

    if (emailIndex === -1 || scoreIndex === -1 || feedbackIndex === -1) {
      return res.status(400).json({ error: 'Sheet format is invalid (missing columns: Email, Score, or Feedback)' });
    }

    // Find student row
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][emailIndex] === email) {
        rowIndex = i + 1; // 1-indexed for Google Sheets
        break;
      }
    }

    if (rowIndex === -1) {
      return res.status(404).json({ error: `Student email ${email} not found in grading sheet` });
    }

    // Update Score and Feedback
    // We update them one by one to avoid overwriting other columns in the row
    
    const updatePromises = [];
    
    // Update Score
    updatePromises.push(
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Submissions!${String.fromCharCode(65 + scoreIndex)}${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[score]] },
      })
    );
    
    // Update Feedback
    updatePromises.push(
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Submissions!${String.fromCharCode(65 + feedbackIndex)}${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[comments]] },
      })
    );

    await Promise.all(updatePromises);

    res.json({ success: true, message: 'Grading sheet updated successfully' });
  } catch (error) {
    console.error('Error updating grading sheet row:', error);
    res.status(500).json({ error: error.message || 'Failed to update grading sheet' });
  }
}

export async function deleteGradingSheet(req, res) {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;

    if (!assignmentId) {
      return res.status(400).json({ error: 'Missing assignment ID' });
    }

    // Check if sheet exists and get spreadsheet_id
    const sheetResult = await pool.query(
      `SELECT spreadsheet_id FROM assignment_sheets WHERE assignment_id = $1`,
      [assignmentId]
    );

    if (sheetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Grading sheet not found' });
    }

    const spreadsheetId = sheetResult.rows[0].spreadsheet_id;

    // Optional: Delete from Google Drive
    try {
      const auth = await getAuthenticatedClient(userId);
      const drive = google.drive({ version: 'v3', auth });
      await drive.files.delete({ fileId: spreadsheetId });
      console.log('Google Sheet deleted from Drive:', spreadsheetId);
    } catch (driveError) {
      console.warn('Failed to delete sheet from Drive (it might already be gone):', driveError.message);
      // We continue even if Drive deletion fails, to clean up our DB
    }

    // Delete from database
    await pool.query(`DELETE FROM assignment_sheets WHERE assignment_id = $1`, [assignmentId]);

    res.json({ success: true, message: 'Grading sheet deleted successfully' });
  } catch (error) {
    console.error('Error deleting grading sheet:', error);
    res.status(500).json({ error: error.message || 'Failed to delete grading sheet' });
  }
}

export async function evaluateQuizResults(req, res) {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    if (!quizId) {
      return res.status(400).json({ error: 'Missing quiz ID' });
    }

    // 1. Fetch latest data from Google Forms
    const results = await getGoogleFormQuizResultsData(quizId, userId);
    const quiz = results.quiz;
    const attempts = results.attempts;

    // 2. Persist matched students into our quiz_attempts table
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const attempt of attempts) {
        if (attempt.student_id) {
          // Check if attempt exists (including deleted ones)
          const existing = await client.query(
            'SELECT id, google_response_id, deleted_at FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2',
            [quizId, attempt.student_id]
          );

          if (existing.rowCount > 0) {
            const dbRecord = existing.rows[0];
            
            // If it was deleted, ONLY re-sync if it's a NEW response from Google Forms
            if (dbRecord.deleted_at && dbRecord.google_response_id === attempt.google_response_id) {
              continue; // Skip this one, it was manually deleted by teacher
            }

            // Update existing record (clear deleted_at if it's a new response)
            await client.query(
              `UPDATE quiz_attempts 
               SET score = $1, finished_at = $2, answers = $3, updated_at = NOW(), 
                   google_response_id = $4, deleted_at = NULL
               WHERE id = $5 AND violated = false`,
              [attempt.score, attempt.finished_at, JSON.stringify(attempt.answers), attempt.google_response_id, dbRecord.id]
            );
          } else {
            // Insert new record
            await client.query(
              `INSERT INTO quiz_attempts (quiz_id, student_id, started_at, finished_at, score, answers, violated, google_response_id)
               VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,
              [quizId, attempt.student_id, attempt.started_at, attempt.finished_at, attempt.score, JSON.stringify(attempt.answers), attempt.google_response_id]
            );
          }
        }
      }
      
      await client.query('COMMIT');
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

    // 3. Re-generate/Update the Google Sheet
    await getOrCreateQuizResultsSheet(req, res);
    
    // getOrCreateQuizResultsSheet already sends the response
  } catch (error) {
    console.error('Error evaluating quiz results:', error);
    res.status(500).json({ error: error.message || 'Failed to evaluate quiz results' });
  }
}

export async function deleteQuizAttemptByTeacher(req, res) {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;
    
    if (isNaN(Number(attemptId))) {
      return res.status(400).json({ error: 'Invalid attempt ID' });
    }

    // 1. Get attempt details before deleting (for email and quiz_id)
    const attemptResult = await pool.query(
      'SELECT a.quiz_id, u.email FROM quiz_attempts a JOIN users u ON a.student_id = u.id WHERE a.id = $1',
      [attemptId]
    );

    if (attemptResult.rowCount === 0) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const { quiz_id, email } = attemptResult.rows[0];

    // 2. Soft-delete in our DB
    await pool.query('UPDATE quiz_attempts SET deleted_at = NOW() WHERE id = $1', [attemptId]);

    // 3. Try to delete from Google Sheet if it exists
    try {
      const sheetResult = await pool.query(
        'SELECT spreadsheet_id FROM assignment_sheets WHERE assignment_id = $1',
        [quiz_id]
      );

      if (sheetResult.rowCount > 0) {
        const spreadsheetId = sheetResult.rows[0].spreadsheet_id;
        const auth = await getAuthenticatedClient(userId);
        const sheets = google.sheets({ version: 'v4', auth });

        // Get all rows
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'Sheet1!A:Z',
        });

        const rows = response.data.values || [];
        // Look for email in Column C (Index 2)
        const rowIndex = rows.findIndex(row => row[2] && row[2].toLowerCase() === email.toLowerCase());

        if (rowIndex !== -1) {
          // Delete the row
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  deleteDimension: {
                    range: {
                      sheetId: 0, // Assuming first sheet
                      dimension: 'ROWS',
                      startIndex: rowIndex,
                      endIndex: rowIndex + 1,
                    },
                  },
                },
              ],
            },
          });
          console.log(`Deleted row ${rowIndex + 1} from spreadsheet ${spreadsheetId} for email ${email}`);
        }
      }
    } catch (sheetError) {
      console.warn('Failed to delete row from Google Sheet:', sheetError.message);
      // We continue since the DB delete was successful
    }

    res.json({ success: true, message: 'Attempt deleted successfully from portal and Google Sheet. Student can now reattempt.' });
  } catch (error) {
    console.error('Error deleting quiz attempt:', error);
    res.status(500).json({ error: error.message || 'Failed to delete attempt' });
  }
}

export async function markQuizAttemptViolatedByTeacher(req, res) {
  try {
    const { attemptId } = req.params;
    if (isNaN(Number(attemptId))) {
      return res.status(400).json({ error: 'Invalid attempt ID. Only portal-synced attempts can be marked as violated.' });
    }

    await pool.query('UPDATE quiz_attempts SET violated = true, score = 0 WHERE id = $1', [attemptId]);
    res.json({ success: true, message: 'Attempt marked as violated and score set to 0.' });
  } catch (error) {
    console.error('Error marking attempt as violated:', error);
    res.status(500).json({ error: error.message || 'Failed to mark violation' });
  }
}
