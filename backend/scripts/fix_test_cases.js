import 'dotenv/config';
import { pool } from '../db/index.js';

async function fixTestCases() {
  try {
    const qRes = await pool.query("SELECT id FROM code_questions ORDER BY id DESC LIMIT 1");
    const qId = qRes.rows[0].id;
    console.log('Fixing test cases for Question ID:', qId);

    // Fetch existing test cases for this question to get their IDs
    const existingRes = await pool.query("SELECT id, input_text FROM code_question_testcases WHERE question_id = $1 ORDER BY id", [qId]);
    const ids = existingRes.rows.map(r => r.id);

    const inputs = ["[1, 2, 3, 4, 5]\n3", "[1, 2, 3, 4, 5]\n6", "[10, 20, 30, 40, 50]\n40", "[]\n5"];
    const expecteds = ["2", "-1", "3", "-1"];

    for (let i = 0; i < ids.length; i++) {
       await pool.query("UPDATE code_question_testcases SET input_text = $1, expected_text = $2 WHERE id = $3", [inputs[i], expecteds[i], ids[i]]);
    }
    console.log('Test cases updated successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
fixTestCases();
