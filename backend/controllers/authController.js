import { pool } from '../db/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import express from 'express';
import axios from 'axios';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = '7d';
const router = express.Router();

// REGISTER
export async function registerUser(req, res) {
  try {
    const { name, email, password, role = 'student', department_id, roll_number } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // check if user exists
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rowCount > 0) return res.status(400).json({ error: 'Email already registered' });

    // hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user with password_hash
    const query = `
      INSERT INTO users (name, email, role, department_id, roll_number, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, department_id, roll_number
    `;
    const result = await pool.query(query, [name, email, role, department_id, roll_number, hashedPassword]);

    res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
  } catch (err) {
    console.error('registerUser error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// LOGIN
export async function loginUser(req, res) {
  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate role if provided, default to 'student'
    const validRoles = ['student', 'faculty', 'ta', 'admin'];
    const requestedRole = role && validRoles.includes(role) ? role : 'student';

    // Find user in database
    const userQuery = await pool.query(
      'SELECT id, name, email, role, password_hash, department_id, roll_number FROM users WHERE email = $1',
      [email]
    );

    if (userQuery.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userQuery.rows[0];

    // Check password - if user has no password_hash, they might be an OAuth-only user
    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account was created with Google Sign-In. Please use Google Sign-In to log in.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify the user's role matches the requested role
    // Admins can access any role, but regular users must match their registered role
    let loginRole = user.role;
    
    if (user.role !== requestedRole) {
      if (user.role === 'admin') {
        // Admins can switch to any role for testing/management purposes
        loginRole = requestedRole;
      } else {
        // Regular users must use their registered role
        return res.status(403).json({ 
          error: `This account is registered as ${user.role === 'faculty' ? 'teacher' : user.role}. Please select the correct role.` 
        });
      }
    }

    // Generate JWT token with the appropriate role
    const token = jwt.sign(
      { id: user.id, email: user.email, role: loginRole },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return success response with token
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: loginRole,
        department_id: user.department_id,
        roll_number: user.roll_number
      }
    });
  } catch (err) {
    console.error('Error in loginUser:', err);
    // Provide more detailed error message in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Internal server error: ${err.message}` 
      : 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
}

// GOOGLE LOGIN
export async function loginWithGoogle(req, res) {
  try {
    const { credential, role } = req.body;

    // Validate input
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Validate role if provided, default to 'student'
    const validRoles = ['student', 'faculty', 'ta', 'admin'];
    const userRole = role && validRoles.includes(role) ? role : 'student';

    // Verify Google token by calling Google's tokeninfo endpoint
    const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`;
    let googleUser;
    
    try {
      const response = await axios.get(tokenInfoUrl);
      googleUser = response.data;
      
      // Token verified successfully (silent in production)
    } catch (axiosError) {
      console.error('Error verifying Google token:', axiosError.message);
      if (axiosError.response) {
        console.error('Response status:', axiosError.response.status);
        console.error('Response data:', axiosError.response.data);
        if (axiosError.response.status === 400) {
          return res.status(401).json({ error: 'Invalid Google token' });
        }
      }
      return res.status(500).json({ 
        error: 'Failed to verify Google token',
        details: process.env.NODE_ENV === 'development' ? axiosError.message : undefined
      });
    }

    // Verify the token is from the expected audience (optional but recommended)
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (GOOGLE_CLIENT_ID && googleUser.aud !== GOOGLE_CLIENT_ID) {
      return res.status(401).json({ error: 'Invalid token audience' });
    }

    // Extract user information from Google token
    const email = googleUser.email;
    const name = googleUser.name || googleUser.given_name || 'User';
    const picture = googleUser.picture;

    if (!email) {
      return res.status(400).json({ error: 'Email not provided by Google' });
    }

    // Check if user exists in database
    let userQuery;
    try {
      userQuery = await pool.query(
        'SELECT id, name, email, role, department_id, roll_number FROM users WHERE email = $1',
        [email]
      );
    } catch (dbError) {
      console.error('Database error when checking user:', dbError);
      return res.status(500).json({ 
        error: 'Database error',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    let user;

    if (userQuery.rowCount === 0) {
      // User doesn't exist, create a new user with the selected role
      try {
        const insertQuery = `
          INSERT INTO users (name, email, role, password_hash)
          VALUES ($1, $2, $3, NULL)
          RETURNING id, name, email, role, department_id, roll_number
        `;
        const insertResult = await pool.query(insertQuery, [name, email, userRole]);
        user = insertResult.rows[0];
        // New user created successfully
      } catch (insertError) {
        console.error('Database error when creating user:', insertError);
        return res.status(500).json({ 
          error: 'Failed to create user',
          details: process.env.NODE_ENV === 'development' ? insertError.message : undefined
        });
      }
    } else {
      // User already exists - use their existing role (for security, don't allow role changes via Google sign-in)
      user = userQuery.rows[0];
      
      // User's existing role is preserved (security measure)
      
      // Update user name if it's different (in case user changed name in Google)
      if (user.name !== name) {
        try {
          await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, user.id]);
          user.name = name;
        } catch (updateError) {
          console.error('Database error when updating user name:', updateError);
          // Don't fail the login if name update fails, just log it
        }
      }
      
      // Existing user signed in successfully
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return success response with token
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'student',
        department_id: user.department_id,
        roll_number: user.roll_number
      }
    });
  } catch (err) {
    console.error('Error in loginWithGoogle:', err);
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Internal server error: ${err.message}` 
      : 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
}

// GET USER DETAILS
export async function getUserDetails(req, res) {
  try {
    const userId = req.params.id;
    const requestingUserId = req.user?.id;

    // Users can only view their own details unless they're admin
    if (String(userId) !== String(requestingUserId) && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userQuery = await pool.query(
      `SELECT id, name, email, role, department_id, roll_number, created_at 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userQuery.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userQuery.rows[0];

    // Get enrolled courses if student
    if (user.role === 'student') {
      const coursesQuery = await pool.query(
        `SELECT co.id, c.code as course_code, c.title as name
         FROM enrollments e
         JOIN course_offerings co ON e.course_offering_id = co.id
         JOIN courses c ON co.course_id = c.id
         WHERE e.student_id = $1 AND e.status = 'active'`,
        [userId]
      );
      user.enrolledCourses = coursesQuery.rows;
    }

    res.json(user);
  } catch (err) {
    console.error('Error in getUserDetails:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}