import 'dotenv/config';
import { pool } from '../db/index.js';

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'video_quiz_questions' 
      ORDER BY ordinal_position
    `);
    console.log('video_quiz_questions columns:');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type})`);
    });

    // Check foreign key constraint exists
    const fkResult = await pool.query(`
      SELECT tc.constraint_name, kcu.column_name, ccu.table_name, ccu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'video_quiz_questions' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'section_id'
    `);
    console.log('\nForeign key check for section_id:');
    console.log(fkResult.rows.length > 0 ? '  EXISTS ✓' : '  NOT FOUND ✗');
    if (fkResult.rows.length > 0) {
      console.log('  ', fkResult.rows[0]);
    }
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();
