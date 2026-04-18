// Manual upload fix for BGP.mp4 - ES module compatible
import { pool } from './db/index.js';
import { processVideoTranscript } from './controllers/videosController.js';

async function createDummyVideo() {
  // Create dummy video record
  const insertQuery = `
    INSERT INTO videos (title, description, uploaded_by, video_url, embed_url, direct_video_url, duration, drive_file_id, upload_timestamp, course_offering_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
    RETURNING *;
  `;

  const result = await pool.query(insertQuery, [
    'BGP Manual',
    'Manual BGP video',
    128, // teacher id
    'https://drive.google.com/uc?id=DUMMY',
    'https://drive.google.com/file/d/DUMMY/preview',
    'https://drive.google.com/uc?id=DUMMY&export=video',
    1200, // 20 min
    '1AbCdEfGhIjKlMnOpQrStUvWxYz', // dummy
    302
  ]);

  const videoId = result.rows[0].id;
  console.log('Created dummy video ID:', videoId);

  // Trigger processing
  await processVideoTranscript(videoId);
  console.log('Triggered transcript processing');
}

createDummyVideo().catch(console.error);
  const insertQuery = `
    INSERT INTO videos (title, description, uploaded_by, video_url, embed_url, direct_video_url, duration, drive_file_id, upload_timestamp, course_offering_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
    RETURNING *;
  `;

  const result = await pool.query(insertQuery, [
    'BGP Manual',
    'Manual BGP video',
    128, // teacher id
    'https://drive.google.com/uc?id=DUMMY',
    'https://drive.google.com/file/d/DUMMY/preview',
    'https://drive.google.com/uc?id=DUMMY&export=video',
    1200, // 20 min
    '1AbCdEfGhIjKlMnOpQrStUvWxYz', // dummy
    302
  ]);

  const videoId = result.rows[0].id;
  console.log('Created dummy video ID:', videoId);

  // Trigger processing
  require('./controllers/videosController').processVideoTranscript(videoId);
  console.log('Triggered transcript processing');
}

fixUpload().catch(console.error);

