const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:BT22CSE104atvnit@db.vzizykcqdyyhbbhmmpcs.supabase.co:5432/postgres' });

async function run() {
  try {
    console.log("--- 1. Fixing Newlines in code_submissions ---");
    // Replace literal '\n' (2 chars) with actual newline (1 char)
    // Replace literal '\t' (2 chars) with actual tab (1 char)
    const updateResult = await pool.query(`
      UPDATE code_submissions
      SET code = REPLACE(REPLACE(code, '\\n', CHR(10)), '\\t', CHR(9))
      WHERE code LIKE '%\\n%' OR code LIKE '%\\t%';
    `);
    console.log(`Updated ${updateResult.rowCount} code_submissions with literal newlines/tabs.`);

    console.log("\n--- 2. Adding Hidden Test Case for Question 803 ---");
    const tcResult = await pool.query(`
      INSERT INTO code_question_testcases (question_id, input_text, expected_text, is_sample)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [803, '-2\n1\n-3\n4\n-1\n2\n1\n-5\n4', '6', false]);
    console.log(`Inserted hidden test case with ID: ${tcResult.rows[0].id}`);

    console.log("\n--- 3. Adding Grading Rubric for Assignment 503 (Sorting) ---");
    // Rubric criteria for "Sorting Algorithms" assignment
    const rubrics = [
      { title: 'Algorithm Correctness', description: 'Does the code correctly solve the problem?', max_points: 50, weight: 0.5, position: 1 },
      { title: 'Code Quality', description: 'Is the code readable, well-commented, and maintainable?', max_points: 20, weight: 0.2, position: 2 },
      { title: 'Time Complexity', description: 'Does it run efficiently in O(n log n) or O(n) as required?', max_points: 30, weight: 0.3, position: 3 }
    ];

    for (const r of rubrics) {
      const rubricResult = await pool.query(`
        INSERT INTO rubric_criteria (assignment_id, title, description, max_points, weight, position)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [503, r.title, r.description, r.max_points, r.weight, r.position]);
      console.log(`Inserted rubric criterion ${r.title} with ID: ${rubricResult.rows[0].id}`);
    }

    console.log("DONE!");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
