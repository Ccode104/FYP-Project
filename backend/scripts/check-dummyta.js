import 'dotenv/config';
import { pool } from '../db/index.js';

async function checkDummyTA() {
  try {
    console.log('Checking DummyTA grading assignments...');

    const dummyTAResult = await pool.query(`
      SELECT gt.id, gt.assignment_id, gt.student_id, gt.status,
             a.title, a.due_at, c.code as course_code,
             u.name as student_name
      FROM grading_tasks gt
      JOIN assignments a ON gt.assignment_id = a.id
      JOIN course_offerings co ON a.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN users u ON gt.student_id = u.id
      WHERE gt.ta_id = $1
      ORDER BY gt.assignment_id
    `, [53]); // DummyTA ID

    console.log('DummyTA grading assignments:');
    dummyTAResult.rows.forEach(row => {
      console.log(`- Assignment: ${row.title} (${row.course_code})`);
      console.log(`  Student: ${row.student_name}`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Due: ${row.due_at}`);
      console.log('');
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkDummyTA();