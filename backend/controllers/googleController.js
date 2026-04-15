import { pool } from '../db/index.js';
import { google } from 'googleapis';
import axios from 'axios';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/auth/google/callback';
const SPREADSHEET_ID_STORE_KEY = 'google_sheets_assignment';

function getOAuth2Client() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
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
      'https://www.googleapis.com/auth/userinfo.email',
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

async function getAuthenticatedClient(userId) {
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
