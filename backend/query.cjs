const { Client } = require('pg');
const client = new Client({
  connectionString:
    'postgresql://postgres:BT22CSE104atvnit@db.vzizykcqdyyhbbhmmpcs.supabase.co:5432/postgres',
});

async function main() {
  try {
    await client.connect();

    // Get code_question 803
    const cq = await client.query('SELECT * FROM code_questions WHERE id = 803');
    console.log('Code question 803:');
    console.log(JSON.stringify(cq.rows[0], null, 2));

    console.log('\n---');

    // Check code_question_testcases schema
    const testSchema = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'code_question_testcases'"
    );
    console.log('code_question_testcases columns:');
    testSchema.rows.forEach(r => console.log(r.column_name));

    console.log('\n---');

    // Get test cases for question 803
    const tc = await client.query('SELECT * FROM code_question_testcases WHERE question_id = 803');
    console.log('Test cases for question 803:');
    console.log(JSON.stringify(tc.rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
