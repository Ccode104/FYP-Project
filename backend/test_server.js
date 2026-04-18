// removed unused
const { pool } = require('./db/index.js');
const { processVideoTranscript } = require('./controllers/videosController.js');

async function test() {
  try {
    // Check DB connection
    await pool.query('SELECT 1');
    console.log('✅ DB connected');

    // Create test video
    const result = await pool.query(`
      INSERT INTO videos (title, description, uploaded_by, video_url, embed_url, direct_video_url, duration, drive_file_id, upload_timestamp, course_offering_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
      RETURNING id;
    `, [
      'Test BGP Lecture',
      'Test video with auto-transcript sections',
      128,
      'https://example.com/video.mp4',
      'https://drive.google.com/file/d/TEST/preview',
      'https://drive.google.com/uc?id=TEST&export=video',
      1800,
      'TEST_DRIVE_ID',
      302
    ]);

    const videoId = result.rows[0].id;
    console.log(`✅ Created test video ID: ${videoId}`);

    // Process transcript/sections
    await processVideoTranscript(videoId);
    console.log('✅ Transcript & sections created!');

    console.log('🌐 Frontend test: http://localhost:5173/videos/' + videoId);
    console.log('📊 API test: curl http://localhost:4000/api/videos/' + videoId + '/sections -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."');
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

test();
