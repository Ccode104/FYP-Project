import 'dotenv/config';
import { pool } from './db/index.js';
import fs from 'fs';

async function applyMigration() {
  try {
    console.log('Applying template and driver code migration...');

    const migrationSQL = fs.readFileSync('./prisma/migrations/add_template_driver_code_to_code_questions.sql', 'utf8');

    await pool.query(migrationSQL);

    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyMigration();