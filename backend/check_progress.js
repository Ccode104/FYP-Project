import { pool } from './db/index.js';

async function check() {
  try {
    const progressViews = await pool.query(
      "SELECT table_name FROM information_schema.views WHERE table_name LIKE '%progress%'"
    );
    console.log('Progress views:', progressViews.rows);

    const progressTables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%progress%' AND table_schema='public'"
    );
    console.log('Progress tables:', progressTables.rows);

    const viewRows = await pool.query('SELECT * FROM student_detailed_progress LIMIT 5');
    console.log('student_detailed_progress sample:', viewRows.rows);

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
  }
}
check();
