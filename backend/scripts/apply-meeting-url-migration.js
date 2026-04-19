import 'dotenv/config';
import { pool } from '../db/index.js';

async function applyMeetingUrlMigration() {
  try {
    console.log('Applying meeting_url migration to live_lectures table...');

    const migrationSQL = `
      ALTER TABLE live_lectures ADD COLUMN IF NOT EXISTS meeting_url TEXT;
    `;

    console.log('Executing migration...');
    await pool.query(migrationSQL);

    console.log('meeting_url migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyMeetingUrlMigration();
