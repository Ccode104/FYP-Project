import 'dotenv/config';
import { pool } from '../db/index.js';

async function fixStudentProgressView() {
  try {
    console.log('Creating student_detailed_progress view...');

    // Drop the view if it exists
    await pool.query('DROP VIEW IF EXISTS student_detailed_progress CASCADE');
    console.log('Dropped existing view (if any)');

    // Create the view
    const createViewSQL = `
      CREATE VIEW student_detailed_progress AS
      SELECT
          e.student_id,
          u.name AS student_name,
          co.id AS course_offering_id,
          c.code AS course_code,
          c.title AS course_title,
          'assignment'::text AS activity_type,
          a.id AS activity_id,
          a.title AS activity_title,
          a.assignment_type AS subtype,
          a.due_at,
          asub.submitted_at,
          asub.final_score AS score,
          asub.status,
          asub.attempt,
          asub.graded_at,
          asub.comments,
          now() AS last_updated
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN course_offerings co ON e.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN assignments a ON a.course_offering_id = co.id
      LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = e.student_id
      UNION ALL
      SELECT
          e.student_id,
          u.name AS student_name,
          co.id AS course_offering_id,
          c.code AS course_code,
          c.title AS course_title,
          'quiz'::text AS activity_type,
          q.id AS activity_id,
          q.title AS activity_title,
          NULL::text AS subtype,
          q.end_at AS due_at,
          qa.finished_at AS submitted_at,
          qa.score,
          CASE WHEN qa.id IS NULL THEN 'not_attempted'::text ELSE 'completed'::text END AS status,
          NULL::integer AS attempt,
          NULL::timestamptz AS graded_at,
          NULL::text AS comments,
          now() AS last_updated
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN course_offerings co ON e.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN quizzes q ON q.course_offering_id = co.id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = e.student_id
      ORDER BY 3, 1, 6, 7;
    `;

    await pool.query(createViewSQL);
    console.log('✅ student_detailed_progress view created successfully!');

  } catch (error) {
    console.error('❌ Error creating view:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixStudentProgressView();
