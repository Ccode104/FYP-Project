import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyMigration() {
  try {
    console.log('Applying support ticket tables migration...');

    const migrationSQL = fs.readFileSync('./prisma/migrations/add_support_ticket_tables.sql', 'utf8');

    await pool.query(migrationSQL);

    console.log('Support ticket migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyMigration();