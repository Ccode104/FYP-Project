import { pool } from '../db/index.js';

/**
 * Get user gamification stats
 */
export async function getUserStats(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {return res.status(401).json({ error: 'Unauthorized' });}

    const stats = await pool.query(
      'SELECT * FROM user_gamification_stats WHERE user_id = $1',
      [userId]
    );

    if (stats.rowCount === 0) {
      // Return default stats
      return res.json({
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        problems_solved: 0,
        easy_solved: 0,
        medium_solved: 0,
        hard_solved: 0,
        total_submissions: 0,
        successful_submissions: 0,
        average_time_seconds: 0,
        level: 1,
        experience_points: 0
      });
    }

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
}

/**
 * Get leaderboard for assignment, course, or global
 */
export async function getLeaderboard(req, res) {
  try {
    const { type, referenceId, limit = 50 } = req.query;
    const userId = req.user?.id;

    // Support assignment, course, quiz, global, and contest leaderboards
    if (!['assignment', 'course', 'quiz', 'global', 'contest'].includes(type)) {
      return res.status(400).json({ error: 'Invalid leaderboard type' });
    }

    let query;
    let params = [];

    if (type === 'global') {
      query = `
        SELECT l.*, u.name as user_name, u.email as user_email
        FROM leaderboards l
        JOIN users u ON l.user_id = u.id
        WHERE l.leaderboard_type = 'global'
        ORDER BY l.score DESC, l.time_spent_seconds ASC
        LIMIT $1
      `;
      params = [limit];
    } else if (type === 'quiz') {
      if (!referenceId) {
        return res.status(400).json({ error: 'Quiz ID required for quiz leaderboards' });
      }

      // Quiz leaderboard - exclude violated attempts
      query = `
        SELECT
          qa.score,
          qa.finished_at as submission_date,
          NULL as time_spent_seconds,
          u.name as user_name,
          u.email as user_email,
          ROW_NUMBER() OVER (ORDER BY qa.score DESC, qa.finished_at ASC) as rank
        FROM quiz_attempts qa
        JOIN users u ON qa.student_id = u.id
        WHERE qa.quiz_id = $1
          AND qa.violated = false
          AND qa.score IS NOT NULL
        ORDER BY qa.score DESC, qa.finished_at ASC
        LIMIT $2
      `;
      params = [referenceId, limit];
    } else {
      if (!referenceId) {
        return res.status(400).json({ error: 'Reference ID required for assignment/course leaderboards' });
      }

      query = `
        SELECT l.*, u.name as user_name, u.email as user_email
        FROM leaderboards l
        JOIN users u ON l.user_id = u.id
        WHERE l.leaderboard_type = $1 AND l.reference_id = $2
        ORDER BY l.score DESC, l.time_spent_seconds ASC
        LIMIT $3
      `;
      params = [type, referenceId, limit];
    }

    const leaderboard = await pool.query(query, params);

    // Get current user's rank if requested
    let userRank = null;
    if (userId) {
      if (type === 'quiz') {
        // For quiz leaderboards, calculate rank from quiz attempts
        const rankQuery = `
          SELECT rank FROM (
            SELECT
              student_id,
              ROW_NUMBER() OVER (ORDER BY score DESC, finished_at ASC) as rank
            FROM quiz_attempts
            WHERE quiz_id = $1
              AND violated = false
              AND score IS NOT NULL
          ) ranked
          WHERE student_id = $2
        `;
        const rankResult = await pool.query(rankQuery, [referenceId, userId]);

        if (rankResult.rowCount > 0) {
          userRank = rankResult.rows[0].rank;
        }
      } else {
        const rankQuery = type === 'global'
          ? 'SELECT rank FROM leaderboards WHERE leaderboard_type = \'global\' AND user_id = $1 ORDER BY submission_date DESC LIMIT 1'
          : 'SELECT rank FROM leaderboards WHERE leaderboard_type = $1 AND reference_id = $2 AND user_id = $3 ORDER BY submission_date DESC LIMIT 1';

        const rankParams = type === 'global' ? [userId] : [type, referenceId, userId];
        const rankResult = await pool.query(rankQuery, rankParams);

        if (rankResult.rowCount > 0) {
          userRank = rankResult.rows[0].rank;
        }
      }
    }

    res.json({
      leaderboard: leaderboard.rows,
      userRank,
      type,
      referenceId: referenceId || null
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

/**
 * Get user achievements
 */
export async function getUserAchievements(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {return res.status(401).json({ error: 'Unauthorized' });}

    const achievements = await pool.query(
      `SELECT ua.*, a.name, a.description, a.icon, a.category, a.rarity, a.points_reward
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC`,
      [userId]
    );

    res.json({ achievements: achievements.rows });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
}

/**
 * Get all available achievements
 */
export async function getAllAchievements(req, res) {
  try {
    const achievements = await pool.query(
      'SELECT * FROM achievements WHERE is_active = true ORDER BY category, requirement_value'
    );

    res.json({ achievements: achievements.rows });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
}

/**
 * Get daily challenge
 */
export async function getDailyChallenge(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const challenge = await pool.query(
      `SELECT dc.*, cq.title, cq.description, cq.difficulty
       FROM daily_challenges dc
       JOIN code_questions cq ON dc.question_id = cq.id
       WHERE dc.date = $1 AND dc.is_active = true`,
      [today]
    );

    if (challenge.rowCount === 0) {
      return res.json({ challenge: null });
    }

    // Check if user has completed today's challenge
    const userId = req.user?.id;
    let completed = false;
    if (userId) {
      const completion = await pool.query(
        'SELECT 1 FROM user_daily_challenges WHERE user_id = $1 AND challenge_id = $2',
        [userId, challenge.rows[0].id]
      );
      completed = completion.rowCount > 0;
    }

    res.json({
      challenge: challenge.rows[0],
      completed
    });
  } catch (error) {
    console.error('Error fetching daily challenge:', error);
    res.status(500).json({ error: 'Failed to fetch daily challenge' });
  }
}

/**
 * Complete daily challenge
 */
export async function completeDailyChallenge(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {return res.status(401).json({ error: 'Unauthorized' });}

    const { challengeId } = req.body;
    if (!challengeId) {return res.status(400).json({ error: 'Challenge ID required' });}

    // Check if challenge exists and is active
    const challenge = await pool.query(
      'SELECT * FROM daily_challenges WHERE id = $1 AND is_active = true',
      [challengeId]
    );

    if (challenge.rowCount === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if already completed
    const existing = await pool.query(
      'SELECT * FROM user_daily_challenges WHERE user_id = $1 AND challenge_id = $2',
      [userId, challengeId]
    );

    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Challenge already completed' });
    }

    // Record completion
    const bonusPoints = challenge.rows[0].bonus_points || 25;
    await pool.query(
      'INSERT INTO user_daily_challenges (user_id, challenge_id, points_earned) VALUES ($1, $2, $3)',
      [userId, challengeId, bonusPoints]
    );

    // Update user stats
    await pool.query(
      'UPDATE user_gamification_stats SET total_points = total_points + $1 WHERE user_id = $2',
      [bonusPoints, userId]
    );

    res.json({
      success: true,
      pointsEarned: bonusPoints,
      message: `Daily challenge completed! +${bonusPoints} points`
    });
  } catch (error) {
    console.error('Error completing daily challenge:', error);
    res.status(500).json({ error: 'Failed to complete challenge' });
  }
}

/**
 * Get user submission history with gamification data
 */
export async function getUserSubmissionHistory(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {return res.status(401).json({ error: 'Unauthorized' });}

    const { limit = 20, offset = 0 } = req.query;

    const submissions = await pool.query(
      `SELECT
        cs.id,
        cs.language,
        cs.created_at,
        cs.started_at,
        cs.completed_at,
        cs.time_spent_seconds,
        cs.gamified_score,
        cs.attempts_count,
        cs.efficiency_score,
        cs.test_results,
        a.title as assignment_title,
        a.id as assignment_id,
        cq.title as question_title,
        cq.difficulty
       FROM code_submissions cs
       JOIN assignment_submissions ass ON cs.submission_id = ass.id
       JOIN assignments a ON ass.assignment_id = a.id
       LEFT JOIN assignment_questions aq ON cs.assignment_question_id = aq.id
       LEFT JOIN code_questions cq ON aq.question_id = cq.id
       WHERE ass.student_id = $1
       ORDER BY cs.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({ submissions: submissions.rows });
  } catch (error) {
    console.error('Error fetching submission history:', error);
    res.status(500).json({ error: 'Failed to fetch submission history' });
  }
}