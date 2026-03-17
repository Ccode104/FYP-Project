import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';

async function applyUpdateCSE304Assignments() {
  try {
    console.log('Applying CSE304 assignments update...');

    const updateSQL = fs.readFileSync('./update-cse304-assignments.sql', 'utf8');

    // Execute the entire SQL as one statement
    console.log('Executing update...');
    await pool.query(updateSQL);

    console.log('CSE304 assignments updated successfully!');
  } catch (error) {
    console.error('Update failed:', error);
  } finally {
    await pool.end();
  }
}

applyUpdateCSE304Assignments();