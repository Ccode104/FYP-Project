import 'dotenv/config';
import { pool } from '../db/index.js';

async function seedTeacherAssignments() {
  const teacherRes = await pool.query(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    ['teacher@gmail.com'],
  );

  if (teacherRes.rowCount === 0) {
    throw new Error('Teacher account teacher@gmail.com was not found in the database.');
  }

  const teacherId = teacherRes.rows[0].id;
  const offeringRes = await pool.query(
    `SELECT id FROM course_offerings WHERE faculty_id = $1 ORDER BY id LIMIT 1`,
    [teacherId],
  );

  if (offeringRes.rowCount === 0) {
    throw new Error('No course offerings were found for the teacher account.');
  }

  const offeringId = offeringRes.rows[0].id;
  const existing = await pool.query(
    `SELECT title FROM assignments WHERE course_offering_id = $1`,
    [offeringId],
  );

  const existingTitles = new Set(existing.rows.map((row) => row.title));
  const now = new Date();
  const dueInOneWeek = new Date(now);
  dueInOneWeek.setDate(now.getDate() + 7);
  const dueInTwoWeeks = new Date(now);
  dueInTwoWeeks.setDate(now.getDate() + 14);

  const assignments = [
    {
      title: 'Data Structures Lab 1',
      description: 'Implement linked list operations with test cases and submit your code repository link.',
      assignment_type: 'code',
      release_at: now.toISOString(),
      due_at: dueInOneWeek.toISOString(),
      max_score: 100,
    },
    {
      title: 'Advanced Algorithms Homework',
      description: 'Solve the assigned graph and dynamic programming problems and submit your answers.',
      assignment_type: 'file',
      release_at: now.toISOString(),
      due_at: dueInTwoWeeks.toISOString(),
      max_score: 100,
    },
  ];

  const inserted = [];
  for (const assignment of assignments) {
    if (existingTitles.has(assignment.title)) {
      continue;
    }

    const result = await pool.query(
      `INSERT INTO assignments (course_offering_id, title, description, assignment_type, release_at, due_at, max_score, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        offeringId,
        assignment.title,
        assignment.description,
        assignment.assignment_type,
        assignment.release_at,
        assignment.due_at,
        assignment.max_score,
        teacherId,
      ],
    );
    inserted.push(result.rows[0].id);
  }

  if (inserted.length === 0) {
    console.log('No new assignments were inserted: existing assignments already cover the demo titles.');
  } else {
    console.log(`Inserted ${inserted.length} assignment(s):`, inserted);
  }

  await pool.end();
}

seedTeacherAssignments().catch((error) => {
  console.error('Failed to seed teacher assignments:', error);
  process.exit(1);
});
