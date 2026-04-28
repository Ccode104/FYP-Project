import 'dotenv/config';
import { pool } from '../db/index.js';

async function populateCSE304DataStructures() {
  try {
    console.log('Populating CSE304 Data Structures Implementation assignment...');

    // Find the CSE304 course offering
    const courseResult = await pool.query(`
      SELECT co.id FROM course_offerings co
      JOIN courses c ON co.course_id = c.id
      WHERE c.code = $1
    `, ['CSE304']);

    let courseId;
    if (courseResult.rows.length === 0) {
      console.log('CSE304 course offering not found. Creating it...');

      // First check if CSE304 course exists
      const courseCheck = await pool.query('SELECT id FROM courses WHERE code = $1', ['CSE304']);
      let courseTableId;

      if (courseCheck.rows.length === 0) {
        // Create the course
        const courseInsert = await pool.query(`
          INSERT INTO courses (code, title, description, department_id, credits, created_at)
          VALUES ($1, $2, $3, (SELECT id FROM departments LIMIT 1), $4, $5)
          RETURNING id
        `, ['CSE304', 'Data Structures and Algorithms', 'Advanced data structures and algorithm implementation', 4, new Date()]);
        courseTableId = courseInsert.rows[0].id;
      } else {
        courseTableId = courseCheck.rows[0].id;
      }

      // Create course offering
      const offeringInsert = await pool.query(`
        INSERT INTO course_offerings (course_id, term, section, faculty_id, max_capacity, start_date, end_date, created_at)
        VALUES ($1, $2, $3, (SELECT id FROM users WHERE role = 'faculty' LIMIT 1), $4, $5, $6, $7)
        RETURNING id
      `, [courseTableId, 'Spring 2025', 'A', 50, '2025-01-15', '2025-05-15', new Date()]);

      courseId = offeringInsert.rows[0].id;
    } else {
      courseId = courseResult.rows[0].id;
    }
    console.log(`Using course ID: ${courseId}`);

    // Find or create the Data Structures Implementation assignment
    const assignmentResult = await pool.query(
      'SELECT id FROM assignments WHERE title = $1 AND course_offering_id = $2',
      ['Data Structures Implementation', courseId]
    );

    let assignmentId;
    if (assignmentResult.rows.length === 0) {
      console.log('Creating Data Structures Implementation assignment...');
      const assignmentInsert = await pool.query(`
        INSERT INTO assignments (
          course_offering_id, title, description, assignment_type,
          total_points, due_date, is_graded, allow_multiple_submissions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        courseId,
        'Data Structures Implementation',
        'Implement various data structures and algorithms in code',
        'code',
        100,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        true,
        true
      ]);
      assignmentId = assignmentInsert.rows[0].id;
    } else {
      assignmentId = assignmentResult.rows[0].id;
    }

    console.log(`Using assignment ID: ${assignmentId}`);

    // Create code questions
    const questions = [
      {
        title: 'Binary Search Tree Implementation',
        description: 'Implement a binary search tree with insert, delete, and search operations',
        difficulty: 'medium',
        language: 'javascript',
        template_code: `class Node {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class BinarySearchTree {
  constructor() {
    this.root = null;
  }

  // Implement insert method
  insert(value) {
    // Your code here
  }

  // Implement search method
  search(value) {
    // Your code here
  }

  // Implement delete method
  delete(value) {
    // Your code here
  }
}`,
        testCases: [
          {
            input_text: 'insert 5\ninsert 3\ninsert 7\nsearch 3',
            expected_text: 'true',
            is_sample: true
          },
          {
            input_text: 'insert 10\ninsert 5\ninsert 15\ninsert 3\ninsert 7\ndelete 5\nsearch 5',
            expected_text: 'false',
            is_sample: false
          },
          {
            input_text: 'insert 1\ninsert 2\ninsert 3\ninsert 4\ninsert 5\nsearch 6',
            expected_text: 'false',
            is_sample: false
          }
        ]
      },
      {
        title: 'Stack Implementation using Arrays',
        description: 'Implement a stack data structure using arrays with push, pop, and peek operations',
        difficulty: 'easy',
        language: 'javascript',
        template_code: `class Stack {
  constructor() {
    this.items = [];
  }

  // Implement push method
  push(element) {
    // Your code here
  }

  // Implement pop method
  pop() {
    // Your code here
  }

  // Implement peek method
  peek() {
    // Your code here
  }

  // Implement isEmpty method
  isEmpty() {
    // Your code here
  }

  // Implement size method
  size() {
    // Your code here
  }
}`,
        testCases: [
          {
            input_text: 'push 1\npush 2\npush 3\npop\npeek',
            expected_text: '2',
            is_sample: true
          },
          {
            input_text: 'push 10\npush 20\npop\npop\nisEmpty',
            expected_text: 'true',
            is_sample: false
          },
          {
            input_text: 'size\npush 1\npush 2\nsize',
            expected_text: '2',
            is_sample: false
          }
        ]
      },
      {
        title: 'Queue Implementation using Linked List',
        description: 'Implement a queue data structure using linked list with enqueue, dequeue, and front operations',
        difficulty: 'medium',
        language: 'javascript',
        template_code: `class Node {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class Queue {
  constructor() {
    this.front = null;
    this.rear = null;
    this.size = 0;
  }

  // Implement enqueue method
  enqueue(value) {
    // Your code here
  }

  // Implement dequeue method
  dequeue() {
    // Your code here
  }

  // Implement front method
  front() {
    // Your code here
  }

  // Implement isEmpty method
  isEmpty() {
    // Your code here
  }

  // Implement getSize method
  getSize() {
    // Your code here
  }
}`,
        testCases: [
          {
            input_text: 'enqueue 1\nenqueue 2\nenqueue 3\ndequete\nfront',
            expected_text: '2',
            is_sample: true
          },
          {
            input_text: 'enqueue 10\nenqueue 20\ndequete\ndequete\nisEmpty',
            expected_text: 'true',
            is_sample: false
          },
          {
            input_text: 'getSize\nenqueue 1\nenqueue 2\nenqueue 3\ngetSize',
            expected_text: '3',
            is_sample: false
          }
        ]
      }
    ];

    for (const questionData of questions) {
      // Check if question already exists
      const existingQuestion = await pool.query(
        'SELECT id FROM code_questions WHERE title = $1',
        [questionData.title]
      );

      let questionId;
      if (existingQuestion.rows.length === 0) {
        console.log(`Creating question: ${questionData.title}`);

        // Insert code question (only basic columns that exist)
        const questionInsert = await pool.query(`
          INSERT INTO code_questions (
            title, description, constraints, created_by
          ) VALUES ($1, $2, $3, (SELECT id FROM users WHERE role = 'faculty' LIMIT 1))
          RETURNING id
        `, [
          questionData.title,
          questionData.description,
          `Language: ${questionData.language}\nDifficulty: ${questionData.difficulty}\nTime Limit: 30s\nMemory Limit: 256MB\n\nTemplate Code:\n${questionData.template_code}`
        ]);

        questionId = questionInsert.rows[0].id;

        // Insert test cases
        for (const testCase of questionData.testCases) {
          await pool.query(`
            INSERT INTO code_question_testcases (
              question_id, input_text, expected_text, is_sample
            ) VALUES ($1, $2, $3, $4)
          `, [
            questionId,
            testCase.input_text,
            testCase.expected_text,
            testCase.is_sample
          ]);
        }
      } else {
        questionId = existingQuestion.rows[0].id;
        console.log(`Question already exists: ${questionData.title} (ID: ${questionId})`);
      }

      // Link question to assignment
      const existingLink = await pool.query(
        'SELECT id FROM assignment_questions WHERE assignment_id = $1 AND question_id = $2',
        [assignmentId, questionId]
      );

      if (existingLink.rows.length === 0) {
        console.log(`Linking question ${questionData.title} to assignment`);
        await pool.query(`
          INSERT INTO assignment_questions (assignment_id, question_id, position, points)
          VALUES ($1, $2, $3, $4)
        `, [
          assignmentId,
          questionId,
          questions.indexOf(questionData) + 1,
          33 // Equal points for each question (100/3 ≈ 33)
        ]);
      } else {
        console.log(`Question ${questionData.title} already linked to assignment`);
      }
    }

    console.log('CSE304 Data Structures Implementation assignment populated successfully!');

    // Verify the data
    const finalCheck = await pool.query(`
      SELECT
        a.title as assignment_title,
        cq.title as question_title,
        COUNT(cqt.id) as test_case_count
      FROM assignments a
      JOIN assignment_questions aq ON a.id = aq.assignment_id
      JOIN code_questions cq ON aq.question_id = cq.id
      LEFT JOIN code_question_testcases cqt ON cq.id = cqt.question_id
      WHERE a.id = $1
      GROUP BY a.title, cq.title, aq.position
      ORDER BY aq.position
    `, [assignmentId]);

    console.log('\nFinal verification:');
    finalCheck.rows.forEach(row => {
      console.log(`- ${row.question_title}: ${row.test_case_count} test cases`);
    });

  } catch (error) {
    console.error('Population failed:', error);
  } finally {
    await pool.end();
  }
}

populateCSE304DataStructures();
