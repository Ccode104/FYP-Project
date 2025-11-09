# Video Upload Feature Setup Guide

This document explains how to set up the video upload feature with Cloudinary integration.

## Prerequisites

1. **Cloudinary Account**: Sign up at [https://cloudinary.com](https://cloudinary.com) to get your credentials
2. **PostgreSQL Database**: Ensure your Neon PostgreSQL database is accessible

## Environment Variables

Add the following environment variables to your `backend/.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# Existing environment variables (keep these)
DATABASE_URL=your_neon_postgresql_connection_string
JWT_SECRET=your_jwt_secret
PORT=4000
```

### How to Get Cloudinary Credentials

1. Sign up/login to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Go to Dashboard → Settings
3. Copy your:
   - **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

## Database Setup

Run the SQL migration to create the `videos` and `video_quiz_questions` tables:

```bash
cd backend
psql "$DATABASE_URL" -f prisma/videos_migration.sql
```

Or if you're using PowerShell on Windows:

```powershell
cd backend
$env:DATABASE_URL = "your_database_url"
psql $env:DATABASE_URL -f prisma/videos_migration.sql
```

## Features Implemented

### Backend

1. **Video Upload Route** (`/api/videos`)
   - POST `/api/videos` - Upload a video (Faculty only)
   - GET `/api/videos/my` - Get all videos uploaded by current faculty
   - GET `/api/videos/:id` - Get a single video by ID
   - DELETE `/api/videos/:id` - Delete a video (uploader or admin only)

2. **Video Quiz Questions Routes**
   - POST `/api/videos/:videoId/quiz-questions` - Add a quiz question to a video
   - GET `/api/videos/:videoId/quiz-questions` - Get all quiz questions for a video
   - PUT `/api/videos/:videoId/quiz-questions/:questionId` - Update a quiz question
   - DELETE `/api/videos/:videoId/quiz-questions/:questionId` - Delete a quiz question

3. **Cloudinary Integration**
   - Videos are automatically uploaded to Cloudinary under the `lms_videos` folder
   - Video duration is extracted from Cloudinary metadata when available
   - Maximum file size: 500MB
   - Supported formats: MP4, WebM, MOV, AVI, MKV

### Frontend

1. **VideoUpload Component** (`src/components/VideoUpload.tsx`)
   - Drag-and-drop file upload
   - File input fallback
   - Real-time upload progress bar (0-100%)
   - Video preview after successful upload
   - Success message with video details
   - Form validation

2. **Integration**
   - Integrated into Teacher Dashboard
   - Accessible via "📹 Upload Video Lecture" button
   - Opens in a modal dialog

## Usage

### For Faculty Users

1. Log in as a faculty user
2. Navigate to the Teacher Dashboard
3. Click the "📹 Upload Video Lecture" button
4. Drag and drop a video file or click to browse
5. Enter the video title (required) and description (optional)
6. Click "Upload Video"
7. Wait for the upload to complete (progress bar will show 0-100%)
8. Once uploaded, you'll see a success message and video preview

### API Usage Examples

#### Upload a Video

```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('title', 'Introduction to React');
formData.append('description', 'Learn the basics of React');

const response = await fetch('/api/videos', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

#### Add a Quiz Question to a Video

```javascript
const response = await fetch(`/api/videos/${videoId}/quiz-questions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    question_text: 'What is React?',
    question_type: 'mcq',
    options: ['A library', 'A framework', 'A language', 'A tool'],
    correct_answer: 'A library',
    points: 1.0,
    explanation: 'React is a JavaScript library for building user interfaces.'
  })
});
```

## Database Schema

### videos Table

- `id` - Primary key (BIGSERIAL)
- `title` - Video title (TEXT, NOT NULL)
- `description` - Video description (TEXT)
- `uploaded_by` - Faculty user ID (BIGINT, references users.id)
- `video_url` - Cloudinary secure URL (TEXT, NOT NULL)
- `duration` - Video duration in seconds (NUMERIC(10,2))
- `cloudinary_public_id` - Cloudinary public ID for management (TEXT)
- `upload_timestamp` - Upload timestamp (TIMESTAMPTZ)
- `created_at` - Creation timestamp (TIMESTAMPTZ)
- `updated_at` - Last update timestamp (TIMESTAMPTZ)

### video_quiz_questions Table

- `id` - Primary key (BIGSERIAL)
- `video_id` - Reference to videos.id (BIGINT, NOT NULL)
- `question_text` - Question text (TEXT, NOT NULL)
- `question_type` - Type of question: 'mcq', 'true_false', 'short_answer' (TEXT, default: 'mcq')
- `options` - JSON array of options for MCQ (JSONB)
- `correct_answer` - Correct answer (TEXT, NOT NULL)
- `points` - Points for this question (NUMERIC(6,2), default: 1.0)
- `explanation` - Explanation shown after answering (TEXT)
- `created_at` - Creation timestamp (TIMESTAMPTZ)
- `updated_at` - Last update timestamp (TIMESTAMPTZ)

## Error Handling

The implementation includes comprehensive error handling for:

- Invalid file types (only videos allowed)
- File size limits (500MB max)
- Missing required fields (title)
- Cloudinary upload errors
- Database errors
- Authentication/authorization errors
- Network errors

## Notes

- Videos are stored in Cloudinary's `lms_videos` folder
- Video duration extraction may not be immediately available for all video formats
- The upload progress is tracked client-side using axios interceptors
- All routes require authentication
- Video upload and quiz question management require faculty or admin role

## Troubleshooting

### Upload Fails

1. Check Cloudinary credentials in `.env`
2. Verify file size is under 500MB
3. Ensure file is a valid video format
4. Check network connection
5. Verify user has faculty/admin role

### Database Errors

1. Ensure migration has been run
2. Check DATABASE_URL is correct
3. Verify database connection
4. Check user has proper permissions

### Cloudinary Errors

1. Verify Cloudinary credentials
2. Check Cloudinary account limits
3. Ensure video format is supported
4. Check Cloudinary dashboard for errors

