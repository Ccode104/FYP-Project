import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyQuizAchievementsMigration() {
  try {
    console.log('Applying quiz achievements migration...');

    const migrationSQL = fs.readFileSync('./prisma/migrations/add_quiz_achievements.sql', 'utf8');

    await pool.query(migrationSQL);

    console.log('Quiz achievements migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyQuizAchievementsMigration();