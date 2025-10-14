import { pool } from '../db/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = '7d';

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
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const userRes = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (userRes.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = userRes.rows[0];
    if (!user.password_hash) return res.status(401).json({ error: 'No password set for this user' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    // generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ message: 'Login successful', token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('loginUser error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET USER DETAILS
export async function getUserDetails(req, res) {
  try {
    const userId = req.params.id;
    console.log(userId);
    const userRes = await pool.query(
      'SELECT id, name, email, role, department_id, roll_number, created_at, updated_at FROM users WHERE id=$1',
      [userId]
    );
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userRes.rows[0]);
  } catch (err) {
    console.error('getUserDetails error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}