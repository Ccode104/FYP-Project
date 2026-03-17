import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applySubmissionsSchemaRefactorMigration() {
  try {
    console.log('Applying submissions schema refactor migration...');

    const migrationSQL = fs.readFileSync('./prisma/migrations/refactor_submissions_schema.sql', 'utf8');

    await pool.query(migrationSQL);

    console.log('Submissions schema refactor migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applySubmissionsSchemaRefactorMigration();