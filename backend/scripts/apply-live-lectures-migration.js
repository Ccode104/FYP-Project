import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyLiveLecturesMigration() {
  try {
    console.log('Applying live lectures migration...');

    const migrationSQL = fs.readFileSync('./prisma/live_lectures_migration.sql', 'utf8');

    console.log('Executing migration...');
    await pool.query(migrationSQL);

    console.log('Live lectures migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyLiveLecturesMigration();