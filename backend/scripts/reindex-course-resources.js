import 'dotenv/config';
import { pool } from '../db/index.js';
import { createRagTables, indexCourseResource } from '../controllers/chatbotController.js';

async function reindexAll() {
  await createRagTables();
  const resources = await pool.query(
    `SELECT id, course_offering_id, title, description, filename, resource_type
     FROM resources`,
  );

  for (const resource of resources.rows) {
    await indexCourseResource(resource);
  }

  console.log(`Reindexed ${resources.rows.length} course resources.`);
  await pool.end();
}

reindexAll().catch((err) => {
  console.error('Failed to reindex resources:', err);
  process.exit(1);
});

