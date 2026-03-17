import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyGamificationMigration() {
  try {
    console.log('Applying gamification tables migration...');

    const migrationSQL = fs.readFileSync('./prisma/migrations/add_gamification_tables.sql', 'utf8');

    await pool.query(migrationSQL);

    console.log('Gamification migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyGamificationMigration();