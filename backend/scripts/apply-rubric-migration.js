import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyMigration() {
  try {
    console.log('Applying rubric tables migration...');

    const migrationSQL = fs.readFileSync('./migrations/migrations/add_rubric_tables.sql', 'utf8');

    await pool.query(migrationSQL);

    console.log('Rubric migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyMigration();
