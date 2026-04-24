import { pool } from './db/index.js';

pool
  .query(`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS description TEXT`)
  .then(() => {
    console.log('Migration successful');
    process.exit(0);
  })
  .catch(e => {
    console.error(e.message);
    process.exit(1);
  });
