import 'dotenv/config';
import { pool } from './db/index.js';
import fs from 'fs';

async function applyAssignmentRefactorMigration() {
  try {
    console.log('Applying assignment refactor migration...');

    const migrationSQL = fs.readFileSync('./prisma/migrations/refactor_assignments_single_type.sql', 'utf8');
    await pool.query(migrationSQL);
    console.log('Assignment refactor migration applied successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyAssignmentRefactorMigration();