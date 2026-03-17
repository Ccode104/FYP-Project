import { pool } from './db/index.js';

async function addCSE304QuizQuestions() {
  try {
    console.log('Adding quiz questions to CSE304 quizzes...');

    // Get CSE304 course offering
    const offeringQuery = `
      SELECT co.id
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.id
      WHERE c.code = 'CSE304'
      LIMIT 1
    `;
    const offeringResult = await pool.query(offeringQuery);

    if (offeringResult.rows.length === 0) {
      console.log('CSE304 course offering not found');
      return;
    }

    const offeringId = offeringResult.rows[0].id;
    console.log('Found CSE304 offering ID:', offeringId);

    // Get quizzes for this offering
    const quizQuery = `
      SELECT id, title
      FROM quizzes
      WHERE course_offering_id = $1
    `;
    const quizResult = await pool.query(quizQuery, [offeringId]);

    console.log('Found quizzes:', quizResult.rows);

    for (const quiz of quizResult.rows) {
      console.log(`Adding questions to quiz: ${quiz.title} (ID: ${quiz.id})`);

      // Delete existing questions first
      await pool.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quiz.id]);

      // Add questions based on quiz title
      if (quiz.title === 'Basic Programming Quiz') {
        await addBasicProgrammingQuestions(quiz.id);
      } else if (quiz.title === 'Advanced Algorithms Quiz') {
        await addAdvancedAlgorithmsQuestions(quiz.id);
      } else if (quiz.title === 'Database Concepts Quiz') {
        await addDatabaseConceptsQuestions(quiz.id);
      } else if (quiz.title === 'Database Design and SQL Quiz') {
        await addDatabaseDesignQuestions(quiz.id);
      } else if (quiz.title === 'Programming Fundamentals Quiz') {
        await addProgrammingFundamentalsQuestions(quiz.id);
      }
    }

    console.log('Quiz questions added successfully!');
  } catch (error) {
    console.error('Error adding quiz questions:', error);
  } finally {
    process.exit(0);
  }
}

async function addBasicProgrammingQuestions(quizId) {
  const questions = [
    {
      question_text: 'What is the output of: print(2 + 3 * 4)',
      question_type: 'mcq',
      metadata: {
        choices: ['20', '14', '11', '24'],
        correct_answer: 1
      }
    },
    {
      question_text: 'Which of the following is NOT a valid Python data type?',
      question_type: 'mcq',
      metadata: {
        choices: ['int', 'str', 'float', 'integer'],
        correct_answer: 3
      }
    },
    {
      question_text: 'What does the len() function return?',
      question_type: 'short',
      metadata: {
        correct_answer: 'The length of a sequence (string, list, etc.)'
      }
    },
    {
      question_text: 'True or False: Python is a compiled language.',
      question_type: 'true_false',
      metadata: {
        choices: ['True', 'False'],
        correct_answer: 1
      }
    },
    {
      question_text: 'What is the correct way to declare a variable in Python?',
      question_type: 'mcq',
      metadata: {
        choices: ['var x = 5', 'int x = 5', 'x = 5', 'declare x = 5'],
        correct_answer: 2
      }
    }
  ];

  for (const q of questions) {
    await pool.query(`
      INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata)
      VALUES ($1, $2, $3, $4)
    `, [quizId, q.question_text, q.question_type, JSON.stringify(q.metadata)]);
  }
}

async function addAdvancedAlgorithmsQuestions(quizId) {
  const questions = [
    {
      question_text: 'What is the time complexity of binary search?',
      question_type: 'mcq',
      metadata: {
        choices: ['O(n)', 'O(log n)', 'O(n log n)', 'O(n²)'],
        correct_answer: 1
      }
    },
    {
      question_text: 'Which sorting algorithm has the best average case time complexity?',
      question_type: 'mcq',
      metadata: {
        choices: ['Bubble Sort', 'Quick Sort', 'Insertion Sort', 'Selection Sort'],
        correct_answer: 1
      }
    },
    {
      question_text: 'What does DFS stand for in graph algorithms?',
      question_type: 'short',
      metadata: {
        correct_answer: 'Depth First Search'
      }
    },
    {
      question_text: 'True or False: Dynamic programming can be used to solve problems with overlapping subproblems.',
      question_type: 'true_false',
      metadata: {
        choices: ['True', 'False'],
        correct_answer: 0
      }
    },
    {
      question_text: 'What is the space complexity of merge sort?',
      question_type: 'mcq',
      metadata: {
        choices: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correct_answer: 2
      }
    }
  ];

  for (const q of questions) {
    await pool.query(`
      INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata)
      VALUES ($1, $2, $3, $4)
    `, [quizId, q.question_text, q.question_type, JSON.stringify(q.metadata)]);
  }
}

