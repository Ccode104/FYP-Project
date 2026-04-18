'use strict';

// Load environment variables first
require('dotenv').config({ path: __dirname + '/.env' });
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'MISSING');

(async () => {
  try {
    const { pool } = require('./db/index.js');

    // Test DB
    const test = await pool.query('SELECT 1 as test');
    console.log('✅ DB OK:', test.rows[0]);

    // Check videos table schema
    const columns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'videos' ORDER BY ordinal_position
    `);
    console.log('Videos columns:', columns.rows.map(r => r.column_name).join(', '));

    // Check if video_sections table exists
    const sectionsTable = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'video_sections'
    `);
    console.log('video_sections table:', sectionsTable.rows.length > 0 ? 'exists' : 'MISSING');

    // Check if video_transcripts table exists
    const transcriptsTable = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'video_transcripts'
    `);
    console.log(
      'video_transcripts table:',
      transcriptsTable.rows.length > 0 ? 'exists' : 'MISSING'
    );

    // List courses to get ID
    const courses = await pool.query('SELECT id FROM course_offerings LIMIT 1');
    const courseId = courses.rows[0]?.id;
    if (!courseId) throw new Error('No course_offering found');

    // Create video
    const videoRes = await pool.query(
      `
      INSERT INTO videos (title, description, uploaded_by, video_url, duration, course_offering_id)
      VALUES ('Test Video', 'Test for transcript sections', 128, 'test.mp4', 1200, $1)
      RETURNING id
    `,
      [courseId]
    );

    const videoId = videoRes.rows[0].id;
    console.log('✅ Video created:', videoId);

    console.log(`Test frontend: http://localhost:5173/videos/${videoId}`);
    console.log('Restart backend: npm run dev');
  } catch (e) {
    console.error('❌', e.message);
  }
})();
