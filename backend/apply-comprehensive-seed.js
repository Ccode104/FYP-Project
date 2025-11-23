import 'dotenv/config';
import { pool } from './db/index.js';
import fs from 'fs';

async function applyComprehensiveSeed() {
  try {
    console.log('Applying comprehensive seed data...');

    const seedSQL = fs.readFileSync('./comprehensive-seed-data.sql', 'utf8');

    // Execute the entire SQL as one statement
    console.log('Executing seed data...');
    await pool.query(seedSQL);

    console.log('Comprehensive seed data applied successfully!');
  } catch (error) {
    console.error('Seed data application failed:', error);
  } finally {
    await pool.end();
  }
}

applyComprehensiveSeed();