import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAssignments() {
  try {
    const cs301 = await pool.query("SELECT id, title FROM assignments WHERE course_offering_id = 303");
    console.log('CS301 (303) assignments:', cs301.rows);

    const cse301Demo = await pool.query("SELECT id, title FROM assignments WHERE course_offering_id = 327");
    console.log('CSE301-DEMO (327) assignments:', cse301Demo.rows);

    await pool.end();
  } catch (err) {
    console.error(err);
  }
}

checkAssignments();
