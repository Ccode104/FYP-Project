const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:BT22CSE104atvnit@db.vzizykcqdyyhbbhmmpcs.supabase.co:5432/postgres' });

async function test() {
  try {
    const submissionId = 704;
    console.log('Query 1...');
    const r1 = await pool.query(`
      SELECT s.*, a.id AS assignment_id, a.title AS assignment_title, a.description AS assignment_description,
             a.due_at, a.total_points, a.allow_multiple_submissions, a.assignment_type,
             a.submission_requirements, a.grading_config, a.course_offering_id, o.faculty_id,
             u.name as student_name, u.email as student_email
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN course_offerings o ON a.course_offering_id = o.id
      JOIN users u ON s.student_id = u.id
      WHERE s.id = $1
      LIMIT 1
    `, [submissionId]);
    console.log('Query 1 Success, found:', r1.rowCount);
    console.log('Query 2...');
    await pool.query('SELECT id, storage_path, filename, mime_type FROM submission_files WHERE submission_id = $1', [submissionId]);
    console.log('Query 2 Success');
    console.log('Query 3...');
    const r3 = await pool.query(`
      SELECT cs.*, aq.question_id
      FROM code_submissions cs
      LEFT JOIN assignment_questions aq ON cs.assignment_question_id = aq.id
      WHERE cs.submission_id = $1
    `, [submissionId]);
    console.log('Query 3 Success', r3.rowCount);
    for (const codeSub of r3.rows) {
        console.log('Query test results for codeSub', codeSub.id);
        const testResultsR = await pool.query(`
          SELECT
            csr.*,
            cqt.input_text,
            cqt.expected_text,
            cqt.is_sample
          FROM code_submission_results csr
          LEFT JOIN code_question_testcases cqt ON csr.code_testcase_id = cqt.id
          WHERE csr.code_submission_id = $1
          ORDER BY csr.created_at ASC
        `, [codeSub.id]);
        console.log('Query test results Success');
    }
  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    await pool.end();
  }
}
test();
