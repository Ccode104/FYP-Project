import { pool } from './db/index.js';
import fs from 'fs';
import path from 'path';

async function runSeed() {
  const sqlPath = path.join(process.cwd(), 'seed-comprehensive-demo.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Database seeded successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
