const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:BT22CSE104atvnit@db.vzizykcqdyyhbbhmmpcs.supabase.co:5432/postgres' });

async function run() {
  try {
    // 1. Inspect code formatting for submission 704
    console.log("--- 1. Check code submission ---");
    const codeSubR = await pool.query('SELECT id, submission_id, code FROM code_submissions WHERE submission_id = 704');
    if (codeSubR.rows.length > 0) {
        const codeStr = codeSubR.rows[0].code;
        console.log(`Code string type: ${typeof codeStr}`);
        console.log(`Contains actual newline: ${codeStr.includes('\n')}`);
        console.log(`Contains literal \\n: ${codeStr.includes('\\n')}`);
        console.log("Snippet:", codeStr.substring(0, 100));
    } else {
        console.log("No code submission found for submission_id=704");
    }

    // 2. Find sorting assignment
    console.log("\n--- 2. Find sorting assignment ---");
    const assignR = await pool.query("SELECT id, title, assignment_type FROM assignments WHERE title ILIKE '%sort%'");
    console.log("Sorting Assignments:", assignR.rows);
    
    if (assignR.rows.length > 0) {
        const sortAssignId = assignR.rows[0].id;
        
        console.log("\n--- 3. Find code questions for assignment ---");
        const codeQsR = await pool.query(`
            SELECT aq.id as aq_id, cq.id as cq_id, cq.title
            FROM assignment_questions aq
            JOIN code_questions cq ON aq.question_id = cq.id
            WHERE aq.assignment_id = $1
        `, [sortAssignId]);
        console.log("Code Questions:", codeQsR.rows);

        console.log("\n--- 4. Check existing test cases ---");
        if (codeQsR.rows.length > 0) {
             const tcs = await pool.query("SELECT * FROM code_question_testcases WHERE question_id = $1", [codeQsR.rows[0].cq_id]);
             console.log("Test cases count:", tcs.rowCount);
        }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
