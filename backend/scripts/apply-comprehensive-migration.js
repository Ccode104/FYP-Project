import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyComprehensiveMigration() {
  try {
    console.log('Applying comprehensive LMS schema migration...');

    const migrationSQL = fs.readFileSync('./migrations/migrations/comprehensive_lms_schema.sql', 'utf8');

    // Execute the entire SQL as one statement since it contains complex constructs
    console.log('Executing migration...');
    await pool.query(migrationSQL);

    console.log('Comprehensive migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyComprehensiveMigration();
