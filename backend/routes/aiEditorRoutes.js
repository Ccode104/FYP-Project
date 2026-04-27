/**
 * AI Enhanced Code Editor Routes
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  analyzeComplexity,
  injectLogicalBug
} from '../controllers/codeAnalysisController.js';
import {
  generateCodingQuestion
} from '../controllers/aiGeneratorController.js';
import {
  processAIQuery,
  getAIQueryHistory,
  getAIUsageStats
} from '../controllers/aiAssistantController.js';

const router = express.Router();

// Code Analysis Routes
/**
 * @swagger
 * /api/code-analysis/complexity:
 *   post:
 *     summary: Analyze code complexity
 *     tags: [Code Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: Source code to analyze
 *               language:
 *                 type: string
 *                 description: Programming language (python, cpp, java, etc.)
 *               question_id:
 *                 type: integer
 *                 description: Optional question ID for logging
 *     responses:
 *       200:
 *         description: Complexity analysis result
 *       400:
 *         description: Missing required fields
 */
router.post('/complexity', requireAuth, analyzeComplexity);

/**
 * @swagger
 * /api/code-analysis/inject-bug:
 *   post:
 *     summary: Inject logical bug into code
 *     tags: [Code Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               language:
 *                 type: string
 *               question_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Code with injected bug
 */
router.post('/inject-bug', requireAuth, injectLogicalBug);

// AI Assistant Routes
/**
 * @swagger
 * /api/ai-assistant/query:
 *   post:
 *     summary: Send query to AI assistant
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - language
 *               - query_type
 *             properties:
 *               question_id:
 *                 type: integer
 *               code:
 *                 type: string
 *               language:
 *                 type: string
 *               query_type:
 *                 type: string
 *                 enum: [hint, explanation, debugging, algorithm]
 *               user_query:
 *                 type: string
 *               contest_mode:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: AI response
 *       429:
 *         description: Query limit exceeded
 */
router.post('/query', requireAuth, processAIQuery);

/**
 * @swagger
 * /api/ai-assistant/history/{questionId}:
 *   get:
 *     summary: Get AI query history for a question
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Query history
 */
router.get('/history/:questionId', requireAuth, getAIQueryHistory);

/**
 * @swagger
 * /api/ai-assistant/stats:
 *   get:
 *     summary: Get user's AI usage statistics
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage statistics
 */
router.get('/stats', requireAuth, getAIUsageStats);

/**
 * @swagger
 * /api/ai-assistant/generate-question:
 *   post:
 *     summary: Generate coding question components
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               language:
 *                 type: string
 *     responses:
 *       200:
 *         description: Generated components
 */
router.post('/generate-question', requireAuth, generateCodingQuestion);

export default router;
