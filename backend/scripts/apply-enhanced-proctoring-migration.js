import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyEnhancedProctoringMigration() {
  try {
    console.log('Applying enhanced proctoring schema migration...');

    const migrationSQL = fs.readFileSync('./prisma/migrations/enhanced_proctoring_schema.sql', 'utf8');

    await pool.query(migrationSQL);

    console.log('Enhanced proctoring migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyEnhancedProctoringMigration();