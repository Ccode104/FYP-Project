import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyFixProctoringForeignKeyMigration() {
  try {
    console.log('Applying fix for proctoring session foreign key...');

    const migrationSQL = fs.readFileSync('./prisma/migrations/fix_proctoring_session_foreign_key.sql', 'utf8');

    await pool.query(migrationSQL);

    console.log('Proctoring foreign key fix migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyFixProctoringForeignKeyMigration();