import { pool } from '../db/index.js';

export async function seedCourseQuizzes(offeringId, createdBy) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const quizzes = [
      {
        title: 'Introduction to Big O',
        description: 'Test your understanding of Big O notation and algorithmic complexity',
        start_at: '2024-09-12 10:30:00',
        end_at: '2024-09-12 11:30:00',
        duration_minutes: 60,
        max_score: 100,
        status: 'completed',
      },
      {
        title: 'Sorting Fundamentals',
        description: 'Test your understanding of sorting algorithms',
        start_at: '2024-08-28 14:00:00',
        end_at: '2024-08-28 15:00:00',
        duration_minutes: 60,
        max_score: 100,
        status: 'archived',
      },
      {
        title: 'Dynamic Programming Mid-Term',
        description: 'Mid-term exam on dynamic programming techniques',
        start_at: '2024-10-24 10:30:00',
        end_at: '2024-10-24 11:30:00',
        duration_minutes: 60,
        max_score: 100,
        status: 'scheduled',
      },
      {
        title: 'Graph Theory & BFS/DFS',
        description: 'Test on graph traversal algorithms',
        start_at: '2024-11-02 14:00:00',
        end_at: '2024-11-02 14:45:00',
        duration_minutes: 45,
        max_score: 100,
        status: 'scheduled',
      },
    ];

    for (const quiz of quizzes) {
      const result = await client.query(
        `INSERT INTO quizzes (course_offering_id, title, description, start_at, end_at, duration_minutes, max_score, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          offeringId,
          quiz.title,
          quiz.description,
          quiz.start_at,
          quiz.end_at,
          quiz.duration_minutes,
          quiz.max_score,
          quiz.status,
          createdBy,
        ]
      );
      console.log(`Created quiz: ${quiz.title} (ID: ${result.rows[0].id})`);
    }

    await client.query('COMMIT');
    console.log(`Seeded ${quizzes.length} quizzes for course offering ${offeringId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding quizzes:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const offeringId = process.argv[2] || 1;
  const createdBy = process.argv[3] || 1;
  seedCourseQuizzes(Number(offeringId), Number(createdBy))
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
