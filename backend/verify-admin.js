import 'dotenv/config';
import { pool } from './db/index.js';

async function checkUser() {
  try {
    const result = await pool.query(
      'SELECT id, email, role, password_hash FROM users WHERE email = $1',
      ['admin@demo.com']
    );
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Found user:');
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Password Hash exists: ${user.password_hash ? '✅ Yes' : '❌ No'}`);
    } else {
      console.log('❌ User not found');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkUser();
