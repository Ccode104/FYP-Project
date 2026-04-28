import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyResumeRequestsMigration() {
  try {
    console.log('Applying resume requests table migration...');

    const migrationSQL = fs.readFileSync('./migrations/migrations/add_resume_requests_table.sql', 'utf8');

    await pool.query(migrationSQL);

    console.log('Resume requests migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyResumeRequestsMigration();
