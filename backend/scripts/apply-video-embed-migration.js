import 'dotenv/config';
import { pool } from '../db/index.js';

async function applyMigration() {
  try {
    console.log('Applying video embed_url migration...');

    const migrationSQL = `ALTER TABLE videos ADD COLUMN IF NOT EXISTS embed_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS direct_video_url TEXT;`;

    await pool.query(migrationSQL);

    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
