import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyWhiteboardMigration() {
  try {
    console.log('Applying whiteboard migration...');

    const migrationSQL = fs.readFileSync('./migrations/migrations/add_whiteboard_table.sql', 'utf8');

    console.log('Executing migration...');
    await pool.query(migrationSQL);

    console.log('Whiteboard migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyWhiteboardMigration();
