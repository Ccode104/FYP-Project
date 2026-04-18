const { pool } = require('./db/index.js');
const { processVideoTranscript } = require('./controllers/videosController.js');

async function createDummyVideo() {
  // Create dummy video record
  const insertQuery = `
    INSERT INTO videos (title, description, uploaded_by, video_url, embed_url, direct_video_url, duration, drive_file_id, upload_timestamp, course_offering_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
    RETURNING *;
  `;

  const result = await pool.query(insertQuery, [
    'BGP Lecture',
    'Networking lecture on BGP protocol',
    128, // teacher id
    'https://drive.google.com/uc?id=DUMMY_BGP',
    'https://drive.google.com/file/d/DUMMY_BGP/preview',
    'https://drive.google.com/uc?id=DUMMY_BGP&export=video',
    1800, // 30 min
    '1aB2cD3eF4gH5iJ6kL7mN8oP', // dummy Drive ID
    302
  ]);

  const videoId = result.rows[0].id;
  console.log('✅ Created test video ID:', videoId);

  // Trigger processing
  await processVideoTranscript(videoId);
  console.log('✅ Transcript & sections generated');
  console.log('🌐 Test in browser: http://localhost:5173/videos/' + videoId);
}

createDummyVideo().catch(console.error);
