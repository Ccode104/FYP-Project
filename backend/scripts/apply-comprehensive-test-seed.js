import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyComprehensiveTestSeed() {
  try {
    console.log('Applying comprehensive test seed data...');

    const seedSQL = fs.readFileSync('./comprehensive-test-seed.sql', 'utf8');

    // Execute the entire SQL as one statement
    console.log('Executing test seed data...');
    await pool.query(seedSQL);

    console.log('Comprehensive test seed data applied successfully!');
  } catch (error) {
    console.error('Test seed data application failed:', error);
  } finally {
    await pool.end();
  }
}

applyComprehensiveTestSeed();
