import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyZipFileSupportMigration() {
  try {
    console.log('Applying zip file support to assignment submissions migration...');

    const migrationSQL = fs.readFileSync('./migrations/migrations/add_zip_file_support_to_assignment_submissions.sql', 'utf8');

    await pool.query(migrationSQL);

    console.log('Zip file support migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyZipFileSupportMigration();
