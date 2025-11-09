import express from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadVideo } from '../middleware/upload.js';
import {
  uploadVideo as uploadVideoController,
  getMyVideos,
  getVideosByCourseOffering,
  getVideoById,
  deleteVideo,
  addVideoQuizQuestion,
  getVideoQuizQuestions,
  updateVideoQuizQuestion,
  deleteVideoQuizQuestion,
  startVideoQuizAttempt,
  submitVideoQuizAnswer,
  completeVideoQuizAttempt,
  getVideoQuizAttempt,
  getVideoQuizAttempts,
} from '../controllers/videosController.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /api/videos:
 *   post:
 *     summary: Upload a video lecture (Faculty only)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - video
 *               - title
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires faculty role
 */
// Error handling middleware for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error('Multer error:', err);
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum size is 500MB' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    // Handle other errors (e.g., fileFilter errors, Cloudinary errors)
    const errorMessage = err.message || 'File upload error';
    return res.status(400).json({ error: errorMessage });
  }
  next();
};

router.post(
  "/",
  requireRole("faculty", "admin"),
  (req, res, next) => {
    console.log('Upload route hit, file field:', req.body);
    uploadVideo.single("video")(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadVideoController
);


/**
 * @swagger
 * /api/videos/my:
 *   get:
 *     summary: Get all videos uploaded by current faculty user
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of videos
 *       401:
 *         description: Unauthorized
 */
router.get('/my', requireRole('faculty', 'admin'), getMyVideos);

/**
 * @swagger
 * /api/videos/course/{courseOfferingId}:
 *   get:
 *     summary: Get all videos for a course offering
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseOfferingId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of videos for the course offering
 *       403:
 *         description: Forbidden - User not enrolled or not authorized
 */
router.get('/course/:courseOfferingId', getVideosByCourseOffering);

/**
 * @swagger
 * /api/videos/{id}:
 *   get:
 *     summary: Get a video by ID
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Video details
 *       404:
 *         description: Video not found
 */
router.get('/:id', getVideoById);

/**
 * @swagger
 * /api/videos/{id}:
 *   delete:
 *     summary: Delete a video (only by uploader or admin)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Video deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Video not found
 */
router.delete('/:id', requireRole('faculty', 'admin'), deleteVideo);

/**
 * @swagger
 * /api/videos/{videoId}/quiz-questions:
 *   post:
 *     summary: Add a quiz question to a video
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question_text
 *               - correct_answer
 *             properties:
 *               question_text:
 *                 type: string
 *               question_type:
 *                 type: string
 *                 enum: [mcq, true_false, short_answer]
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correct_answer:
 *                 type: string
 *               points:
 *                 type: number
 *               explanation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Quiz question added successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Video not found
 */
router.post('/:videoId/quiz-questions', requireRole('faculty', 'admin'), addVideoQuizQuestion);

/**
 * @swagger
 * /api/videos/{videoId}/quiz-questions:
 *   get:
 *     summary: Get all quiz questions for a video
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of quiz questions
 */
router.get('/:videoId/quiz-questions', getVideoQuizQuestions);

/**
 * @swagger
 * /api/videos/{videoId}/quiz-questions/{questionId}:
 *   put:
 *     summary: Update a quiz question
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question_text:
 *                 type: string
 *               question_type:
 *                 type: string
 *               options:
 *                 type: array
 *               correct_answer:
 *                 type: string
 *               points:
 *                 type: number
 *               explanation:
 *                 type: string
 *     responses:
 *       200:
 *         description: Question updated successfully
 *       404:
 *         description: Question not found
 */
router.put(
  '/:videoId/quiz-questions/:questionId',
  requireRole('faculty', 'admin'),
  updateVideoQuizQuestion
);

/**
 * @swagger
 * /api/videos/{videoId}/quiz-questions/{questionId}:
 *   delete:
 *     summary: Delete a quiz question
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *       404:
 *         description: Question not found
 */
router.delete(
  '/:videoId/quiz-questions/:questionId',
  requireRole('faculty', 'admin'),
  deleteVideoQuizQuestion
);

/**
 * @swagger
 * /api/videos/{videoId}/quiz/start:
 *   post:
 *     summary: Start or get a video quiz attempt
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attempt retrieved or created
 *       201:
 *         description: New attempt created
 */
router.post('/:videoId/quiz/start', startVideoQuizAttempt);

/**
 * @swagger
 * /api/videos/{videoId}/quiz/answer:
 *   post:
 *     summary: Submit an answer to a video quiz question
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question_id
 *               - answer
 *             properties:
 *               question_id:
 *                 type: integer
 *               answer:
 *                 type: string
 *     responses:
 *       200:
 *         description: Answer submitted successfully
 */
router.post('/:videoId/quiz/answer', submitVideoQuizAnswer);

/**
 * @swagger
 * /api/videos/{videoId}/quiz/complete:
 *   post:
 *     summary: Complete a video quiz attempt
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attempt completed successfully
 */
router.post('/:videoId/quiz/complete', completeVideoQuizAttempt);

/**
 * @swagger
 * /api/videos/{videoId}/quiz/attempt:
 *   get:
 *     summary: Get video quiz attempt for current student
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attempt retrieved
 *       404:
 *         description: Attempt not found
 */
router.get('/:videoId/quiz/attempt', getVideoQuizAttempt);

/**
 * @swagger
 * /api/videos/{videoId}/quiz/attempts:
 *   get:
 *     summary: Get all video quiz attempts for a video (Faculty only)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of attempts
 *       403:
 *         description: Forbidden - Only faculty can view all attempts
 */
router.get('/:videoId/quiz/attempts', requireRole('faculty', 'admin', 'ta'), getVideoQuizAttempts);

export default router;

