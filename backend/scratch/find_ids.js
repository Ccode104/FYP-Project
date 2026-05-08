import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findIds() {
  try {
    const courseRes = await pool.query("SELECT id, code FROM courses WHERE code = 'CS 301' OR code = 'CSE301'");
    console.log('Courses:', courseRes.rows);

    const offeringRes = await pool.query(`
      SELECT co.id, c.code, co.term, co.section 
      FROM course_offerings co 
      JOIN courses c ON co.course_id = c.id 
      WHERE c.code = 'CS 301' OR c.code = 'CSE301'
    `);
    console.log('Offerings:', offeringRes.rows);

    const studentRes = await pool.query("SELECT id, email FROM users WHERE email = 'student@gmail.com'");
    console.log('Student:', studentRes.rows);

    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findIds();
