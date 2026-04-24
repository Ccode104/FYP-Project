import express from 'express';
import {
  getUserStats,
  getLeaderboard,
  getUserAchievements,
  getAllAchievements,
  getDailyChallenge,
  completeDailyChallenge,
  getUserSubmissionHistory,
  getDashboardSummary
} from '../controllers/gamificationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All gamification routes require authentication
router.use(requireAuth);

// User stats
router.get('/stats', getUserStats);
router.get('/summary', getDashboardSummary);

// Leaderboards
router.get('/leaderboard', getLeaderboard);

// Achievements
router.get('/achievements', getUserAchievements);
router.get('/achievements/all', getAllAchievements);

// Daily challenges
router.get('/daily-challenge', getDailyChallenge);
router.post('/daily-challenge/complete', completeDailyChallenge);

// Submission history
router.get('/submissions/history', getUserSubmissionHistory);

export default router;
