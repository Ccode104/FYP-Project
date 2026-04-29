import * as dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

import('./backend/db/index.js').then(({ pool }) => {
  pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'discussion_messages'`)
    .then(res => {
      console.log(res.rows);
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
});
