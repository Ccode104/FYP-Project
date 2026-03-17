import 'dotenv/config';
import { pool } from '../db/index.js';

async function testQuizResults() {
  try {
    console.log('=== TESTING QUIZ RESULTS ENDPOINT ===\n');

    // Test the quiz results endpoint logic
    const quizId = 7; // Test Quiz from our seed data
    const studentId = 38; // DummyStudent

    console.log(`Testing quiz results for Quiz ID: ${quizId}, Student ID: ${studentId}\n`);

    // Get quiz details
    const quizQuery = `
      SELECT q.*, c.code as course_code, c.title as course_title
      FROM quizzes q
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE q.id = $1
    `;
    const quizResult = await pool.query(quizQuery, [quizId]);

    if (quizResult.rows.length === 0) {
      console.log('❌ Quiz not found');
      return;
    }

    const quiz = quizResult.rows[0];
    console.log('✅ Quiz found:', {
      id: quiz.id,
      title: quiz.title,
      max_score: quiz.max_score,
      is_proctored: quiz.is_proctored,
      course_code: quiz.course_code,
      course_title: quiz.course_title
    });

    // Get student's attempts for this quiz
    const attemptsQuery = `
      SELECT
        qa.*,
        CASE WHEN qa.violated THEN 'Violated - Score Penalized' ELSE 'Completed' END as status_text
      FROM quiz_attempts qa
      WHERE qa.quiz_id = $1 AND qa.student_id = $2
      ORDER BY qa.finished_at DESC NULLS LAST, qa.started_at DESC NULLS LAST
    `;
    const attemptsResult = await pool.query(attemptsQuery, [quizId, studentId]);

    console.log(`\n✅ Found ${attemptsResult.rows.length} attempts for this student`);

    // Parse answers for each attempt
    const attempts = attemptsResult.rows.map(attempt => ({
      ...attempt,
      answers: typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : attempt.answers
    }));

    attempts.forEach((attempt, index) => {
      console.log(`\nAttempt ${index + 1}:`);
      console.log(`  ID: ${attempt.id}`);
      console.log(`  Score: ${attempt.score}`);
      console.log(`  Status: ${attempt.status_text}`);
      console.log(`  Finished: ${attempt.finished_at}`);
      console.log(`  Violated: ${attempt.violated}`);
      console.log('  Answers:', JSON.stringify(attempt.answers, null, 2));
    });

    // Get quiz questions (without correct answers)
    const questionsQuery = `
      SELECT id, question_text, question_type, metadata
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY id
    `;
    const questionsResult = await pool.query(questionsQuery, [quizId]);

    console.log(`\n✅ Found ${questionsResult.rows.length} questions in this quiz`);

    // Remove correct answers from questions for security
    const questions = questionsResult.rows.map(q => {
      const metadata = typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata;
      const studentMetadata = { ...metadata };
      if (q.question_type === 'mcq' || q.question_type === 'true_false') {
        delete studentMetadata.correct_answer;
      }
      return {
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        metadata: studentMetadata
      };
    });

    questions.forEach((q, index) => {
      console.log(`\nQuestion ${index + 1}:`);
      console.log(`  Text: ${q.question_text}`);
      console.log(`  Type: ${q.question_type}`);
      console.log('  Options:', q.metadata?.options || 'N/A');
    });

    console.log('\n=== QUIZ RESULTS ENDPOINT TEST COMPLETE ===');
    console.log('✅ All data retrieved successfully - endpoint should work!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testQuizResults();