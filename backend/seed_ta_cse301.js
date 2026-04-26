import 'dotenv/config';
import { pool } from './db/index.js';

async function seedTAAssignments() {
  try {
    console.log('Seeding TA assignments for CSE 301...');

    // 1. Find or create a TA
    // We'll look for any TA first
    const taRes = await pool.query("SELECT id, name FROM users WHERE role = 'ta' LIMIT 2");
    let tas = taRes.rows;

    if (tas.length === 0) {
      console.log('No TAs found. Please create a TA user first.');
      return;
    }

    // 2. Find CSE 301 course offering
    const courseRes = await pool.query(`
      SELECT co.id, c.code, co.faculty_id
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.id
      WHERE c.code LIKE '%CSE 301%' OR c.code LIKE '%CSE301%'
      LIMIT 1
    `);

    if (courseRes.rowCount === 0) {
      console.log('CSE 301 course offering not found.');
      return;
    }

    const offering = courseRes.rows[0];
    console.log(`Found Course: ${offering.code} (Offering ID: ${offering.id})`);

    // 3. Assign TAs to the course
    for (const ta of tas) {
      await pool.query(`
        INSERT INTO ta_assignments (course_offering_id, ta_id, role)
        VALUES ($1, $2, 'ta')
        ON CONFLICT DO NOTHING
      `, [offering.id, ta.id]);
      console.log(`Assigned TA ${ta.name} to ${offering.code}`);
    }

    // 4. Allocate some grading tasks for an assignment in this course
    const assignmentRes = await pool.query(`
      SELECT id, title FROM assignments
      WHERE course_offering_id = $1
      LIMIT 1
    `, [offering.id]);

    if (assignmentRes.rowCount > 0) {
      const assignment = assignmentRes.rows[0];
      console.log(`Allocating tasks for assignment: ${assignment.title}`);

      // Get some students from the course
      const studentsRes = await pool.query(`
        SELECT student_id FROM enrollments
        WHERE course_offering_id = $1
        LIMIT 10
      `, [offering.id]);

      const students = studentsRes.rows;
      if (students.length > 0) {
        // Distribute among TAs
        for (let i = 0; i < students.length; i++) {
          const ta = tas[i % tas.length];
          await pool.query(`
            INSERT INTO grading_tasks (assignment_id, student_id, ta_id, assigned_at, status)
            VALUES ($1, $2, $3, NOW(), 'assigned')
            ON CONFLICT DO NOTHING
          `, [assignment.id, students[i].student_id, ta.id]);
          console.log(`Allocated student ${students[i].student_id} to TA ${ta.name}`);
        }
      }
    }

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error seeding TA assignments:', err);
  } finally {
    await pool.end();
  }
}

seedTAAssignments();
