import 'dotenv/config';
import { pool } from './db/index.js';
import fs from 'fs';

async function applySimpleTestSeed() {
  try {
    console.log('Applying simple test seed data...');

    const seedSQL = fs.readFileSync('./simple-test-seed.sql', 'utf8');

    // Execute the entire SQL as one statement
    console.log('Executing test seed data...');
    await pool.query(seedSQL);

    console.log('Simple test seed data applied successfully!');
  } catch (error) {
    console.error('Test seed data application failed:', error);
  } finally {
    await pool.end();
  }
}

applySimpleTestSeed();