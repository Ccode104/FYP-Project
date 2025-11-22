import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.use(requireAuth);

// Track typing metrics for academic integrity
router.post('/typing-metrics', async (req, res) => {
  try {
    const { metrics, timestamp, userAgent } = req.body;
    const userId = req.user.id;

    // Log suspicious activity
    if (metrics.isSuspicious) {
      logger.warn('Suspicious typing detected', {
        userId,
        metrics,
        timestamp,
        userAgent,
        ip: req.ip
      });
    }

    // Store metrics for analysis (you could save to database here)
    // For now, just log and acknowledge

    res.json({
      success: true,
      flagged: metrics.isSuspicious
    });
  } catch (error) {
    logger.error('Error processing typing metrics:', error);
    res.status(500).json({ error: 'Failed to process typing metrics' });
  }
});

export default router;