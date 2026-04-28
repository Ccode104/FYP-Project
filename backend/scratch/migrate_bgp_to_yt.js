import 'dotenv/config';
import { pool } from '../db/index.js';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '../controllers/googleController.js';
import { Readable } from 'stream';

async function migrate() {
  const videoId = 1720;
  const userId = 128;
  const manualDriveId = '1s4SJjd86tYiuSJMLVqBI9OYZb1zU2U1j'; // Restoring the ID for the retry

  try {
    console.log('--- Retrying Migration for BGP Video (Post-Verification) ---');
    
    const auth = await getAuthenticatedClient(userId);
    const drive = google.drive({ version: 'v3', auth });
    const youtube = google.youtube({ version: 'v3', auth });

    // Get metadata from DB
    const videoRes = await pool.query('SELECT title, description FROM videos WHERE id = $1', [videoId]);
    const video = videoRes.rows[0];

    console.log(`Downloading video from Drive: ${manualDriveId}...`);

    const driveResponse = await drive.files.get(
      { fileId: manualDriveId, alt: 'media' },
      { responseType: 'stream' }
    );

    console.log('Uploading to YouTube...');

    const youtubeResponse = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: video.title,
          description: video.description || 'Migrated lecture video',
          categoryId: '27',
        },
        status: {
          privacyStatus: 'unlisted',
        },
      },
      media: {
        body: driveResponse.data,
      },
    });

    const newYoutubeId = youtubeResponse.data.id;
    const newVideoUrl = `https://www.youtube.com/watch?v=${newYoutubeId}`;

    console.log(`Successfully uploaded! New YouTube URL: ${newVideoUrl}`);

    await pool.query(
      `UPDATE videos 
       SET video_url = $1, 
           embed_url = $2, 
           drive_file_id = $3, 
           updated_at = NOW()
       WHERE id = $4`,
      [newVideoUrl, `https://www.youtube.com/embed/${newYoutubeId}`, manualDriveId, videoId]
    );

    console.log('--- Migration Complete! ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
