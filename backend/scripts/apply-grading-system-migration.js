import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyGradingSystemMigration() {
  try {
    console.log('Applying grading system migration...');

    const migrationSQL = fs.readFileSync('./migrations/migrations/add_grading_system_tables.sql', 'utf8');

    console.log('Executing migration...');
    await pool.query(migrationSQL);

    console.log('Grading system migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyGradingSystemMigration();
