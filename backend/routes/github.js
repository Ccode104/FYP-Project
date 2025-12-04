// src/routes/github.js
import express from 'express';
import { getUserRepositories } from '../controllers/githubController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/github/repositories:
 *   get:
 *     summary: Get user's GitHub repositories
 *     tags: [GitHub]
 *     description: Fetch repositories from the authenticated user's GitHub account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 30
 *         description: Number of repositories per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created, updated, pushed, full_name]
 *           default: updated
 *         description: Sort field for repositories
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: Repositories fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 repositories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 123456789
 *                       name:
 *                         type: string
 *                         example: "my-repo"
 *                       full_name:
 *                         type: string
 *                         example: "username/my-repo"
 *                       description:
 *                         type: string
 *                         example: "A sample repository"
 *                       html_url:
 *                         type: string
 *                         example: "https://github.com/username/my-repo"
 *                       language:
 *                         type: string
 *                         example: "JavaScript"
 *                       private:
 *                         type: boolean
 *                         example: false
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     per_page:
 *                       type: integer
 *                       example: 30
 *                     has_more:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: GitHub not connected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "GitHub not connected"
 *       401:
 *         description: Authentication required or token expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "GitHub token expired. Please reconnect."
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to fetch repositories
 */
router.get('/repositories', requireAuth, getUserRepositories);

export default router;