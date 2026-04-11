import 'dotenv/config';
import { pool } from './db/index.js';
import bcrypt from 'bcrypt';

async function addDemoUser() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    console.log('Attempting to insert admin@demo.com...');
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
       RETURNING id, email, role`,
      ['Admin User', 'admin@demo.com', hashedPassword, 'admin', true],
    );
    
    console.log('✅ Inserted:', result.rows[0]);
    
    // Verify it was added
    const verify = await pool.query(
      'SELECT id, name, email, role FROM users WHERE email = $1',
      ['admin@demo.com']
    );
    console.log('✅ Verified:', verify.rows[0]);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

addDemoUser();
