import 'dotenv/config';
import { pool } from '../db/index.js';

async function checkLMS101QuizData() {
  try {
    console.log('=== CHECKING LMS101 QUIZ DATA ===\n');

    // Get LMS101 course offering
    const courseQuery = 'SELECT co.id, c.code, c.title FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = \'LMS101\'';
    const courseResult = await pool.query(courseQuery);
    console.log('LMS101 Course Offering:', courseResult.rows[0]);

    if (courseResult.rows.length === 0) {
      console.log('❌ LMS101 course not found!');
      return;
    }

    const courseOfferingId = courseResult.rows[0].id;

    // Get quizzes for LMS101
    const quizQuery = 'SELECT q.id, q.title, q.is_proctored, q.max_score FROM quizzes q WHERE q.course_offering_id = $1';
    const quizResult = await pool.query(quizQuery, [courseOfferingId]);
    console.log('\nQuizzes in LMS101:', quizResult.rows.length, 'found');
    quizResult.rows.forEach(q => console.log('  Quiz:', q.id, q.title, 'Proctored:', q.is_proctored, 'Max Score:', q.max_score));

    // Get quiz attempts for DummyStudent in LMS101
    const attemptsQuery = 'SELECT qa.id, qa.quiz_id, qa.score, qa.finished_at, q.title FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id WHERE qa.student_id = 38 AND q.course_offering_id = $1';
    const attemptsResult = await pool.query(attemptsQuery, [courseOfferingId]);
    console.log('\nQuiz attempts by DummyStudent in LMS101:', attemptsResult.rows.length, 'found');
    attemptsResult.rows.forEach(a => console.log('  Attempt:', a.id, 'Quiz:', a.title, 'Score:', a.score, 'Finished:', a.finished_at));

    // Check all quiz attempts by DummyStudent
    const allAttemptsQuery = 'SELECT qa.id, qa.quiz_id, qa.score, qa.finished_at, q.title, c.code as course_code FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id JOIN course_offerings co ON q.course_offering_id = co.id JOIN courses c ON co.course_id = c.id WHERE qa.student_id = 38';
    const allAttemptsResult = await pool.query(allAttemptsQuery);
    console.log('\nAll quiz attempts by DummyStudent:', allAttemptsResult.rows.length, 'found');
    allAttemptsResult.rows.forEach(a => console.log('  Attempt:', a.id, 'Quiz:', a.title, 'Course:', a.course_code, 'Score:', a.score));

    // Check which course offering the quiz attempt belongs to
    if (allAttemptsResult.rows.length > 0) {
      const quizId = allAttemptsResult.rows[0].quiz_id;
      const quizCourseQuery = 'SELECT q.id, q.title, co.id as offering_id, c.code, c.title FROM quizzes q JOIN course_offerings co ON q.course_offering_id = co.id JOIN courses c ON co.course_id = c.id WHERE q.id = $1';
      const quizCourseResult = await pool.query(quizCourseQuery, [quizId]);
      console.log('\nQuiz belongs to course:', quizCourseResult.rows[0]);
    }

  } catch (error) {
    console.error('❌ Query failed:', error);
  } finally {
    await pool.end();
  }
}

checkLMS101QuizData();
