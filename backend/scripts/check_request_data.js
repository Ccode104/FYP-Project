import 'dotenv/config';
import { pool } from '../db/index.js';

async function checkData() {
  try {
    const res = await pool.query("SELECT id, title, driver_code FROM code_questions ORDER BY id DESC LIMIT 1");
    console.log('Last Question:', res.rows[0]);
    
    const tcRes = await pool.query("SELECT id, question_id, input_text, expected_text, is_sample FROM code_question_testcases WHERE question_id = $1", [res.rows[0].id]);
    console.log('Test Cases:', tcRes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
checkData();
