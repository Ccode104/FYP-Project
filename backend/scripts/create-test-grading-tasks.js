import 'dotenv/config';
import { pool } from '../db/index.js';

async function createTestGradingTasks() {
  try {
    console.log('Creating test grading tasks...');

    // Get all TAs
    const tasResult = await pool.query('SELECT id, name FROM users WHERE role = $1', ['ta']);
    if (tasResult.rows.length === 0) {
      console.log('No TAs found');
      return;
    }

    console.log('Found TAs:', tasResult.rows);

    // Get assignments with submissions
    const assignmentsResult = await pool.query(`
      SELECT DISTINCT a.id, a.title, COUNT(s.id) as submission_count
      FROM assignments a
      JOIN assignment_submissions s ON a.id = s.assignment_id
      GROUP BY a.id, a.title
      HAVING COUNT(s.id) > 0
    `);

    console.log('Found assignments with submissions:', assignmentsResult.rows);

    // Get all students who have submitted assignments
    const allStudentsResult = await pool.query(`
      SELECT DISTINCT s.student_id, u.name
      FROM assignment_submissions s
      JOIN users u ON s.student_id = u.id
    `);

    console.log('Found students with submissions:', allStudentsResult.rows);

    let taskCount = 0;

    for (const ta of tasResult.rows) {
      const taId = ta.id;
      const taName = ta.name;

      console.log(`\nCreating grading tasks for TA: ${taName} (${taId})`);

      for (const assignment of assignmentsResult.rows) {
        // Get students who submitted this assignment
        const studentsResult = await pool.query(`
          SELECT DISTINCT s.student_id, u.name
          FROM assignment_submissions s
          JOIN users u ON s.student_id = u.id
          WHERE s.assignment_id = $1
        `, [assignment.id]);

        console.log(`  Assignment ${assignment.id} (${assignment.title}): ${studentsResult.rows.length} students`);

        for (const student of studentsResult.rows) {
          // Create grading task
          await pool.query(`
            INSERT INTO grading_tasks (assignment_id, student_id, ta_id, assigned_at, status)
            VALUES ($1, $2, $3, NOW(), 'assigned')
            ON CONFLICT (assignment_id, student_id, ta_id) DO NOTHING
          `, [assignment.id, student.student_id, taId]);

          console.log(`    ✓ Created: ${taName} -> Assignment ${assignment.id} -> Student ${student.student_id} (${student.name})`);
          taskCount++;
        }
      }
    }

    console.log(`\n✅ Created ${taskCount} grading tasks successfully!`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

createTestGradingTasks();
