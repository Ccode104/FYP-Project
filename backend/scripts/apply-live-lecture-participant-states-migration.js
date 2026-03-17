import 'dotenv/config';
import { pool } from './db/index.js';
import fs from 'fs';

async function applyLiveLectureParticipantStatesMigration() {
  try {
    console.log('Applying live lecture participant states migration...');

    const migrationSQL = fs.readFileSync('./prisma/migrations/add_live_lecture_participant_states.sql', 'utf8');

    console.log('Executing migration...');
    await pool.query(migrationSQL);

    console.log('Live lecture participant states migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

applyLiveLectureParticipantStatesMigration();