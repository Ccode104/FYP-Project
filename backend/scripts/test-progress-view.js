import 'dotenv/config';
import { pool } from '../db/index.js';

async function testProgressView() {
  try {
    console.log('Testing student_detailed_progress view...');

    const result = await pool.query('SELECT * FROM student_detailed_progress LIMIT 5');
    
    console.log('\n✅ View is working!');
    console.log(`Retrieved ${result.rows.length} rows`);
    
    if (result.rows.length > 0) {
      console.log('\nSample data:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('(No data in view yet - this is normal if no assignments/quizzes exist)');
    }

  } catch (error) {
    console.error('❌ Error querying view:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testProgressView();
