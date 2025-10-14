import multer from 'multer';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.memoryStorage();
export const upload = multer({ storage });

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION
});

export async function uploadBufferToS3(buffer, filename, mime) {
  const key = `${uuidv4()}_${filename}`;
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mime
  };
  const result = await s3.upload(params).promise();
  return result.Location;
}
