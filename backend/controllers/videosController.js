import { pool } from '../db/index.js';
import { cloudinary } from '../middleware/upload.js';
import { logger } from '../utils/logger.js';

/**
 * Upload a video lecture to Cloudinary and store metadata in database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function uploadVideo(req, res) {
  try {
    console.log('Upload controller called, req.file:', req.file ? 'exists' : 'missing');
    console.log('req.body:', req.body);
    
    // Check if file was uploaded
    if (!req.file) {
      console.error('No file in req.file');
      return res.status(400).json({ error: "No video file provided" });
    }

    // Log the file structure to understand what multer-storage-cloudinary returns
    console.log('File object keys:', Object.keys(req.file));
    console.log('File object:', JSON.stringify(req.file, null, 2));

    // Extract form data
    const { title, description, course_offering_id } = req.body;
    const uploadedBy = req.user.id;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!course_offering_id) {
      return res.status(400).json({ error: "course_offering_id is required" });
    }

    const courseOfferingId = parseInt(course_offering_id);
    if (isNaN(courseOfferingId)) {
      return res.status(400).json({ error: "Invalid course_offering_id" });
    }

    // Get Cloudinary upload result from multer-storage-cloudinary
    // The file is already uploaded to Cloudinary by the middleware
    const cloudinaryResult = req.file;

    // multer-storage-cloudinary / cloudinary-uploader may return URL under different keys
    // common keys: secure_url, url, path, location
    let videoUrl = null;
    let publicId = null;
    if (cloudinaryResult) {
      videoUrl = cloudinaryResult.secure_url || cloudinaryResult.url || cloudinaryResult.path || cloudinaryResult.location || (cloudinaryResult.file && cloudinaryResult.file.url) || null;
      publicId = cloudinaryResult.public_id || cloudinaryResult.publicId || cloudinaryResult.filename || cloudinaryResult.public_id || null;
    }

    if (!videoUrl || !publicId) {
      // Log full object to help debug storage adapter's output
      logger.error('Unexpected Cloudinary upload result format', {
        keys: cloudinaryResult ? Object.keys(cloudinaryResult) : null,
        sample: cloudinaryResult ? JSON.stringify(cloudinaryResult).slice(0, 2000) : null,
      });

      // Try to gracefully recover: if publicId exists but url missing, attempt to fetch resource
      if (!videoUrl && publicId) {
        try {
          const videoResource = await cloudinary.api.resource(publicId, { resource_type: 'video' });
          videoUrl = videoResource.secure_url || videoResource.url || videoResource.path || null;
        } catch (fetchErr) {
          logger.warn('Could not fetch Cloudinary resource for publicId to extract URL', fetchErr.message || fetchErr);
        }
      }

      if (!videoUrl) {
        return res.status(500).json({ 
            error: 'Failed to get video URL from Cloudinary',
            details: 'The file was uploaded but no URL was returned; check Cloudinary storage adapter or credentials',
          cloudinary_result_keys: cloudinaryResult ? Object.keys(cloudinaryResult) : null,
        });
      }

      if (!publicId) {
        return res.status(500).json({ 
          error: 'Failed to get video public ID from Cloudinary',
          details: 'Cloudinary did not return a public ID for the uploaded resource',
          cloudinary_result_keys: cloudinaryResult ? Object.keys(cloudinaryResult) : null,
        });
      }
    }

    // Try to get video duration from Cloudinary metadata
    // Note: Duration might not be immediately available, so we'll try to fetch it
    let duration = null;
    try {
      // Fetch video resource details from Cloudinary to get duration
      const videoResource = await cloudinary.api.resource(publicId, {
        resource_type: "video",
      });
      duration = videoResource.duration || null; // Duration in seconds
    } catch (err) {
      // If duration extraction fails, log but don't fail the upload
      logger.warn("Could not extract video duration:", err.message);
      duration = null;
    }

    const insertQuery = `
      INSERT INTO videos (title, description, uploaded_by, video_url, duration, cloudinary_public_id, upload_timestamp, course_offering_id)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [
      title,
      description || null,
      uploadedBy,
      videoUrl,
      duration,
      publicId,
      courseOfferingId,
    ]);

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      video: result.rows[0],
    });
  } catch (error) {
    logger.error("Error uploading video:", error);
    console.error("Error uploading video - full error:", error);
    console.error("Error stack:", error.stack);

    // Handle specific error types
    if (error.message && error.message.includes("foreign key constraint")) {
      return res
        .status(400)
        .json({ error: "Invalid user ID or course_offering_id" });
    }

    // Ensure we always return JSON, not HTML
    const errorMessage = error.message || "Failed to upload video";
    res
      .status(500)
      .json({ 
        error: "Failed to upload video", 
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
  }
}


/**
 * Get all videos uploaded by the current faculty user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getMyVideos(req, res) {
  try {
    const uploadedBy = req.user.id;

    const query = `
      SELECT 
        v.id,
        v.title,
        v.description,
        v.video_url,
        v.duration,
        v.upload_timestamp,
        v.created_at,
        v.course_offering_id,
        u.name as uploaded_by_name,
        u.email as uploaded_by_email
      FROM videos v
      JOIN users u ON v.uploaded_by = u.id
      WHERE v.uploaded_by = $1
      ORDER BY v.upload_timestamp DESC
    `;

    const result = await pool.query(query, [uploadedBy]);
    res.json({ videos: result.rows });
  } catch (error) {
    logger.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos', message: error.message });
  }
}

/**
 * Get all videos for a course offering (accessible by enrolled students and faculty)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getVideosByCourseOffering(req, res) {
  try {
    const courseOfferingId = parseInt(req.params.courseOfferingId);

    if (isNaN(courseOfferingId)) {
      return res.status(400).json({ error: 'Invalid course offering ID' });
    }

    // Verify user is enrolled in the course or is faculty/admin
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user has access to this course offering
    let hasAccess = false;
    
    if (userRole === 'faculty' || userRole === 'admin' || userRole === 'ta') {
      // Faculty/Admin/TA can access any course offering
      hasAccess = true;
    } else {
      // Students must be enrolled
      const enrollmentCheck = await pool.query(
        'SELECT id FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
        [courseOfferingId, userId]
      );
      hasAccess = enrollmentCheck.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this course offering' });
    }

    // Get all videos for this course offering
    const query = `
      SELECT 
        v.id,
        v.title,
        v.description,
        v.video_url,
        v.duration,
        v.upload_timestamp,
        v.created_at,
        v.course_offering_id,
        u.name as uploaded_by_name,
        u.email as uploaded_by_email
      FROM videos v
      JOIN users u ON v.uploaded_by = u.id
      WHERE v.course_offering_id = $1
      ORDER BY v.upload_timestamp DESC
    `;

    const result = await pool.query(query, [courseOfferingId]);
    res.json({ videos: result.rows });
  } catch (error) {
    logger.error('Error fetching videos by course offering:', error);
    res.status(500).json({ error: 'Failed to fetch videos', message: error.message });
  }
}

/**
 * Get a single video by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getVideoById(req, res) {
  try {
    const videoId = parseInt(req.params.id);

    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const query = `
      SELECT 
        v.id,
        v.title,
        v.description,
        v.video_url,
        v.duration,
        v.upload_timestamp,
        v.created_at,
        v.course_offering_id,
        u.name as uploaded_by_name,
        u.email as uploaded_by_email
      FROM videos v
      JOIN users u ON v.uploaded_by = u.id
      WHERE v.id = $1
    `;

    const result = await pool.query(query, [videoId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ video: result.rows[0] });
  } catch (error) {
    logger.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video', message: error.message });
  }
}

/**
 * Delete a video (only by the uploader or admin)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function deleteVideo(req, res) {
  try {
    const videoId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    // First, get the video to check ownership and get Cloudinary public_id
    const getVideoQuery = 'SELECT * FROM videos WHERE id = $1';
    const videoResult = await pool.query(getVideoQuery, [videoId]);

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videoResult.rows[0];

    // Check if user has permission to delete (uploader or admin)
    if (video.uploaded_by !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this video' });
    }

    // Delete from Cloudinary
    if (video.cloudinary_public_id) {
      try {
        await cloudinary.uploader.destroy(video.cloudinary_public_id, {
          resource_type: 'video',
        });
      } catch (cloudinaryError) {
        logger.warn('Error deleting video from Cloudinary:', cloudinaryError.message);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete from database (CASCADE will delete associated quiz questions)
    const deleteQuery = 'DELETE FROM videos WHERE id = $1 RETURNING *';
    const deleteResult = await pool.query(deleteQuery, [videoId]);

    res.json({
      success: true,
      message: 'Video deleted successfully',
      video: deleteResult.rows[0],
    });
  } catch (error) {
    logger.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video', message: error.message });
  }
}

/**
 * Add a quiz question to a video
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function addVideoQuizQuestion(req, res) {
  try {
    const videoId = parseInt(req.params.videoId);
    const { question_text, question_type, options, correct_answer, points, explanation, timestamp } = req.body;

    // Validate required fields
    if (!question_text || !correct_answer) {
      return res.status(400).json({ error: 'question_text and correct_answer are required' });
    }

    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    // Validate timestamp if provided (should be >= 0 and less than video duration)
    if (timestamp !== undefined && timestamp !== null) {
      const timestampNum = parseFloat(timestamp);
      if (isNaN(timestampNum) || timestampNum < 0) {
        return res.status(400).json({ error: 'Timestamp must be a non-negative number' });
      }
    }

    // Verify video exists
    const videoCheck = await pool.query('SELECT id, duration FROM videos WHERE id = $1', [videoId]);
    if (videoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // If timestamp provided, validate it's within video duration
    if (timestamp !== undefined && timestamp !== null) {
      const videoDuration = videoCheck.rows[0].duration;
      if (videoDuration && parseFloat(timestamp) > videoDuration) {
        return res.status(400).json({ error: 'Timestamp cannot exceed video duration' });
      }
    }

    // Insert quiz question
    const insertQuery = `
      INSERT INTO video_quiz_questions (
        video_id, question_text, question_type, options, correct_answer, points, explanation, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      videoId,
      question_text,
      question_type || 'mcq',
      options ? JSON.stringify(options) : null,
      correct_answer,
      points || 1.0,
      explanation || null,
      timestamp !== undefined && timestamp !== null ? parseFloat(timestamp) : null,
    ]);

    res.status(201).json({
      success: true,
      message: 'Quiz question added successfully',
      question: result.rows[0],
    });
  } catch (error) {
    logger.error('Error adding quiz question:', error);
    res.status(500).json({ error: 'Failed to add quiz question', message: error.message });
  }
}

/**
 * Get all quiz questions for a video
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getVideoQuizQuestions(req, res) {
  try {
    const videoId = parseInt(req.params.videoId);

    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const query = `
      SELECT * FROM video_quiz_questions
      WHERE video_id = $1
      ORDER BY COALESCE(timestamp, 0) ASC, created_at ASC
    `;

    const result = await pool.query(query, [videoId]);
    res.json({ questions: result.rows });
  } catch (error) {
    logger.error('Error fetching quiz questions:', error);
    res.status(500).json({ error: 'Failed to fetch quiz questions', message: error.message });
  }
}

/**
 * Update a quiz question
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function updateVideoQuizQuestion(req, res) {
  try {
    const questionId = parseInt(req.params.questionId);
    const { question_text, question_type, options, correct_answer, points, explanation } = req.body;

    if (isNaN(questionId)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (question_text !== undefined) {
      updates.push(`question_text = $${paramIndex++}`);
      values.push(question_text);
    }
    if (question_type !== undefined) {
      updates.push(`question_type = $${paramIndex++}`);
      values.push(question_type);
    }
    if (options !== undefined) {
      updates.push(`options = $${paramIndex++}`);
      values.push(JSON.stringify(options));
    }
    if (correct_answer !== undefined) {
      updates.push(`correct_answer = $${paramIndex++}`);
      values.push(correct_answer);
    }
    if (points !== undefined) {
      updates.push(`points = $${paramIndex++}`);
      values.push(points);
    }
    if (explanation !== undefined) {
      updates.push(`explanation = $${paramIndex++}`);
      values.push(explanation);
    }
    if (timestamp !== undefined) {
      updates.push(`timestamp = $${paramIndex++}`);
      values.push(timestamp !== null ? parseFloat(timestamp) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(questionId);

    const updateQuery = `
      UPDATE video_quiz_questions
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({
      success: true,
      message: 'Question updated successfully',
      question: result.rows[0],
    });
  } catch (error) {
    logger.error('Error updating quiz question:', error);
    res.status(500).json({ error: 'Failed to update quiz question', message: error.message });
  }
}

/**
 * Delete a quiz question
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function deleteVideoQuizQuestion(req, res) {
  try {
    const questionId = parseInt(req.params.questionId);

    if (isNaN(questionId)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    const deleteQuery = 'DELETE FROM video_quiz_questions WHERE id = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [questionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({
      success: true,
      message: 'Question deleted successfully',
      question: result.rows[0],
    });
  } catch (error) {
    logger.error('Error deleting quiz question:', error);
    res.status(500).json({ error: 'Failed to delete quiz question', message: error.message });
  }
}

/**
 * Start or get a video quiz attempt
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function startVideoQuizAttempt(req, res) {
  try {
    const videoId = parseInt(req.params.videoId);
    const studentId = req.user.id;

    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    // Check if attempt already exists
    const existingAttempt = await pool.query(
      'SELECT * FROM video_quiz_attempts WHERE video_id = $1 AND student_id = $2',
      [videoId, studentId]
    );

    if (existingAttempt.rows.length > 0) {
      // Return existing attempt
      return res.json({ attempt: existingAttempt.rows[0] });
    }

    // Get video to calculate max score
    const videoResult = await pool.query('SELECT id FROM videos WHERE id = $1', [videoId]);
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Get all questions for this video to calculate max score
    const questionsResult = await pool.query(
      'SELECT SUM(points) as total_points FROM video_quiz_questions WHERE video_id = $1',
      [videoId]
    );
    const maxScore = parseFloat(questionsResult.rows[0]?.total_points || 0);

    // Create new attempt
    const insertQuery = `
      INSERT INTO video_quiz_attempts (video_id, student_id, started_at, max_score, answers)
      VALUES ($1, $2, NOW(), $3, '{}'::jsonb)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [videoId, studentId, maxScore]);
    res.status(201).json({ attempt: result.rows[0] });
  } catch (error) {
    logger.error('Error starting video quiz attempt:', error);
    res.status(500).json({ error: 'Failed to start attempt', message: error.message });
  }
}

/**
 * Submit an answer to a video quiz question
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function submitVideoQuizAnswer(req, res) {
  try {
    const videoId = parseInt(req.params.videoId);
    const studentId = req.user.id;
    const { question_id, answer } = req.body;

    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    if (!question_id || answer === undefined || answer === null) {
      return res.status(400).json({ error: 'question_id and answer are required' });
    }

    // Get the question to check correct answer
    const questionResult = await pool.query(
      'SELECT * FROM video_quiz_questions WHERE id = $1 AND video_id = $2',
      [question_id, videoId]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const question = questionResult.rows[0];
    const correctAnswer = question.correct_answer;
    const points = parseFloat(question.points || 1.0);

    // Check if answer is correct
    let isCorrect = false;
    if (question.question_type === 'mcq') {
      // For MCQ, compare numeric indices
      const answerNum = Number(answer);
      const correctNum = Number(correctAnswer);
      isCorrect = !isNaN(answerNum) && !isNaN(correctNum) && answerNum === correctNum;
    } else if (question.question_type === 'true_false') {
      // For true/false, compare boolean values
      const answerBool = answer === true || answer === 'true' || answer === 1;
      const correctBool = correctAnswer === true || correctAnswer === 'true' || correctAnswer === 1;
      isCorrect = answerBool === correctBool;
    } else if (question.question_type === 'short_answer') {
      // For short answer, do case-insensitive string comparison
      isCorrect = String(answer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
    }

    const pointsEarned = isCorrect ? points : 0;

    // Get or create attempt
    let attemptResult = await pool.query(
      'SELECT * FROM video_quiz_attempts WHERE video_id = $1 AND student_id = $2',
      [videoId, studentId]
    );

    let attempt;
    if (attemptResult.rows.length === 0) {
      // Create new attempt
      const questionsResult = await pool.query(
        'SELECT SUM(points) as total_points FROM video_quiz_questions WHERE video_id = $1',
        [videoId]
      );
      const maxScore = parseFloat(questionsResult.rows[0]?.total_points || 0);

      const createResult = await pool.query(
        `INSERT INTO video_quiz_attempts (video_id, student_id, started_at, max_score, answers)
         VALUES ($1, $2, NOW(), $3, '{}'::jsonb)
         RETURNING *`,
        [videoId, studentId, maxScore]
      );
      attempt = createResult.rows[0];
    } else {
      attempt = attemptResult.rows[0];
    }

    // Update answers JSONB - store all relevant information
    const currentAnswers = attempt.answers || {};
    currentAnswers[question_id] = {
      answer: answer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      explanation: question.explanation || null,
      answered_at: new Date().toISOString(),
    };

    // Calculate new score
    let totalScore = 0;
    for (const qid of Object.keys(currentAnswers)) {
      if (currentAnswers[qid] && currentAnswers[qid].points_earned) {
        totalScore += parseFloat(currentAnswers[qid].points_earned);
      }
    }

    // Update attempt
    const updateResult = await pool.query(
      `UPDATE video_quiz_attempts 
       SET answers = $1, score = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [JSON.stringify(currentAnswers), totalScore, attempt.id]
    );

    res.json({
      success: true,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      explanation: question.explanation || null,
      attempt: updateResult.rows[0],
    });
  } catch (error) {
    logger.error('Error submitting video quiz answer:', error);
    res.status(500).json({ error: 'Failed to submit answer', message: error.message });
  }
}

/**
 * Complete a video quiz attempt
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function completeVideoQuizAttempt(req, res) {
  try {
    const videoId = parseInt(req.params.videoId);
    const studentId = req.user.id;

    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    // Get attempt
    const attemptResult = await pool.query(
      'SELECT * FROM video_quiz_attempts WHERE video_id = $1 AND student_id = $2',
      [videoId, studentId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const attempt = attemptResult.rows[0];

    // Mark as completed
    const updateResult = await pool.query(
      `UPDATE video_quiz_attempts 
       SET completed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [attempt.id]
    );

    res.json({
      success: true,
      message: 'Video quiz completed',
      attempt: updateResult.rows[0],
      score: updateResult.rows[0].score,
      max_score: updateResult.rows[0].max_score,
      percentage: updateResult.rows[0].max_score > 0
        ? Math.round((updateResult.rows[0].score / updateResult.rows[0].max_score) * 100)
        : 0,
    });
  } catch (error) {
    logger.error('Error completing video quiz attempt:', error);
    res.status(500).json({ error: 'Failed to complete attempt', message: error.message });
  }
}

/**
 * Get video quiz attempt for current student
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getVideoQuizAttempt(req, res) {
  try {
    const videoId = parseInt(req.params.videoId);
    const studentId = req.user.id;

    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const attemptResult = await pool.query(
      'SELECT * FROM video_quiz_attempts WHERE video_id = $1 AND student_id = $2',
      [videoId, studentId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    res.json({ attempt: attemptResult.rows[0] });
  } catch (error) {
    logger.error('Error fetching video quiz attempt:', error);
    res.status(500).json({ error: 'Failed to fetch attempt', message: error.message });
  }
}

/**
 * Get all video quiz attempts for a video (Faculty only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getVideoQuizAttempts(req, res) {
  try {
    const videoId = parseInt(req.params.videoId);
    const userRole = req.user.role;

    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    // Only faculty/admin can view all attempts
    if (userRole !== 'faculty' && userRole !== 'admin' && userRole !== 'ta') {
      return res.status(403).json({ error: 'Forbidden: Only faculty can view all attempts' });
    }

    const attemptsResult = await pool.query(
      `SELECT 
        va.*,
        u.name AS student_name,
        u.email AS student_email,
        u.id AS student_id
      FROM video_quiz_attempts va
      JOIN users u ON va.student_id = u.id
      WHERE va.video_id = $1
      ORDER BY va.completed_at DESC NULLS LAST, va.started_at DESC`,
      [videoId]
    );

    const attempts = attemptsResult.rows.map(row => ({
      ...row,
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers
    }));

    res.json({ attempts });
  } catch (error) {
    logger.error('Error fetching video quiz attempts:', error);
    res.status(500).json({ error: 'Failed to fetch attempts', message: error.message });
  }
}

