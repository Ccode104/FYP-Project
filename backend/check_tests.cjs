const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:BT22CSE104atvnit@db.vzizykcqdyyhbbhmmpcs.supabase.co:5432/postgres' });

async function run() {
  try {
    const qid = 803; // Maximum Subarray
    console.log(`--- Test Cases for Question ${qid} ---`);
    const res = await pool.query('SELECT * FROM code_question_testcases WHERE question_id = $1 ORDER BY id', [qid]);
    for (const r of res.rows) {
        console.log(`ID: ${r.id} | is_sample: ${r.is_sample}`);
        console.log(`Input: ${JSON.stringify(r.input_text)}`);
        console.log(`Expected: ${JSON.stringify(r.expected_text)}`);
        console.log('---');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
