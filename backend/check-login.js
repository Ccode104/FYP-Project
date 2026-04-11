import 'dotenv/config';
import { pool } from './db/index.js';

async function checkUsers() {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role FROM users LIMIT 20'
    );
    console.log('Users in database:');
    result.rows.forEach(u => {
      console.log(`  - ${u.email} (${u.role}) - ${u.name}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
