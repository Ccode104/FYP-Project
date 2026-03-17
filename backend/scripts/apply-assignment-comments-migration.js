import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyAssignmentCommentsMigration() {
  try {
    console.log('Applying assignment comments migration...');

    const migrationSQL = fs.readFileSync('./prisma/migrations/add_assignment_comments.sql', 'utf8');

    // Execute the migration
    console.log('Executing migration...');
    await pool.query(migrationSQL);

    console.log('Assignment comments migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyAssignmentCommentsMigration();