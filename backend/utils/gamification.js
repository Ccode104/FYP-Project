import { pool } from '../db/index.js';

/**
 * Calculate gamified score for a code submission
 * @param {Object} params - Scoring parameters
 * @param {boolean} params.allTestsPassed - Whether all test cases passed
 * @param {number} params.timeSpentSeconds - Time spent in seconds
 * @param {string} params.difficulty - 'easy', 'medium', 'hard'
 * @param {number} params.attempts - Number of attempts
 * @param {number} params.codeLength - Length of submitted code
 * @param {number} params.executionTime - Execution time in milliseconds
 * @param {number} params.memoryUsed - Memory used in KB
 * @returns {Object} Score breakdown
 */
export function calculateGamifiedScore({
  allTestsPassed,
  timeSpentSeconds,
  difficulty,
  attempts,
  codeLength,
  executionTime,
  // eslint-disable-next-line no-unused-vars
  _memoryUsed
}) {
  if (!allTestsPassed) {
    return {
      totalScore: 0,
      baseScore: 0,
      timeBonus: 0,
      difficultyMultiplier: 0,
      efficiencyBonus: 0,
      attemptPenalty: 0,
      breakdown: 'Failed to pass all test cases'
    };
  }

  // Base score
  const baseScore = 100;

  // Difficulty multiplier
  const difficultyMultipliers = {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0
  };
  const difficultyMultiplier = difficultyMultipliers[difficulty] || 1.5;

  // Time bonus (max 50 points, decreases with time)
  // Optimal time varies by difficulty
  const optimalTimes = {
    easy: 300,    // 5 minutes
    medium: 600,  // 10 minutes
    hard: 1200    // 20 minutes
  };
  const optimalTime = optimalTimes[difficulty] || 600;
  const timeRatio = Math.max(0, 1 - (timeSpentSeconds - optimalTime / 2) / optimalTime);
  const timeBonus = Math.round(50 * Math.max(0, timeRatio));

  // Efficiency bonus (max 25 points based on code length and performance)
  let efficiencyBonus = 0;

  // Code length bonus (shorter code = more points, up to 10 points)
  const avgCodeLengths = {
    easy: 50,
    medium: 100,
    hard: 200
  };
  const avgLength = avgCodeLengths[difficulty] || 100;
  const lengthRatio = Math.max(0, 1 - (codeLength - avgLength * 0.5) / avgLength);
  const lengthBonus = Math.round(10 * Math.max(0, lengthRatio));

  // Performance bonus (faster execution = more points, up to 15 points)
  const avgExecutionTimes = {
    easy: 100,    // 100ms
    medium: 500,  // 500ms
    hard: 2000    // 2000ms
  };
  const avgExecutionTime = avgExecutionTimes[difficulty] || 500;
  const executionRatio = Math.max(0, 1 - (executionTime - avgExecutionTime * 0.5) / avgExecutionTime);
  const executionBonus = Math.round(15 * Math.max(0, executionRatio));

  efficiencyBonus = lengthBonus + executionBonus;

  // Attempt penalty (5 points per attempt beyond first)
  const attemptPenalty = Math.max(0, (attempts - 1) * 5);

  // Calculate total score
  const rawScore = (baseScore * difficultyMultiplier) + timeBonus + efficiencyBonus;
  const totalScore = Math.max(0, Math.round(rawScore - attemptPenalty));

  return {
    totalScore,
    baseScore,
    timeBonus,
    difficultyMultiplier,
    efficiencyBonus,
    attemptPenalty,
    breakdown: {
      baseScore,
      difficultyMultiplier,
      timeBonus,
      efficiencyBonus: {
        lengthBonus,
        executionBonus
      },
      attemptPenalty,
      timeSpentSeconds,
      codeLength,
      executionTime
    }
  };
}

/**
 * Update user gamification stats after a submission
 * @param {number} userId - User ID
 * @param {Object} scoreData - Score calculation result
 * @param {boolean} isFirstSolve - Whether this is the first time solving this problem
 * @param {string} difficulty - Problem difficulty
 */
