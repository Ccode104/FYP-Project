import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { cloudinary } from '../middleware/upload.js';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION
});

export async function createSignedUpload(req, res) {
  const { filename, mimeType } = req.body;
  if (!filename || !mimeType) return res.status(400).json({ error: 'Missing' });
  const key = `${uuidv4()}_${filename}`;
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Expires: 60,
    ContentType: mimeType
  };
  const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
  res.json({ uploadUrl, key });
}

export async function createSignedDownload(req, res) {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'Missing key' });
  const params = { Bucket: process.env.S3_BUCKET, Key: String(key), Expires: 60 };
  const url = await s3.getSignedUrlPromise('getObject', params);
  res.json({ url });
}

export async function createCloudinarySignedUrl(req, res) {
  const { publicId, resourceType = 'raw' } = req.query;
  if (!publicId) return res.status(400).json({ error: 'Missing publicId' });

  try {
    // Generate signed URL for Cloudinary resource
    // For private resources, Cloudinary requires signed URLs
    const signedUrl = cloudinary.url(publicId, {
      resource_type: resourceType,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    });

    res.json({ url: signedUrl });
  } catch (error) {
    console.error('Error generating Cloudinary signed URL:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
}
