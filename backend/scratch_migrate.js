import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('sslmode=require') || process.env.DATABASE_URL.includes('ssl=true')
    ? { rejectUnauthorized: false, require: true }
    : false
});

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE quiz_attempts 
      ADD COLUMN IF NOT EXISTS google_response_id TEXT,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
    `);
    console.log('Migration successful: Columns added to quiz_attempts');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
