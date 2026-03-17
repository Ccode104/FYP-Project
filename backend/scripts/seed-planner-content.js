import 'dotenv/config';
import { pool } from '../db/index.js';

async function seedPlannerContent() {
  const student = await pool.query(`SELECT id FROM users WHERE email = 'student@gmail.com' LIMIT 1`);
  const faculty = await pool.query(`SELECT id FROM users WHERE email = 'teacher@gmail.com' LIMIT 1`);

  if (student.rows.length === 0 || faculty.rows.length === 0) {
    throw new Error('Required demo users not found');
  }

  const offering = await pool.query(`SELECT id FROM course_offerings ORDER BY id ASC LIMIT 1`);
  if (offering.rows.length === 0) {
    throw new Error('No course offering found');
  }

  const offeringId = offering.rows[0].id;

  // Ensure enrollment
  await pool.query(
    `INSERT INTO enrollments (course_offering_id, student_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [offeringId, student.rows[0].id],
  );

  const now = new Date();
  const dueAssignment = new Date(now);
  dueAssignment.setDate(now.getDate() + 7);
  const quizStart = new Date(now);
  quizStart.setDate(now.getDate() + 3);
  const quizEnd = new Date(now);
  quizEnd.setDate(now.getDate() + 5);

  const assignment = await pool.query(
    `INSERT INTO assignments (
      course_offering_id, title, description, assignment_type, release_at, due_at, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING id`,
    [
      offeringId,
      'AI Planner Demo Assignment',
      'Use this assignment to test auto-generated planning.',
      'file',
      now,
      dueAssignment,
      faculty.rows[0].id,
    ],
  );

  await pool.query(
    `INSERT INTO quizzes (
      course_offering_id, title, start_at, end_at, max_score, is_proctored, time_limit
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [offeringId, 'Planner Demo Quiz', quizStart, quizEnd, 20, false, 30],
  );

  console.log(`Seeded assignment ${assignment.rows[0].id} and quiz for offering ${offeringId}.`);
  await pool.end();
}

seedPlannerContent().catch((err) => {
  console.error('Failed to seed planner content:', err);
  process.exit(1);
});

