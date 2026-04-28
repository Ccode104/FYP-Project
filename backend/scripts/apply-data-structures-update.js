import 'dotenv/config';
import fs from 'fs';
import { pool } from '../db/index.js';
import { logger } from './utils/logger.js';

async function applyDataStructuresUpdate() {
  try {
    console.log('Reading SQL file...');
    const sql = fs.readFileSync('update-cse304-data-structures.sql', 'utf8');

    console.log('Executing SQL script as a single transaction...');

    // Execute the entire SQL file as one query
    // This avoids splitting issues with JSON containing semicolons
    await pool.query(sql);

    console.log('✓ SQL script executed successfully');

    console.log('SQL script execution completed!');

    // Verify the changes
    console.log('\nVerifying changes...');

    // Check code questions
    const codeQuestions = await pool.query(
      'SELECT id, title FROM code_questions WHERE title LIKE \'%Implementation%\' ORDER BY title'
    );
    console.log(`\nCreated ${codeQuestions.rows.length} code questions:`);
    codeQuestions.rows.forEach(q => console.log(`- ${q.title} (ID: ${q.id})`));

    // Check assignment
    const assignment = await pool.query(
      'SELECT title, assignment_config FROM assignments WHERE title = \'Data Structures Implementation\''
    );
    if (assignment.rows.length > 0) {
      const config = JSON.parse(assignment.rows[0].assignment_config);
      console.log(`\nAssignment updated: ${assignment.rows[0].title}`);
      console.log(`Type: ${config.assignment_type}`);
      console.log(`Questions: ${config.questions?.length || 0}`);
    } else {
      console.log('\nAssignment not found!');
    }

  } catch (error) {
    console.error('Error applying data structures update:', error);
    logger.error('Data structures update failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

applyDataStructuresUpdate();
