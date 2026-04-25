import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function applySingleSubmissionMigration() {
  const { pool } = await import('../db/index.js');

  try {
    const migrationPath = path.join(
      __dirname,
      '..',
      'prisma',
      'migrations',
      'enforce_single_assignment_submission.sql'
    );
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSql);
    console.log('Single-submission migration applied successfully.');
  } catch (error) {
    console.error('Failed to apply single-submission migration:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

applySingleSubmissionMigration();