async function addDatabaseConceptsQuestions(quizId) {
  const questions = [
    {
      question_text: 'What does SQL stand for?',
      question_type: 'mcq',
      metadata: {
        choices: ['Simple Query Language', 'Structured Query Language', 'Standard Query Language', 'System Query Language'],
        correct_answer: 1
      }
    },
    {
      question_text: 'Which of the following is NOT a type of database relationship?',
      question_type: 'mcq',
      metadata: {
        choices: ['One-to-One', 'One-to-Many', 'Many-to-Many', 'Zero-to-One'],
        correct_answer: 3
      }
    },
    {
      question_text: 'What is a primary key in a database table?',
      question_type: 'short',
      metadata: {
        correct_answer: 'A unique identifier for each record in a table'
      }
    },
    {
      question_text: 'True or False: Foreign keys establish relationships between tables.',
      question_type: 'true_false',
      metadata: {
        choices: ['True', 'False'],
        correct_answer: 0
      }
    },
    {
      question_text: 'Which SQL command is used to retrieve data from a database?',
      question_type: 'mcq',
      metadata: {
        choices: ['INSERT', 'UPDATE', 'SELECT', 'DELETE'],
        correct_answer: 2
      }
    }
  ];

  for (const q of questions) {
    await pool.query(`
      INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata)
      VALUES ($1, $2, $3, $4)
    `, [quizId, q.question_text, q.question_type, JSON.stringify(q.metadata)]);
  }
}

async function addDatabaseDesignQuestions(quizId) {
  const questions = [
    {
      question_text: 'What is the purpose of database normalization?',
      question_type: 'mcq',
      metadata: {
        choices: ['To make queries faster', 'To reduce data redundancy', 'To increase storage space', 'To complicate the schema'],
        correct_answer: 1
      }
    },
    {
      question_text: 'What is 1NF in database normalization?',
      question_type: 'short',
      metadata: {
        correct_answer: 'First Normal Form - eliminates repeating groups'
      }
    },
    {
      question_text: 'True or False: A foreign key can reference a primary key in another table.',
      question_type: 'true_false',
      metadata: {
        choices: ['True', 'False'],
        correct_answer: 0
      }
    },
    {
      question_text: 'Which of the following is an example of a NoSQL database?',
      question_type: 'mcq',
      metadata: {
        choices: ['MySQL', 'PostgreSQL', 'MongoDB', 'Oracle'],
        correct_answer: 2
      }
    },
    {
      question_text: 'What does ACID stand for in database transactions?',
      question_type: 'mcq',
      metadata: {
        choices: ['Atomicity, Consistency, Isolation, Durability', 'Accuracy, Completeness, Integrity, Durability', 'Atomicity, Consistency, Independence, Durability', 'Accuracy, Consistency, Isolation, Durability'],
        correct_answer: 0
      }
    }
  ];

  for (const q of questions) {
    await pool.query(`
      INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata)
      VALUES ($1, $2, $3, $4)
    `, [quizId, q.question_text, q.question_type, JSON.stringify(q.metadata)]);
  }
}

async function addProgrammingFundamentalsQuestions(quizId) {
  const questions = [
    {
      question_text: 'What is the difference between a compiler and an interpreter?',
      question_type: 'short',
      metadata: {
        correct_answer: 'Compiler translates entire program at once, interpreter translates line by line'
      }
    },
    {
      question_text: 'Which programming paradigm focuses on objects and classes?',
      question_type: 'mcq',
      metadata: {
        choices: ['Procedural', 'Functional', 'Object-Oriented', 'Logical'],
        correct_answer: 2
      }
    },
    {
      question_text: 'True or False: Recursion can always be replaced with iteration.',
      question_type: 'true_false',
      metadata: {
        choices: ['True', 'False'],
        correct_answer: 0
      }
    },
    {
      question_text: 'What is the purpose of version control systems?',
      question_type: 'mcq',
      metadata: {
        choices: ['To compile code', 'To track changes in code', 'To debug programs', 'To optimize performance'],
        correct_answer: 1
      }
    },
    {
      question_text: 'Which of the following is an example of a high-level programming language?',
      question_type: 'mcq',
      metadata: {
        choices: ['Assembly', 'Machine Code', 'Python', 'Binary'],
        correct_answer: 2
      }
    }
  ];

  for (const q of questions) {
    await pool.query(`
      INSERT INTO quiz_questions (quiz_id, question_text, question_type, metadata)
      VALUES ($1, $2, $3, $4)
    `, [quizId, q.question_text, q.question_type, JSON.stringify(q.metadata)]);
  }
}

addCSE304QuizQuestions();