import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getContestByOffering, listContests } from '../controllers/contestsController.js';

const router = express.Router();

/**
 * @swagger
 * /api/course-offerings/{offeringId}/contests:
 *   get:
 *     summary: Get all contests for a course offering
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offeringId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of contests
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Course offering not found
 */
/**
 * @swagger
 * /api/course-offerings/{offeringId}/contests/{contestId}:
 *   get:
 *     summary: Get contest details by offering and contest id
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offeringId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: contestId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contest details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Contest not found
 */
router.get('/:offeringId/contests', requireAuth, listContests);
router.get('/:offeringId/contests/:contestId', requireAuth, getContestByOffering);

export default router;