export async function updateUserGamificationStats(userId, scoreData, isFirstSolve, difficulty) {
  try {
    // Get current stats
    const currentStats = await pool.query(
      'SELECT * FROM user_gamification_stats WHERE user_id = $1',
      [userId]
    );

    let stats = currentStats.rows[0];
    if (!stats) {
      // Create initial stats
      const insertResult = await pool.query(
        'INSERT INTO user_gamification_stats (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
      stats = insertResult.rows[0];
    }

    // Update stats
    const updates = {
      total_points: stats.total_points + scoreData.totalScore,
      problems_solved: isFirstSolve ? stats.problems_solved + 1 : stats.problems_solved,
      total_submissions: stats.total_submissions + 1,
      successful_submissions: scoreData.totalScore > 0 ? stats.successful_submissions + 1 : stats.successful_submissions,
      last_submission_date: new Date().toISOString().split('T')[0]
    };

    // Update difficulty-specific counters
    if (isFirstSolve) {
      switch (difficulty) {
      case 'easy':
        updates.easy_solved = stats.easy_solved + 1;
        break;
      case 'medium':
        updates.medium_solved = stats.medium_solved + 1;
        break;
      case 'hard':
        updates.hard_solved = stats.hard_solved + 1;
        break;
      }
    }

    // Calculate new level (every 1000 points = 1 level)
    updates.level = Math.floor(updates.total_points / 1000) + 1;
    updates.experience_points = updates.total_points;

    // Update average time (simplified calculation)
    const newTotalTime = (stats.average_time_seconds * stats.total_submissions) + scoreData.breakdown.timeSpentSeconds;
    updates.average_time_seconds = Math.round(newTotalTime / updates.total_submissions);

    // Update database
    await pool.query(
      `UPDATE user_gamification_stats SET
        total_points = $1,
        problems_solved = $2,
        easy_solved = $3,
        medium_solved = $4,
        hard_solved = $5,
        total_submissions = $6,
        successful_submissions = $7,
        average_time_seconds = $8,
        last_submission_date = $9,
        level = $10,
        experience_points = $11,
        updated_at = now()
      WHERE user_id = $12`,
      [
        updates.total_points,
        updates.problems_solved,
        updates.easy_solved,
        updates.medium_solved,
        updates.hard_solved,
        updates.total_submissions,
        updates.successful_submissions,
        updates.average_time_seconds,
        updates.last_submission_date,
        updates.level,
        updates.experience_points,
        userId
      ]
    );

    return updates;
  } catch (error) {
    console.error('Error updating user gamification stats:', error);
    throw error;
  }
}

/**
 * Check and unlock achievements for a user
 * @param {number} userId - User ID
 * @param {Object} stats - Updated user stats
 * @param {Object} submissionData - Submission data
 */
export async function checkAndUnlockAchievements(userId, stats, submissionData) {
  try {
    const unlockedAchievements = [];

    // Get all achievements
    const achievements = await pool.query('SELECT * FROM achievements WHERE is_active = true');

    for (const achievement of achievements.rows) {
      // Check if user already has this achievement
      const existing = await pool.query(
        'SELECT 1 FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
        [userId, achievement.id]
      );

      if (existing.rows.length > 0) {continue;} // Already unlocked

      let shouldUnlock = false;

      // Check achievement requirements
      switch (achievement.requirement_type) {
      case 'problems_solved':
        shouldUnlock = stats.problems_solved >= achievement.requirement_value;
        break;
      case 'easy_solved':
        shouldUnlock = stats.easy_solved >= achievement.requirement_value;
        break;
      case 'medium_solved':
        shouldUnlock = stats.medium_solved >= achievement.requirement_value;
        break;
      case 'hard_solved':
        shouldUnlock = stats.hard_solved >= achievement.requirement_value;
        break;
      case 'streak':
        shouldUnlock = stats.current_streak >= achievement.requirement_value;
        break;
      case 'fast_solve':
        shouldUnlock = submissionData.timeSpentSeconds <= 300; // Under 5 minutes
        break;
      case 'perfect_solve':
        shouldUnlock = submissionData.totalScore >= 200; // High score indicates optimal solution
        break;
      case 'daily_challenge':
        // This would be checked separately when completing daily challenges
        break;
      }

      if (shouldUnlock) {
        // Unlock achievement
        await pool.query(
          'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
          [userId, achievement.id]
        );

        unlockedAchievements.push(achievement);

        // Add achievement points to user stats
        await pool.query(
          'UPDATE user_gamification_stats SET total_points = total_points + $1 WHERE user_id = $2',
          [achievement.points_reward, userId]
        );
      }
    }

    return unlockedAchievements;
  } catch (error) {
    console.error('Error checking achievements:', error);
    throw error;
  }
}

/**
 * Update leaderboards after a submission
 * @param {number} userId - User ID
 * @param {number} assignmentId - Assignment ID
 * @param {number} courseId - Course ID
 * @param {number} score - Score achieved
 * @param {number} timeSpent - Time spent in seconds
 */
export async function updateLeaderboards(userId, assignmentId, courseId, score, timeSpent) {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Update assignment leaderboard
    await updateLeaderboardEntry('assignment', assignmentId, userId, score, timeSpent, today);

    // Update course leaderboard
    await updateLeaderboardEntry('course', courseId, userId, score, timeSpent, today);

    // Update global leaderboard
    await updateLeaderboardEntry('global', null, userId, score, timeSpent, today);

  } catch (error) {
    console.error('Error updating leaderboards:', error);
    throw error;
  }
}

/**
 * Update a specific leaderboard entry
 */
async function updateLeaderboardEntry(type, referenceId, userId, score, timeSpent, date) {
  // Insert or update leaderboard entry
  await pool.query(
    `INSERT INTO leaderboards (leaderboard_type, reference_id, user_id, score, time_spent_seconds, submission_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (leaderboard_type, reference_id, user_id, period_start)
     DO UPDATE SET
       score = GREATEST(leaderboards.score, EXCLUDED.score),
       time_spent_seconds = LEAST(leaderboards.time_spent_seconds, EXCLUDED.time_spent_seconds),
       submission_date = EXCLUDED.submission_date`,
    [type, referenceId, userId, score, timeSpent, date]
  );

  // Update ranks for this leaderboard
  await updateLeaderboardRanks(type, referenceId, date);
}

/**
 * Update ranks for a leaderboard
 */
async function updateLeaderboardRanks(type, referenceId, date) {
  const query = referenceId
    ? 'SELECT id FROM leaderboards WHERE leaderboard_type = $1 AND reference_id = $2 AND submission_date >= $3 ORDER BY score DESC, time_spent_seconds ASC'
    : 'SELECT id FROM leaderboards WHERE leaderboard_type = $1 AND reference_id IS NULL AND submission_date >= $3 ORDER BY score DESC, time_spent_seconds ASC';

  const entries = await pool.query(query, [type, referenceId, date]);

  // Update ranks
  for (let i = 0; i < entries.rows.length; i++) {
    await pool.query(
      'UPDATE leaderboards SET rank = $1 WHERE id = $2',
      [i + 1, entries.rows[i].id]
    );
  }
}