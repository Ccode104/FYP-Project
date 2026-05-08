import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDetailedSchema() {
  try {
    const tables = ['assignments', 'code_questions', 'code_question_testcases', 'assignment_questions', 'enrollments'];
    for (const table of tables) {
      console.log(`\n--- Schema for ${table} ---`);
      const res = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      console.table(res.rows);
    }
    await pool.end();
  } catch (err) {
    console.error(err);
  }
}

checkDetailedSchema();
