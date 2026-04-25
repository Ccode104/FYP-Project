import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const ASSIGNMENT_ID = 545;
const QUESTION_TITLE = 'Lab 2: Valid Parentheses Using Stack';

const questionDescription =
  'Given a string containing only parentheses characters (), [], and {}, determine whether the input is balanced. Use a stack-based approach.';

const questionConstraints =
  '1 <= length(s) <= 100000. Input contains only the characters (, ), [, ], {, }. Aim for O(n) time and O(n) auxiliary space using a stack.';

const templateCode = {
  python: `def is_valid_parentheses(s: str) -> bool:
    # Write your stack-based solution here
    pass


if __name__ == "__main__":
    s = input().strip()
    print("true" if is_valid_parentheses(s) else "false")
`,
};

const driverCode = {
  python: `import sys

if __name__ == "__main__":
    data = sys.stdin.read().strip()
    print("true" if is_valid_parentheses(data) else "false")
`,
};

const testCases = [
  { is_sample: true, input_text: '()[]{}', expected_text: 'true' },
  { is_sample: true, input_text: '([)]', expected_text: 'false' },
  { is_sample: false, input_text: '{[()()]}', expected_text: 'true' },
  { is_sample: false, input_text: '(((()', expected_text: 'false' },
];

const assignmentConfig = {
  assignment_type: 'code_questions',
  questions: [
    {
      question_id: 'valid_parentheses_stack',
      title: QUESTION_TITLE,
      description: questionDescription,
      points: 100,
      time_limit: 1200,
    },
  ],
  settings: {
    allow_group_work: false,
    peer_review_required: false,
    auto_grading_enabled: true,
    plagiarism_check: true,
    code_execution_required: true,
    supported_languages: ['python'],
    template_code_required: true,
    driver_code_required: true,
  },
};

const submissionRequirements = [
  {
    component_id: 'code_questions',
    submission_type: 'code_questions',
    accepted_formats: ['.py'],
    max_file_size_mb: 2,
    required: true,
    description: 'Submit a Python solution for the DSA coding problem.',
  },
];

const gradingConfig = {
  grading_type: 'code_execution',
  use_rubric: false,
  allow_partial_credit: true,
  grade_visibility: 'after_due_date',
  auto_grading_weight: 1,
  manual_review_weight: 0,
  test_case_coverage_required: true,
};

async function run() {
  const envPath = fileURLToPath(new URL('../.env', import.meta.url));
  dotenv.config({ path: envPath });
  const { pool } = await import('../db/index.js');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const assignmentResult = await client.query(
      'SELECT id, created_by, title FROM assignments WHERE id = $1 FOR UPDATE',
      [ASSIGNMENT_ID]
    );

    if (assignmentResult.rowCount === 0) {
      throw new Error(`Assignment ${ASSIGNMENT_ID} not found`);
    }

    const assignment = assignmentResult.rows[0];
    const createdBy = assignment.created_by || null;

    let questionId;
    const existingQuestion = await client.query(
      'SELECT id FROM code_questions WHERE title = $1 ORDER BY id DESC LIMIT 1',
      [QUESTION_TITLE]
    );

    if (existingQuestion.rowCount > 0) {
      questionId = existingQuestion.rows[0].id;
      await client.query(
        `UPDATE code_questions
         SET description = $1,
             constraints = $2,
             template_code = $3,
             driver_code = $4,
             difficulty = $5,
             time_limit_seconds = $6,
             max_points = $7
         WHERE id = $8`,
        [
          questionDescription,
          questionConstraints,
          JSON.stringify(templateCode),
          JSON.stringify(driverCode),
          'medium',
          1200,
          100,
          questionId,
        ]
      );

      await client.query('DELETE FROM code_question_testcases WHERE question_id = $1', [questionId]);
    } else {
      const insertQuestion = await client.query(
        `INSERT INTO code_questions
          (title, description, constraints, template_code, driver_code, created_by, difficulty, time_limit_seconds, max_points)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          QUESTION_TITLE,
          questionDescription,
          questionConstraints,
          JSON.stringify(templateCode),
          JSON.stringify(driverCode),
          createdBy,
          'medium',
          1200,
          100,
        ]
      );

      questionId = insertQuestion.rows[0].id;
    }

    for (const testCase of testCases) {
      await client.query(
        `INSERT INTO code_question_testcases (question_id, is_sample, input_text, expected_text)
         VALUES ($1, $2, $3, $4)`,
        [questionId, testCase.is_sample, testCase.input_text, testCase.expected_text]
      );
    }

    await client.query('DELETE FROM assignment_questions WHERE assignment_id = $1', [ASSIGNMENT_ID]);

    await client.query(
      `UPDATE assignments
       SET title = $1,
           description = $2,
           assignment_type = $3,
           assignment_config = $4,
           submission_requirements = $5,
           grading_config = $6,
           total_points = $7,
           allow_github_repo = $8
       WHERE id = $9`,
      [
        QUESTION_TITLE,
        'Solve a classic DSA problem using a stack. Determine whether the given parentheses string is balanced and submit your code for automatic evaluation.',
        'code',
        JSON.stringify(assignmentConfig),
        JSON.stringify(submissionRequirements),
        JSON.stringify(gradingConfig),
        100,
        false,
        ASSIGNMENT_ID,
      ]
    );

    await client.query(
      `INSERT INTO assignment_questions (assignment_id, question_id, points, position)
       VALUES ($1, $2, $3, $4)`,
      [ASSIGNMENT_ID, questionId, 100, 1]
    );

    await client.query('COMMIT');

    console.log(
      JSON.stringify(
        {
          updated_assignment_id: ASSIGNMENT_ID,
          linked_question_id: questionId,
          title: QUESTION_TITLE,
          test_case_count: testCases.length,
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error.stack || error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
