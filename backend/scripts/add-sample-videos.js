import { pool } from '../db/index.js';

async function addVideos() {
  // Check existing videos
  const existing = await pool.query('SELECT id, title FROM videos');
  console.log('Existing videos:', existing.rows.length);
  console.log(existing.rows);

  // Insert additional sample videos with public test URLs (using Cloudinary demo videos)
  const videos = [
    {
      title: 'Introduction to Neural Networks',
      description: 'Understanding the basics of neural networks and deep learning fundamentals',
      duration: 2720,
    },
    {
      title: 'Backpropagation Explained',
      description: 'How gradients flow backwards through a neural network',
      duration: 1850,
    },
    {
      title: 'Convolutional Neural Networks',
      description: 'Introduction to CNNs and image processing',
      duration: 2100,
    },
    {
      title: 'Recurrent Neural Networks',
      description: 'Understanding RNNs and sequence modeling',
      duration: 1950,
    },
    {
      title: 'PyTorch Basics Tutorial',
      description: 'Getting started with PyTorch framework',
      duration: 2400,
    },
    {
      title: 'Optimization Algorithms',
      description: 'SGD, Adam, and other optimization techniques',
      duration: 1800,
    },
    {
      title: 'Transfer Learning',
      description: 'Using pre-trained models for your tasks',
      duration: 1650,
    },
    {
      title: 'GANs and Generative Models',
      description: 'Introduction to generative adversarial networks',
      duration: 2200,
    },
  ];

  // Using Cloudinary demo videos that are publicly accessible
  const videoUrls = [
    'https://res.cloudinary.com/demo/video/upload/v1688673948/samples/elephants.mp4',
    'https://res.cloudinary.com/demo/video/upload/v1688673948/samples/sea_turtle.mp4',
    'https://res.cloudinary.com/demo/video/upload/v1688673948/samples/waterfall.mp4',
    'https://res.cloudinary.com/demo/video/upload/v1688673948/samples/city.mp4',
    'https://res.cloudinary.com/demo/video/upload/v1688673948/samples/cloud.mp4',
    'https://res.cloudinary.com/demo/video/upload/v1688673948/samples/flower.mp4',
    'https://res.cloudinary.com/demo/video/upload/v1688673948/samples/fire.mp4',
    'https://res.cloudinary.com/demo/video/upload/v1688673948/samples/giraffe.mp4',
  ];

  // Use a valid faculty user ID (151 = faculty1@demo.com)
  const uploadedBy = 151;

  // Use course offering ID 301 (CS101)
  const courseOfferingId = 301;

  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    await pool.query(
      'INSERT INTO videos (title, description, uploaded_by, video_url, duration, course_offering_id, upload_timestamp, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
      [v.title, v.description, uploadedBy, videoUrls[i], v.duration, courseOfferingId]
    );
    console.log('Inserted:', v.title);
  }

  console.log('Done!');
  await pool.end();
}

addVideos().catch(console.error);
