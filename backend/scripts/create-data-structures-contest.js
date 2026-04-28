import 'dotenv/config';
import { pool } from '../db/index.js';

async function createDataStructuresContest() {
  try {
    console.log('Creating Data Structures Implementation Contest...');

    // Find CSE304 course offering
    const courseResult = await pool.query(
      'SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = \'CSE304\' LIMIT 1'
    );

    if (courseResult.rows.length === 0) {
      console.error('CSE304 course offering not found');
      return;
    }

    const courseOfferingId = courseResult.rows[0].id;
    console.log('Found course offering ID:', courseOfferingId);

    // Find the assignment
    const assignmentResult = await pool.query(
      'SELECT id FROM assignments WHERE title = \'Data Structures Implementation\' AND course_offering_id = $1',
      [courseOfferingId]
    );

    if (assignmentResult.rows.length === 0) {
      console.error('Data Structures Implementation assignment not found');
      return;
    }

    const assignmentId = assignmentResult.rows[0].id;
    console.log('Found assignment ID:', assignmentId);

    // Get the questions from the assignment
    const questionsResult = await pool.query(`
      SELECT cq.id, cq.title
      FROM assignment_questions aq
      JOIN code_questions cq ON aq.question_id = cq.id
      WHERE aq.assignment_id = $1
      ORDER BY aq.position
    `, [assignmentId]);

    console.log('Found questions:', questionsResult.rows);

    if (questionsResult.rows.length === 0) {
      console.error('No questions found for the assignment');
      return;
    }

    const questionIds = questionsResult.rows.map(q => q.id);

    // Create the contest
    const contestResult = await pool.query(`
      INSERT INTO contests (
        course_offering_id, title, description, start_at, end_at,
        max_score, allow_multiple_submissions, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING id
    `, [
      courseOfferingId,
      'Data Structures Implementation Contest',
      'Coding contest for implementing basic data structures',
      new Date(Date.now() + 24 * 60 * 60 * 1000), // Start tomorrow
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // End in 7 days
      100,
      true,
      1 // Assuming admin user ID 1
    ]);

    const contestId = contestResult.rows[0].id;
    console.log('Created contest with ID:', contestId);

    // Add questions to contest
    for (let i = 0; i < questionIds.length; i++) {
      const questionId = questionIds[i];
      const points = i === 0 ? 35 : i === 1 ? 35 : 30; // Stack: 35, Queue: 35, Linked List: 30

      await pool.query(`
        INSERT INTO contest_questions (contest_id, question_id, points, position)
        VALUES ($1, $2, $3, $4)
      `, [contestId, questionId, points, i + 1]);

      console.log(`Added question ${questionId} to contest`);
    }

    console.log('Data Structures Implementation Contest created successfully!');

  } catch (error) {
    console.error('Error creating contest:', error);
  } finally {
    await pool.end();
  }
}

createDataStructuresContest();
