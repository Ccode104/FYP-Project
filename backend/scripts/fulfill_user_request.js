import 'dotenv/config';
import { pool } from '../db/index.js';

async function fulfillRequest() {
  try {
    console.log('Finding course CSE 301...');
    const courseRes = await pool.query(`
      SELECT co.id, c.code, c.title
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.id
      WHERE c.code LIKE '%CSE 301%' OR c.code LIKE '%CSE301%'
      LIMIT 1
    `);

    if (courseRes.rowCount === 0) {
      console.log('CSE 301 not found.');
      return;
    }
    const offeringId = courseRes.rows[0].id;
    console.log(`Found Course Offering ID: ${offeringId} for ${courseRes.rows[0].code}`);

    console.log('Finding student student@gmail.com...');
    const studentRes = await pool.query("SELECT id FROM users WHERE email = 'student@gmail.com'");
    if (studentRes.rowCount === 0) {
      console.log('Student not found.');
      return;
    }
    const studentId = studentRes.rows[0].id;

    // Ensure enrollment
    await pool.query(`
      INSERT INTO enrollments (course_offering_id, student_id, status)
      VALUES ($1, $2, 'active')
      ON CONFLICT (course_offering_id, student_id) DO NOTHING
    `, [offeringId, studentId]);

    console.log('Creating assignment...');
    const assignmentRes = await pool.query(`
      INSERT INTO assignments (course_offering_id, title, description, assignment_type, release_at, due_at, max_score)
      VALUES ($1, 'DSA in Python: Binary Search', 'Implement binary search efficiently in Python.', 'code', NOW(), NOW() + INTERVAL '14 days', 100)
      RETURNING id
    `, [offeringId]);
    const assignmentId = assignmentRes.rows[0].id;

    console.log('Creating code question...');
    const questionRes = await pool.query(`
      INSERT INTO code_questions (title, description, constraints)
      VALUES ('Binary Search Implementation', 'Implement a function binary_search(arr, x) that returns the index of x in sorted array arr, or -1 if not found.', 'Time complexity: O(log n)')
      RETURNING id
    `);
    const questionId = questionRes.rows[0].id;

    console.log('Linking question to assignment...');
    const aqRes = await pool.query(`
      INSERT INTO assignment_questions (assignment_id, question_id, points, position)
      VALUES ($1, $2, 100, 1)
      RETURNING id
    `, [assignmentId, questionId]);
    const aqId = aqRes.rows[0].id;

    console.log('Adding test cases...');
    // Sample test cases
    await pool.query(`
      INSERT INTO code_question_testcases (question_id, is_sample, input_text, expected_text)
      VALUES ($1, true, '[1, 2, 3, 4, 5]\\n3', '2'), ($1, true, '[1, 2, 3, 4, 5]\\n6', '-1')
    `, [questionId]);

    // Hidden test cases
    await pool.query(`
      INSERT INTO code_question_testcases (question_id, is_sample, input_text, expected_text)
      VALUES ($1, false, '[10, 20, 30, 40, 50]\\n40', '3'), ($1, false, '[]\\n5', '-1')
    `, [questionId]);

    console.log('Creating submission for student...');
    const submissionRes = await pool.query(`
      INSERT INTO assignment_submissions (assignment_id, student_id, submitted_at, status)
      VALUES ($1, $2, NOW(), 'submitted')
      RETURNING id
    `, [assignmentId, studentId]);
    const submissionId = submissionRes.rows[0].id;

    console.log('Adding code submission content...');
    const pythonCode = `
def binary_search(arr, x):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] < x:
            low = mid + 1
        elif arr[mid] > x:
            high = mid - 1
        else:
            return mid
    return -1

# Judge boilerplate (this would be handled by the runner normally)
import json
import sys
try:
    input_data = sys.stdin.read().split('\\n')
    if input_data[0]:
        arr = json.loads(input_data[0])
        x = int(input_data[1])
        print(binary_search(arr, x))
except Exception as e:
    # silent failure for boilerplate
    pass
`.trim();

    await pool.query(`
      INSERT INTO code_submissions (submission_id, assignment_question_id, language, code, test_results)
      VALUES ($1, $2, 'python', $3, $4)
    `, [submissionId, aqId, pythonCode, JSON.stringify({ tests_passed: 4, tests_total: 4, status: 'passed' })]);

    console.log('Done!');
  } catch (err) {
    console.error('Error fulfilling request:', err);
  } finally {
    await pool.end();
  }
}

fulfillRequest();
