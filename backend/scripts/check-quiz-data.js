import 'dotenv/config';
import { pool } from '../db/index.js';

async function checkQuizData() {
  try {
    console.log('=== CHECKING QUIZ DATA ===\n');

    // Check quizzes
    const quizzes = await pool.query('SELECT id, title, course_offering_id FROM quizzes ORDER BY id');
    console.log('Quizzes:', quizzes.rows.length, 'found');
    quizzes.rows.forEach(q => console.log(`  ID: ${q.id}, Title: ${q.title}, Course Offering: ${q.course_offering_id}`));

    // Check quiz attempts
    const attempts = await pool.query('SELECT id, quiz_id, student_id, score, finished_at FROM quiz_attempts WHERE student_id = 38 ORDER BY id');
    console.log('\nQuiz attempts for DummyStudent:', attempts.rows.length, 'found');
    attempts.rows.forEach(a => console.log(`  ID: ${a.id}, Quiz: ${a.quiz_id}, Score: ${a.score}, Finished: ${a.finished_at}`));

    // Check quiz questions
    const questions = await pool.query('SELECT id, quiz_id, question_text FROM quiz_questions ORDER BY quiz_id, id');
    console.log('\nQuiz questions:', questions.rows.length, 'found');
    questions.rows.forEach(q => console.log(`  Quiz ${q.quiz_id}: ${q.question_text.substring(0, 50)}...`));

    console.log('\n=== QUIZ DATA CHECK COMPLETE ===');

  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await pool.end();
  }
}

checkQuizData();