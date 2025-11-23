import 'dotenv/config';
import { pool } from './db/index.js';

async function checkUsers() {
  try {
    const result = await pool.query('SELECT id, name, email, role FROM users ORDER BY role, name');
    console.log('Existing users:');
    result.rows.forEach(user => {
      console.log(`${user.id}: ${user.name} (${user.email}) - ${user.role}`);
    });
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await pool.end();
  }
}

checkUsers();