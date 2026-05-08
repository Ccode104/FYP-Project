import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupAssignment() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const studentEmail = 'student@gmail.com';
    const courseCode = 'CS301';
    const offeringId = 303; // Found earlier for CS301 Fall 2026

    // 1. Get student ID
    const studentRes = await client.query('SELECT id FROM users WHERE email = $1', [studentEmail]);
    if (studentRes.rowCount === 0) throw new Error(`Student ${studentEmail} not found`);
    const studentId = studentRes.rows[0].id;

    // 2. Enroll student if not already enrolled
    await client.query(`
      INSERT INTO enrollments (course_offering_id, student_id, enrolled_at, status)
      VALUES ($1, $2, NOW(), 'active')
      ON CONFLICT DO NOTHING
    `, [offeringId, studentId]);
    console.log(`Student ${studentEmail} (ID: ${studentId}) ensured enrolled in offering ${offeringId}`);

    // 3. Create Code Question
    const qTitle = 'Factorial Calculation';
    const qDesc = 'Write a Python script that reads an integer from stdin and prints its factorial to stdout. Example: for input 5, output should be 120.';
    const qConstraints = '0 <= n <= 20';
    const templateCode = { python: 'import sys\n\ndef factorial(n):\n    # Your code here\n    pass\n\nif __name__ == "__main__":\n    line = sys.stdin.readline()\n    if line:\n        n = int(line.strip())\n        print(factorial(n))' };
    
    const qRes = await client.query(`
      INSERT INTO code_questions (title, description, constraints, template_code, created_by)
      VALUES ($1, $2, $3, $4, 112) RETURNING id
    `, [qTitle, qDesc, qConstraints, JSON.stringify(templateCode)]);
    const questionId = qRes.rows[0].id;
    console.log(`Code Question created with ID: ${questionId}`);

    // 4. Add Test Cases
    const testCases = [
      { input: '5', expected: '120', is_sample: true },
      { input: '3', expected: '6', is_sample: true },
      { input: '10', expected: '3628800', is_sample: false },
      { input: '0', expected: '1', is_sample: false }
    ];

    for (const tc of testCases) {
      await client.query(`
        INSERT INTO code_question_testcases (question_id, is_sample, input_text, expected_text)
        VALUES ($1, $2, $3, $4)
      `, [questionId, tc.is_sample, tc.input, tc.expected]);
    }
    console.log('Test cases added (sample and hidden)');

    // 5. Create Assignment
    const aTitle = 'CS 301: Python Programming Assignment';
    const aDesc = 'Complete the factorial calculation task. You must submit a single Python file.';
    const assignmentConfig = {
      assignment_type: 'simple',
      components: [
        {
          id: 'code_solution',
          type: 'code',
          subtype: 'small_code',
          title: 'Factorial Implementation',
          description: 'Implement the factorial function in Python',
          language: 'python',
          points: 100
        }
      ],
      settings: {
        allow_group_work: false,
        auto_grading_enabled: true,
        code_execution_required: true,
        allow_github_repo: true
      }
    };
    const submissionRequirements = [
      {
        component_id: 'code_solution',
        submission_type: 'file_upload',
        accepted_formats: ['.py'],
        required: true
      }
    ];

    const aRes = await client.query(`
      INSERT INTO assignments (
        course_offering_id, title, description, assignment_type, 
        assignment_config, submission_requirements, total_points, 
        is_graded, release_at, due_at, created_by, allow_github_repo
      ) VALUES ($1, $2, $3, 'code', $4, $5, 100, true, NOW(), NOW() + INTERVAL '7 days', 112, true)
      RETURNING id
    `, [offeringId, aTitle, aDesc, JSON.stringify(assignmentConfig), JSON.stringify(submissionRequirements)]);
    const assignmentId = aRes.rows[0].id;
    console.log(`Assignment created with ID: ${assignmentId}`);

    // 6. Link Question to Assignment
    await client.query(`
      INSERT INTO assignment_questions (assignment_id, question_id, points, position)
      VALUES ($1, $2, 100, 1)
    `, [assignmentId, questionId]);
    console.log('Question linked to assignment');

    await client.query('COMMIT');
    console.log('Database updated successfully.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during setup:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

setupAssignment();
