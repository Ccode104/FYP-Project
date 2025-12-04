import { pool } from '../db/index.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { getGitHubUser, validateGitHubToken } from '../utils/github.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = '7d';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/github/callback`;

/**
 * Initiate GitHub OAuth flow
 * GET /api/auth/github
 */
export async function initiateOAuth(req, res) {
  try {
    console.log('GitHub OAuth: Initiating OAuth flow');
    if (!GITHUB_CLIENT_ID) {
      console.error('GitHub OAuth: Client ID not configured');
      return res.status(500).json({ error: 'GitHub OAuth not configured' });
    }

    // Check if user is authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('GitHub OAuth: No authorization header');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('GitHub OAuth: User authenticated, ID:', decoded.id);
    } catch (err) {
      console.log('GitHub OAuth: Invalid token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Generate state parameter for CSRF protection
    const state = jwt.sign(
      { userId: decoded.id, timestamp: Date.now() },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    // GitHub OAuth URL
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=repo,user&state=${state}&response_type=code`;
    console.log('GitHub OAuth: Generated authUrl with redirect_uri:', GITHUB_REDIRECT_URI);

    res.json({
      authUrl: githubAuthUrl,
      state: state
    });
  } catch (error) {
    console.error('Error initiating GitHub OAuth:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle GitHub OAuth callback
 * GET /api/auth/github/callback
 */
export async function handleOAuthCallback(req, res) {
  try {
    console.log('GitHub OAuth: Handling callback, query:', req.query);
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      console.log('GitHub OAuth: OAuth error:', oauthError);
      return res.status(400).json({ error: `GitHub OAuth error: ${oauthError}` });
    }

    if (!code || !state) {
      console.log('GitHub OAuth: Missing code or state');
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }

    // Verify state parameter
    let stateData;
    try {
      stateData = jwt.verify(state, JWT_SECRET);
      console.log('GitHub OAuth: State verified for user:', stateData.userId);
    } catch (err) {
      console.log('GitHub OAuth: Invalid state');
      return res.status(400).json({ error: 'Invalid or expired state parameter' });
    }

    // Exchange authorization code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code: code,
      redirect_uri: GITHUB_REDIRECT_URI
    }, {
      headers: {
        'Accept': 'application/json'
      }
    });

    const { access_token, token_type, scope } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({ error: 'Failed to obtain access token from GitHub' });
    }

    // Get GitHub user information
    const githubUser = await getGitHubUser(access_token);

    // Store the access token in plain text (simplified approach)
    const plainToken = access_token;

    // Update user record with GitHub information
    const updateQuery = `
      UPDATE users
      SET github_access_token = $1,
          github_username = $2,
          github_connected_at = NOW(),
          github_token_expires_at = NOW() + INTERVAL '6 months'
      WHERE id = $3
      RETURNING id, name, email, role, department_id, roll_number, github_username, github_connected_at
    `;

    const result = await pool.query(updateQuery, [
      plainToken,
      githubUser.login,
      stateData.userId
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Generate new JWT token
    const newToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const redirectUrl = `${frontendUrl}/auth/github/success?token=${newToken}&github_connected=true`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error handling GitHub OAuth callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const errorUrl = `${frontendUrl}/auth/github/error?error=${encodeURIComponent(error.message)}`;
    res.redirect(errorUrl);
  }
}

/**
 * Disconnect GitHub integration
 * DELETE /api/auth/github
 */
export async function disconnectGitHub(req, res) {
  try {
    const userId = req.user.id;

    // Clear GitHub integration data
    const updateQuery = `
      UPDATE users
      SET github_access_token = NULL,
          github_username = NULL,
          github_connected_at = NULL,
          github_token_expires_at = NULL
      WHERE id = $1
      RETURNING id
    `;

    const result = await pool.query(updateQuery, [userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'GitHub integration disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user repositories from GitHub
 * GET /api/github/repositories
 */
export async function getUserRepositories(req, res) {
  try {
    const userId = req.user.id;

    // Get user's GitHub access token
    const userQuery = await pool.query(
      'SELECT github_access_token, github_token_expires_at FROM users WHERE id = $1',
      [userId]
    );

    if (userQuery.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userQuery.rows[0];

    if (!user.github_access_token) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    // Check if token is expired
    if (user.github_token_expires_at && new Date(user.github_token_expires_at) < new Date()) {
      return res.status(401).json({ error: 'GitHub token expired. Please reconnect.' });
    }

    // Validate token
    const isValid = await validateGitHubToken(user.github_access_token);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid GitHub token. Please reconnect.' });
    }

    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const per_page = Math.min(parseInt(req.query.per_page) || 30, 100);
    const sort = req.query.sort || 'updated';
    const direction = req.query.direction || 'desc';

    // Import the fetch function here to avoid circular imports
    const { fetchUserRepositories } = await import('../utils/github.js');

    const repositories = await fetchUserRepositories(user.github_access_token, {
      page,
      per_page,
      sort,
      direction
    });

    res.json({
      repositories,
      pagination: {
        page,
        per_page,
        has_more: repositories.length === per_page
      }
    });
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
}