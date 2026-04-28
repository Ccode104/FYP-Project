import 'dotenv/config';
import { pool } from '../db/index.js';

async function createTestRubrics() {
  try {
    console.log('Creating test rubrics...');

    // Get course offerings
    const offeringsResult = await pool.query('SELECT id, course_id FROM course_offerings LIMIT 2');
    if (offeringsResult.rows.length === 0) {
      console.log('No course offerings found');
      return;
    }

    for (const offering of offeringsResult.rows) {
      // Create a rubric for this course offering
      const rubricResult = await pool.query(`
        INSERT INTO rubrics (title, description, course_offering_id, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [`Test Rubric for ${offering.course_id}`, 'A test rubric for grading assignments', offering.id, 1]);

      const rubricId = rubricResult.rows[0].id;
      console.log(`Created rubric ${rubricId} for course offering ${offering.id}`);

      // Create rubric criteria
      const criteria = [
        { title: 'Correctness', description: 'Solution correctness and accuracy', max_points: 40, weight: 2.0 },
        { title: 'Code Quality', description: 'Code readability and structure', max_points: 30, weight: 1.5 },
        { title: 'Efficiency', description: 'Algorithm efficiency and optimization', max_points: 20, weight: 1.0 },
        { title: 'Documentation', description: 'Comments and documentation quality', max_points: 10, weight: 0.5 }
      ];

      for (let i = 0; i < criteria.length; i++) {
        const criterion = criteria[i];
        await pool.query(`
          INSERT INTO rubric_criteria (rubric_id, title, description, max_points, weight, position)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [rubricId, criterion.title, criterion.description, criterion.max_points, criterion.weight, i]);
      }

      console.log(`Created ${criteria.length} criteria for rubric ${rubricId}`);

      // Assign this rubric to assignments in this course offering
      const assignmentsResult = await pool.query(`
        SELECT id, title FROM assignments WHERE course_offering_id = $1
      `, [offering.id]);

      for (const assignment of assignmentsResult.rows) {
        await pool.query(`
          INSERT INTO assignment_rubrics (assignment_id, rubric_id)
          VALUES ($1, $2)
          ON CONFLICT (assignment_id) DO NOTHING
        `, [assignment.id, rubricId]);

        console.log(`Assigned rubric ${rubricId} to assignment ${assignment.id} (${assignment.title})`);
      }
    }

    console.log('Test rubrics created successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

createTestRubrics();
