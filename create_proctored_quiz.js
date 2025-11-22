import 'dotenv/config';
import { pool } from './backend/db/index.js';

async function createProctoredQuiz() {
  try {
    console.log('Creating a proctored quiz...');

    // Get first course offering
    const offerings = await pool.query('SELECT id FROM course_offerings LIMIT 1');
    if (offerings.rows.length === 0) {
      console.log('No course offerings found. Creating a test course offering...');

      // Create test data
      const course = await pool.query('INSERT INTO courses (code, title) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title RETURNING id', ['TEST101', 'Test Course']);
      const courseId = course.rows[0].id;

      const user = await pool.query('INSERT INTO users (email, name, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id', ['test@faculty.com', 'Test Faculty', 'faculty']);
      const facultyId = user.rows[0].id;

      const offering = await pool.query('INSERT INTO course_offerings (course_id, faculty_id, term) VALUES ($1, $2, $3) RETURNING id', [courseId, facultyId, 'Fall 2024']);
      var offeringId = offering.rows[0].id;
    } else {
      var offeringId = offerings.rows[0].id;
    }

    console.log(`Using course offering ID: ${offeringId}`);

    // Create proctored quiz
    const quiz = await pool.query(`
      INSERT INTO quizzes (course_offering_id, title, is_proctored, time_limit, max_score)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [offeringId, 'Proctored Demo Quiz', true, 5, 100]);

    const quizId = quiz.rows[0].id;
    console.log(`Created proctored quiz with ID: ${quizId}`);

    // Add questions
    const questions = [
      {
        text: 'What is 2 + 2?',
        type: 'mcq',
        metadata: {
          choices: ['3', '4', '5', '6'],
          correct_answer: 1
        }
      },
      {
        text: 'What is the capital of France?',
        type: 'mcq',
        metadata: {
          choices: ['London', 'Berlin', 'Paris', 'Madrid'],
          correct_answer: 2
        }
      },
      {
        text: 'Briefly explain what a variable is in programming.',
        type: 'short',
        metadata: {
          correct_answer: 'A variable is a storage location that holds data'
        }
      }
    ];

    for (const q of questions) {
      await pool.query(`
        INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata)
        VALUES ($1, $2, $3, $4)
      `, [quizId, q.text, q.type, JSON.stringify(q.metadata)]);
    }

    console.log('✅ Proctored quiz created successfully!');
    console.log('');
    console.log('Quiz Details:');
    console.log('- Title: Proctored Demo Quiz');
    console.log('- Proctored: ✅ Yes');
    console.log('- Time limit: 5 minutes');
    console.log('- Max score: 100');
    console.log('- Questions: 3 (2 MCQ + 1 Short Answer)');
    console.log('');
    console.log('You can now:');
    console.log('1. Go to student dashboard → Quizzes tab');
    console.log('2. Look for "🔒 PROCTORED" badge next to the quiz title');
    console.log('3. Click "Start Quiz" to experience proctoring features');

  } catch (err) {
    console.error('Error creating proctored quiz:', err.message);
  } finally {
    await pool.end();
  }
}

createProctoredQuiz();