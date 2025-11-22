import 'dotenv/config';
import { pool } from './db/index.js';
import fs from 'fs';

async function applyMigration() {
  try {
    console.log('Applying proctoring fields migration...');

    const migrationSQL = fs.readFileSync('./prisma/migrations/add_proctoring_fields.sql', 'utf8');

    await pool.query(migrationSQL);

    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyMigration();