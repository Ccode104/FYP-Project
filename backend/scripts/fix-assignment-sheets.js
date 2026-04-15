import { config } from 'dotenv';
config({ path: 'backend/.env' });

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function applyFix() {
  console.log('Adding unique constraint...');

  try {
    await pool.query(
      'ALTER TABLE assignment_sheets ADD CONSTRAINT assignment_sheets_assignment_id_unique UNIQUE (assignment_id)'
    );
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
  }

  await pool.end();
}

applyFix();
