import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyContestsMigration() {
  try {
    console.log('Applying contests tables migration...');

    const migrationSQL = fs.readFileSync('./prisma/migrations/add_contests_tables.sql', 'utf8');

    await pool.query(migrationSQL);

    console.log('Contests migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyContestsMigration();