import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyFlexibleAssignmentsSeed() {
  try {
    console.log('Applying flexible assignments seed data...');

    const seedSQL = fs.readFileSync('./flexible-assignments-seed.sql', 'utf8');

    // Execute the entire SQL as one statement
    console.log('Executing seed data...');
    await pool.query(seedSQL);

    console.log('Flexible assignments seed data applied successfully!');
  } catch (error) {
    console.error('Seed data application failed:', error);
  } finally {
    await pool.end();
  }
}

applyFlexibleAssignmentsSeed();
