import { pool } from './db/index.js';

async function check() {
  try {
    const orphaned = await pool.query(
      'SELECT s.id, s.assignment_id, s.student_id FROM assignment_submissions s LEFT JOIN users u ON s.student_id = u.id WHERE u.id IS NULL'
    );
    console.log('Orphaned submissions:', orphaned.rows.length);

    const badSubs = await pool.query(
      'SELECT s.id, s.assignment_id, a.course_offering_id FROM assignment_submissions s LEFT JOIN assignments a ON s.assignment_id = a.id WHERE a.id IS NULL'
    );
    console.log('Submissions with invalid assignments:', badSubs.rows.length);

    const types = await pool.query(
      'SELECT DISTINCT assignment_type, count(*) FROM assignments GROUP BY assignment_type'
    );
    console.log('Assignment types:', types.rows);

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
  }
}
check();
