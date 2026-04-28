import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';
import path from 'path';

async function applyFileSizeLimitMigration() {
  console.log('Applying file size limit migration...');

  try {
    const migrationPath = path.join(process.cwd(), 'migrations/migrations/add_file_size_limit_to_assignments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);
    console.log('File size limit migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyFileSizeLimitMigration();
