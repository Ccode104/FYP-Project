import 'dotenv/config';
import { pool } from '../db/index.js';

async function checkGradingData() {
  try {
    console.log('=== Grading System Data Check ===\n');

    const gradingTasks = await pool.query('SELECT COUNT(*) as count FROM grading_tasks');
    console.log('Grading tasks count:', gradingTasks.rows[0].count);

    const assignments = await pool.query('SELECT COUNT(*) as count FROM assignments');
    console.log('Assignments count:', assignments.rows[0].count);

    const tas = await pool.query('SELECT id, name, role FROM users WHERE role = $1', ['ta']);
    console.log('TAs:', tas.rows);

    const submissions = await pool.query('SELECT COUNT(*) as count FROM assignment_submissions');
    console.log('Submissions count:', submissions.rows[0].count);

    if (tas.rows.length > 0) {
      const taId = tas.rows[0].id;
      console.log(`\nChecking assignments for TA ${taId}:`);
      const taAssignments = await pool.query(`
        SELECT gt.*, a.title, a.due_at, c.code as course_code
        FROM grading_tasks gt
        JOIN assignments a ON gt.assignment_id = a.id
        JOIN course_offerings co ON a.course_offering_id = co.id
        JOIN courses c ON co.course_id = c.id
        WHERE gt.ta_id = $1
      `, [taId]);

      console.log('TA assignments:', taAssignments.rows);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkGradingData();