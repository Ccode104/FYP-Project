import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyGitHubMigrations() {
  try {
    console.log('Applying GitHub integration fields migration...');

    const migrationSQL1 = fs.readFileSync('./prisma/migrations/add_github_integration_fields.sql', 'utf8');
    await pool.query(migrationSQL1);
    console.log('GitHub integration fields migration applied successfully!');

    console.log('Applying GitHub repository submission fields migration...');
    const migrationSQL2 = fs.readFileSync('./prisma/migrations/add_github_repository_submission_fields.sql', 'utf8');
    await pool.query(migrationSQL2);
    console.log('GitHub repository submission fields migration applied successfully!');

    console.log('All GitHub migrations applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyGitHubMigrations();