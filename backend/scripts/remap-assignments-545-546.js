import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
dotenv.config({ path: envPath });

const { pool } = await import('../db/index.js');

const githubAssignment = {
  title: 'Lab 2: OOP Repository Project',
  description: 'Design a small object-oriented project and include a short reflection note.',
  assignment_type: 'github',
  assignment_config: {
    assignment_type: 'component',
    components: [
      {
        id: 'repo',
        type: 'repository',
        title: 'GitHub repository',
        points: 80,
      },
      {
        id: 'reflection',
        type: 'document',
        title: 'Reflection note',
        points: 20,
      },
    ],
  },
  submission_requirements: [
    {
      required: true,
      component_id: 'repo',
      submission_type: 'url',
      accepted_formats: ['url'],
    },
    {
      required: true,
      component_id: 'reflection',
      submission_type: 'file_upload',
      accepted_formats: ['.pdf', '.md'],
    },
  ],
  grading_config: {
    grading_type: 'component',
    allow_partial_credit: true,
  },
  total_points: 100,
  allow_github_repo: true,
};

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const assignmentsResult = await client.query(
      `SELECT id, title, description, assignment_type, assignment_config, submission_requirements,
              grading_config, total_points, allow_github_repo
       FROM assignments
       WHERE id IN (545, 546)
       ORDER BY id
       FOR UPDATE`
    );

    if (assignmentsResult.rowCount !== 2) {
      throw new Error('Expected assignments 545 and 546 to exist');
    }

    const assignment545 = assignmentsResult.rows.find(row => Number(row.id) === 545);
    const assignment546 = assignmentsResult.rows.find(row => Number(row.id) === 546);

    if (!assignment545 || !assignment546) {
      throw new Error('Could not load both assignments');
    }

    const dsaPayload = {
      title: assignment545.title,
      description: assignment545.description,
      assignment_type: assignment545.assignment_type,
      assignment_config: assignment545.assignment_config,
      submission_requirements: assignment545.submission_requirements,
      grading_config: assignment545.grading_config,
      total_points: assignment545.total_points,
      allow_github_repo: assignment545.allow_github_repo,
    };

    await client.query('DELETE FROM assignment_questions WHERE assignment_id = $1', [546]);

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
        dsaPayload.title,
        dsaPayload.description,
        dsaPayload.assignment_type,
        JSON.stringify(dsaPayload.assignment_config),
        JSON.stringify(dsaPayload.submission_requirements),
        JSON.stringify(dsaPayload.grading_config),
        dsaPayload.total_points,
        dsaPayload.allow_github_repo,
        546,
      ]
    );

    await client.query('UPDATE assignment_questions SET assignment_id = $1 WHERE assignment_id = $2', [
      546,
      545,
    ]);

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
        githubAssignment.title,
        githubAssignment.description,
        githubAssignment.assignment_type,
        JSON.stringify(githubAssignment.assignment_config),
        JSON.stringify(githubAssignment.submission_requirements),
        JSON.stringify(githubAssignment.grading_config),
        githubAssignment.total_points,
        githubAssignment.allow_github_repo,
        545,
      ]
    );

    await client.query('COMMIT');

    console.log(
      JSON.stringify(
        {
          assignment_545: githubAssignment.title,
          assignment_546: dsaPayload.title,
          moved_assignment_questions_from_545_to_546: true,
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
