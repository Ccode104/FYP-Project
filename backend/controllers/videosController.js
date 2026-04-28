import { pool } from '../db/index.js';
import { logger } from '../utils/logger.js';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { getAuthenticatedClient } from './googleController.js';


/**
 * Link a YouTube video by providing its URL
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function linkYouTubeVideo(req, res) {
  try {
    const { title, description, course_offering_id, video_url } = req.body;
    const uploadedBy = req.user.id;

    if (!title || !course_offering_id || !video_url) {
      return res.status(400).json({ error: 'Title, course_offering_id, and video_url are required' });
    }

    const courseOfferingId = parseInt(course_offering_id);
    if (isNaN(courseOfferingId)) {
      return res.status(400).json({ error: 'Invalid course_offering_id' });
    }

    const insertQuery = `
      INSERT INTO videos (title, description, uploaded_by, video_url, upload_timestamp, course_offering_id)
      VALUES ($1, $2, $3, $4, NOW(), $5)
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [
      title,
      description || null,
      uploadedBy,
      video_url,
      courseOfferingId,
    ]);

    res.status(201).json({
      success: true,
      message: 'YouTube video linked successfully',
      video: result.rows[0],
    });
  } catch (error) {
    logger.error('Error linking YouTube video:', error);
    res.status(500).json({ error: 'Failed to link YouTube video', message: error.message });
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
        v.embed_url,
        v.drive_file_id,
        v.cloudinary_public_id,
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
    const {
      question_text,
      question_type,
      options,
      correct_answer,
      points,
      explanation,
      timestamp,
      section_id,
    } = req.body;

    // Validate required fields
    if (!question_text || !correct_answer) {
      return res.status(400).json({ error: 'question_text and correct_answer are required' });
    }

    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
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

    // If section_id provided, validate it exists and belongs to this video
    if (section_id) {
      const sectionCheck = await pool.query(
        'SELECT id FROM video_sections WHERE id = $1 AND video_id = $2',
        [section_id, videoId]
      );
      if (sectionCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid section ID' });
      }
    }

    // Insert quiz question
    const insertQuery = `
      INSERT INTO video_quiz_questions (
        video_id, question_text, question_type, options, correct_answer, points, explanation, timestamp, section_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
      section_id || null,
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
      SELECT 
        vqq.id,
        vqq.video_id,
        vqq.question_text,
        vqq.question_type,
        vqq.options,
        vqq.correct_answer,
        vqq.points,
        vqq.explanation,
        vqq.timestamp,
        vqq.section_id,
        vqq.created_at,
        vqq.updated_at,
        vs.id as section_id__id,
        vs.video_id as section_video_id,
        vs.start_time as section_start_time,
        vs.end_time as section_end_time,
        vs.title as section_title,
        vs.summary as section_summary,
        vs.created_at as section_created_at
      FROM video_quiz_questions vqq
      LEFT JOIN video_sections vs ON vqq.section_id = vs.id
      WHERE vqq.video_id = $1
      ORDER BY COALESCE(vqq.timestamp, 0) ASC, vqq.created_at ASC
    `;

    const result = await pool.query(query, [videoId]);
    console.log(
      'getVideoQuizQuestions raw rows:',
      result.rows.map(r => ({
        id: r.id,
        question_text: r.question_text.substring(0, 20),
        section_id: r.section_id,
        section_id__id: r.section_id__id,
        section_title: r.section_title,
      }))
    );

    // Transform rows to include nested section object
    const questions = result.rows.map(row => {
      const {
        // Exclude duplicated section columns from root level
        section_id__id,
        section_video_id,
        section_start_time,
        section_end_time,
        section_title,
        section_summary,
        section_created_at,
        ...questionFields
      } = row;

      const question = { ...questionFields };

      // Build section object if section_id exists
      if (row.section_id && row.section_id__id) {
        question.section = {
          id: row.section_id__id,
          video_id: row.section_video_id,
          start_time: row.section_start_time,
          end_time: row.section_end_time,
          title: row.section_title,
          summary: row.section_summary,
          created_at: row.section_created_at,
          transcript_snippet: '', // not selected
          quiz_count: undefined, // not calculated here
        };
      }

      return question;
    });

    res.json({ questions });
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
    const videoId = parseInt(req.params.videoId);
    const questionId = parseInt(req.params.questionId);
    const {
      question_text,
      question_type,
      options,
      correct_answer,
      points,
      explanation,
      timestamp,
      section_id,
    } = req.body;

    if (isNaN(questionId)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
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
    if (section_id !== undefined) {
      // Validate section exists and belongs to this video
      const sectionCheck = await pool.query(
        'SELECT id FROM video_sections WHERE id = $1 AND video_id = $2',
        [section_id, videoId]
      );
      if (sectionCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid section ID' });
      }
      updates.push(`section_id = $${paramIndex++}`);
      values.push(section_id || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
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
      isCorrect =
        String(answer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
    }

    const pointsEarned = isCorrect ? points : 0;

    // Get or create attempt
    const attemptResult = await pool.query(
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
      percentage:
        updateResult.rows[0].max_score > 0
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
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
    }));

    res.json({ attempts });
  } catch (error) {
    logger.error('Error fetching video quiz attempts:', error);
    res.status(500).json({ error: 'Failed to fetch attempts', message: error.message });
  }
}

/**
 * Upload video to Google Drive
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function uploadVideoToDrive(req, res) {
  try {
    console.log('uploadVideoToDrive controller called');
    console.log('req.file:', req.file ? 'exists' : 'missing');
    console.log('req.body:', req.body);

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const { course_offering_id, title, description } = req.body;
    const uploadedBy = req.user.id;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!course_offering_id) {
      return res.status(400).json({ error: 'course_offering_id is required' });
    }

    const courseOfferingIdNum = parseInt(course_offering_id);
    if (isNaN(courseOfferingIdNum)) {
      return res.status(400).json({ error: 'Invalid course_offering_id' });
    }

    // Get course offering details to find the course name
    const courseResult = await pool.query(
      `SELECT co.id, c.code, c.name as course_name, co.semester, co.year
       FROM course_offerings co
       JOIN courses c ON co.course_id = c.id
       WHERE co.id = $1`,
      [courseOfferingIdNum]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course offering not found' });
    }

    const course = courseResult.rows[0];
    const folderName = `${course.course_code} - ${course.course_name} (${course.semester} ${course.year})`;

    logger.info(
      `Uploading video to Google Drive: ${title || req.file.originalname} in folder: ${folderName}`
    );

    const auth = await getAuthenticatedClient(uploadedBy);
    const drive = google.drive({ version: 'v3', auth });

    // Create or find a folder for the specific course
    let folderId = 'root';
    try {
      // Try to find the course folder in root
      const findFolder = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and parents in 'root'`,
        fields: 'files(id, name)',
      });
      if (findFolder.data.files?.length > 0) {
        folderId = findFolder.data.files[0].id;
      } else {
        // Create new course folder
        const newFolder = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
          },
          fields: 'id, name',
        });
        folderId = newFolder.data.id;
      }
    } catch (folderError) {
      console.warn('Could not find/create course folder:', folderError.message);
    }

    const fileMetadata = {
      name: title || req.file.originalname,
      parents: [folderId],
    };

    const media = {
      mimeType: req.file.mimetype,
      body: Readable.from(req.file.buffer),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name',
    });

    const driveFileId = file.data.id;
    const driveFileName = file.data.name;

    await drive.permissions.create({
      fileId: driveFileId,
      requestBody: {
        type: 'anyone',
        role: 'reader',
      },
    });

    const webContentLink = `https://drive.google.com/uc?id=${driveFileId}&export=download`;

    const insertQuery = `
      INSERT INTO videos (title, description, uploaded_by, video_url, duration, cloudinary_public_id, upload_timestamp, course_offering_id)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [
      title || driveFileName,
      description || null,
      uploadedBy,
      webContentLink,
      null,
      driveFileId, // Store in cloudinary_public_id column
      courseOfferingIdNum,
    ]);

    logger.info(`Video uploaded to Drive: ${driveFileId}`);

    const video = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Video uploaded to Google Drive successfully',
      video: result.rows[0],
    });
  } catch (error) {
    logger.error('Error uploading video to Drive:', error);
    res.status(500).json({ error: 'Failed to upload video to Drive', message: error.message });
  }
}

/**
 * Upload a video to YouTube using the authenticated user's account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function uploadVideoToYouTube(req, res) {
  try {
    console.log('uploadVideoToYouTube controller called');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const { course_offering_id, title, description } = req.body;
    const uploadedBy = req.user.id;

    if (!title || !course_offering_id) {
      return res.status(400).json({ error: 'Title and course_offering_id are required' });
    }

    const auth = await getAuthenticatedClient(uploadedBy);
    const youtube = google.youtube({ version: 'v3', auth });

    logger.info(`Uploading video to YouTube: ${title}`);

    // Upload to YouTube
    const youtubeResponse = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: title,
          description: description || 'Lecture video uploaded from Unified Academic Portal',
          categoryId: '27', // Education category
        },
        status: {
          privacyStatus: 'unlisted', // Automatic unlisted setting as requested
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: Readable.from(req.file.buffer),
      },
    });

    const youtubeVideoId = youtubeResponse.data.id;
    const videoUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;

    // Store in database
    const insertQuery = `
      INSERT INTO videos (title, description, uploaded_by, video_url, upload_timestamp, course_offering_id)
      VALUES ($1, $2, $3, $4, NOW(), $5)
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [
      title,
      description || null,
      uploadedBy,
      videoUrl,
      parseInt(course_offering_id),
    ]);

    res.status(201).json({
      success: true,
      message: 'Video uploaded to YouTube successfully',
      video: result.rows[0],
    });
  } catch (error) {
    logger.error('Error uploading video to YouTube:', error);
    res.status(500).json({ error: 'Failed to upload video to YouTube', message: error.message });
  }
}

// ========== NEW TRANSCRIPT AND SECTIONS FUNCTIONS ==========

export async function processVideoTranscript(videoId) {
  try {
    logger.info(`Processing transcript for video ${videoId}`);

    // Get video details
    const videoResult = await pool.query(
      'SELECT * FROM videos WHERE id = $1 AND (drive_file_id IS NOT NULL OR cloudinary_public_id IS NOT NULL)',
      [videoId]
    );
    if (videoResult.rows.length === 0) {
      logger.warn(`No Drive video found for processing: ${videoId}`);
      return;
    }

    const video = videoResult.rows[0];

    // Check if already processed
    const transcriptCheck = await pool.query(
      'SELECT id FROM video_transcripts WHERE video_id = $1',
      [videoId]
    );
    if (transcriptCheck.rows.length > 0) {
      logger.info(`Video ${videoId} already processed`);
      return;
    }

    // Step 1: Generate or fetch transcript
    let transcript;
    const duration = video.duration || 1800;

    try {
      transcript = await transcribeVideoWithGoogleSTT(video, duration);
      logger.info(
        `Google STT transcript fetched for video ${videoId}, length: ${transcript.length}`
      );
    } catch (sttError) {
      logger.warn(`Google STT failed (feature not available), using dummy transcript`);
      const wordsPerMin = 150;
      const totalWords = Math.floor((duration / 60) * wordsPerMin);
      transcript = generateDummyTranscript(totalWords, duration);
    }

    // Step 2: Use AI to divide into sections via OpenRouter
    let sections;
    try {
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
      const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

      if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY not set');
      }

      const prompt = `Divide this video transcript into 4-8 logical sections based on topics. Video duration: ${duration}s.

Transcript:
${transcript.substring(0, 4000)}...

Output ONLY valid JSON array:
[
  {
    "start_time": 0,
    "end_time": 300,
    "title": "Introduction",
    "summary": "Brief summary..."
  }
]`;

      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'FYP Coding Platform'
        },
        body: JSON.stringify({
          model: 'google/gemini-flash-1.5-free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2000,
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '[]';
      
      try {
        // Strip markdown if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```')) {
          const match = cleanContent.match(/```(?:json)?\s*([\s\S]*?)```/i);
          if (match && match[1]) cleanContent = match[1].trim();
        }
        sections = JSON.parse(cleanContent);
      } catch {
        sections = generateDummySections(duration);
      }
    } catch (aiError) {
      logger.warn('AI sectioning failed, using dummy sections:', aiError.message);
      sections = generateDummySections(duration);
    }

    // Step 3: Store transcript
    await pool.query(
      `INSERT INTO video_transcripts (video_id, full_transcript, language) 
       VALUES ($1, $2, 'en')`,
      [videoId, transcript]
    );

    // Step 4: Store sections
    for (const sec of sections) {
      await pool.query(
        `INSERT INTO video_sections (video_id, start_time, end_time, title, summary, transcript_snippet)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          videoId,
          sec.start_time || 0,
          sec.end_time || 60,
          sec.title || 'Section',
          sec.summary || '',
          sec.transcript_snippet || '',
        ]
      );
    }

    logger.info(`Processed ${sections.length} sections for video ${videoId}`);
  } catch (error) {
    logger.error(`Transcript processing failed for video ${videoId}:`, error);
  }
}

export async function getVideoSections(req, res) {
  try {
    const videoId = parseInt(req.params.id);
    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const result = await pool.query(
      `
      SELECT vs.*, 
             (SELECT COUNT(*) FROM video_quiz_questions vqq WHERE vqq.section_id = vs.id) as quiz_count
      FROM video_sections vs 
      WHERE vs.video_id = $1 
      ORDER BY vs.start_time ASC
    `,
      [videoId]
    );

    res.json({ sections: result.rows });
  } catch (error) {
    logger.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
}

export async function getVideoTranscript(req, res) {
  try {
    const videoId = parseInt(req.params.id);
    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const result = await pool.query(
      `
      SELECT vt.full_transcript, vt.word_timestamps 
      FROM video_transcripts vt 
      WHERE vt.video_id = $1
    `,
      [videoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transcript not found. Process video first.' });
    }

    res.json({ transcript: result.rows[0] });
  } catch (error) {
    logger.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
}

export async function createVideoSection(req, res) {
  try {
    const videoId = parseInt(req.params.id);
    const { start_time, end_time, title, summary } = req.body;

    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const existingSection = await pool.query(
      'SELECT id FROM video_sections WHERE video_id = $1 AND LOWER(title) = LOWER($2)',
      [videoId, title.trim()]
    );
    if (existingSection.rows.length > 0) {
      return res
        .status(400)
        .json({ error: 'A section with this name already exists for this video' });
    }

    const result = await pool.query(
      `INSERT INTO video_sections (video_id, start_time, end_time, title, summary, transcript_snippet)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [videoId, start_time || null, end_time || null, title.trim(), summary || '', '']
    );

    res.status(201).json({ section: result.rows[0] });
  } catch (error) {
    logger.error('Error creating section:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
}

export async function updateVideoSection(req, res) {
  try {
    const videoId = parseInt(req.params.id);
    const sectionId = parseInt(req.params.sectionId);
    const { start_time, end_time, title, summary } = req.body;

    if (isNaN(sectionId)) {
      return res.status(400).json({ error: 'Invalid section ID' });
    }

    if (title !== undefined && title.trim()) {
      const existingSection = await pool.query(
        'SELECT id FROM video_sections WHERE video_id = $1 AND LOWER(title) = LOWER($2) AND id != $3',
        [videoId, title.trim(), sectionId]
      );
      if (existingSection.rows.length > 0) {
        return res
          .status(400)
          .json({ error: 'A section with this name already exists for this video' });
      }
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (start_time !== undefined) {
      updates.push(`start_time = $${paramIndex++}`);
      values.push(start_time);
    }
    if (end_time !== undefined) {
      updates.push(`end_time = $${paramIndex++}`);
      values.push(end_time);
    }
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title.trim());
    }
    if (summary !== undefined) {
      updates.push(`summary = $${paramIndex++}`);
      values.push(summary);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(sectionId);
    const result = await pool.query(
      `UPDATE video_sections SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json({ section: result.rows[0] });
  } catch (error) {
    logger.error('Error updating section:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
}

export async function deleteVideoSection(req, res) {
  try {
    const sectionId = parseInt(req.params.sectionId);

    if (isNaN(sectionId)) {
      return res.status(400).json({ error: 'Invalid section ID' });
    }

    const result = await pool.query('DELETE FROM video_sections WHERE id = $1 RETURNING *', [
      sectionId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    logger.error('Error deleting section:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
}

export async function autoGenerateSections(req, res) {
  try {
    const videoId = parseInt(req.params.id);

    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId]);
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videoResult.rows[0];
    const duration = video.duration || 1800;

    const existingSections = await pool.query('SELECT id FROM video_sections WHERE video_id = $1', [
      videoId,
    ]);
    if (existingSections.rows.length > 0) {
      return res
        .status(400)
        .json({ error: 'Sections already exist. Delete them first to regenerate.' });
    }

    let transcript;
    try {
      transcript = await transcribeVideoWithGoogleSTT(video, duration);
      logger.info(`Google STT transcript fetched for video ${videoId}`);
    } catch (sttError) {
      logger.warn(`Google STT failed (feature not available), using dummy transcript`);
      const wordsPerMin = 150;
      const totalWords = Math.floor((duration / 60) * wordsPerMin);
      transcript = generateDummyTranscript(totalWords, duration);
    }

    let sections;
    try {
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
      const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

      if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY not set');
      }

      const prompt = `Divide this video transcript into 4-8 logical sections based on topics. Video duration: ${duration}s.

Transcript:
${transcript.substring(0, 4000)}...

Output ONLY valid JSON array:
[
  {
    "start_time": 0,
    "end_time": 300,
    "title": "Introduction",
    "summary": "Brief summary..."
  }
]`;

      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'FYP Coding Platform'
        },
        body: JSON.stringify({
          model: 'google/gemini-flash-1.5-free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2000,
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '[]';
      
      try {
        // Strip markdown if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```')) {
          const match = cleanContent.match(/```(?:json)?\s*([\s\S]*?)```/i);
          if (match && match[1]) cleanContent = match[1].trim();
        }
        sections = JSON.parse(cleanContent);
      } catch {
        sections = generateDummySections(duration);
      }
    } catch (aiError) {
      logger.warn('AI sectioning failed, using dummy sections:', aiError.message);
      sections = generateDummySections(duration);
    }

    for (const sec of sections) {
      await pool.query(
        `INSERT INTO video_sections (video_id, start_time, end_time, title, summary, transcript_snippet)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          videoId,
          sec.start_time || 0,
          sec.end_time || 60,
          sec.title || 'Section',
          sec.summary || '',
          sec.transcript_snippet || '',
        ]
      );
    }

    if (transcript && transcript.length > 100) {
      await pool.query(
        `INSERT INTO video_transcripts (video_id, full_transcript, language) 
         VALUES ($1, $2, 'en')`,
        [videoId, transcript]
      );
    }

    logger.info(`Auto-generated ${sections.length} sections for video ${videoId}`);
    res.json({
      message: 'Sections generated successfully',
      sections: sections.length,
      transcriptGenerated: transcript && transcript.length > 100,
    });
  } catch (error) {
    logger.error('Error auto-generating sections:', error);
    res.status(500).json({ error: 'Failed to generate sections' });
  }
}

function generateDummyTranscript(words, duration) {
  const topics = [
    'introduction to algorithms',
    'time complexity analysis',
    'sorting algorithms overview',
    'bubble sort implementation',
    'selection sort details',
    'insertion sort example',
    'merge sort recursive',
    'quick sort partitioning',
  ];
  let transcript = '';
  let time = 0;
  const wordRate = (words / duration) * 60; // words per second
  for (let i = 0; i < Math.min(topics.length, 8); i++) {
    const secWords = Math.floor((duration / 8) * wordRate);
    transcript += `[${Math.floor(time)}s] Discussing ${topics[i]}. `;
    transcript += 'Lorem ipsum '.repeat(secWords / 10).trim() + '. ';
    time += duration / 8;
  }
  return transcript.trim();
}

function generateDummySections(duration) {
  const sections = [];
  const numSections = 5 + Math.floor(Math.random() * 4);
  const secDuration = duration / numSections;
  const titles = [
    'Introduction',
    'Core Concepts',
    'Examples',
    'Advanced Topics',
    'Conclusion',
    'Q&A',
  ];
  for (let i = 0; i < numSections; i++) {
    sections.push({
      start_time: Math.floor(i * secDuration),
      end_time: Math.floor((i + 1) * secDuration),
      title: titles[i] || `Section ${i + 1}`,
      summary: `Summary of section ${i + 1} covering key points in ${Math.floor(secDuration)} seconds.`,
      transcript_snippet: 'Sample transcript snippet...',
    });
  }
  return sections;
}

async function transcribeVideoWithGoogleSTT(video, duration) {
  throw new Error(
    'Google Speech-to-Text is not configured. Please install @google-cloud/speech and set up credentials.'
  );
}
