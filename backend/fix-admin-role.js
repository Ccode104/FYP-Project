import 'dotenv/config';
import { pool } from './db/index.js';

async function fixRole() {
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, role',
      ['admin', 'admin@demo.com']
    );
    console.log('✅ Updated role:', result.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixRole();
