import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

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
