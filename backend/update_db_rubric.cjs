const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:BT22CSE104atvnit@db.vzizykcqdyyhbbhmmpcs.supabase.co:5432/postgres' });

async function run() {
  try {
    const courseOfferingId = 205; // We will look up course_offering_id next if needed
    const assignmentId = 503;

    console.log("--- 1. Getting course offering ---");
    const aRes = await pool.query("SELECT course_offering_id FROM assignments WHERE id = $1", [assignmentId]);
    const coId = aRes.rows[0].course_offering_id;

    console.log("--- 2. Creating Rubric ---");
    const rubRes = await pool.query(`
      INSERT INTO rubrics (title, description, course_offering_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ["Sorting Assignment Rubric", "Rubric for evaluating max subarray/sorting code", coId]);
    const rubricId = rubRes.rows[0].id;
    console.log(`Created rubric with ID: ${rubricId}`);

    console.log("--- 3. Adding Grading Rubric Criteria ---");
    const rubrics = [
      { title: 'Algorithm Correctness', description: 'Does the code correctly solve the problem?', max_points: 50, weight: 0.5, position: 1 },
      { title: 'Code Quality', description: 'Is the code readable, well-commented, and maintainable?', max_points: 20, weight: 0.2, position: 2 },
      { title: 'Time Complexity', description: 'Does it run efficiently as required?', max_points: 30, weight: 0.3, position: 3 }
    ];

    for (const r of rubrics) {
      await pool.query(`
        INSERT INTO rubric_criteria (rubric_id, title, description, max_points, weight, position)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [rubricId, r.title, r.description, r.max_points, r.weight, r.position]);
    }
    console.log("Added rubric criteria.");

    console.log("--- 4. Linking Rubric to Assignment ---");
    await pool.query(`
        UPDATE assignments
        SET grading_config = $1
        WHERE id = $2
    `, [JSON.stringify({ use_rubric: true, rubric_id: rubricId }), assignmentId]);
    console.log("Linked rubric to assignment!");

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
