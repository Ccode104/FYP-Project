import 'dotenv/config';
import { pool } from '../db/index.js';

async function findVideo() {
  try {
    const query = `
      SELECT v.*, co.course_id, c.code as course_code
      FROM videos v
      JOIN course_offerings co ON v.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE v.title ILIKE '%BGP%'
    `;
    const res = await pool.query(query);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findVideo();
