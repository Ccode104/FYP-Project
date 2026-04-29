import { pool } from '../db/index.js';

/**
 * Logs an AI query to the database for tracking limits and usage.
 */
export async function logAiQuery(userId, queryType, queryContent, responsePreview) {
  try {
    await pool.query(
      `INSERT INTO ai_query_logs (user_id, query_type, code_hash, response_preview)
       VALUES ($1, $2, $3, $4)`,
      [userId, queryType, queryContent?.substring(0, 50), responsePreview?.substring(0, 100)]
    );
  } catch (err) {
    console.error('Failed to log AI query:', err);
  }
}

/**
 * Gets the number of AI queries made today.
 */
export async function getDailyAiQueryCount() {
  try {
    const res = await pool.query(
      `SELECT COUNT(*)::int as count 
       FROM ai_query_logs 
       WHERE created_at >= CURRENT_DATE`
    );
    return res.rows[0].count;
  } catch (err) {
    console.error('Failed to get daily AI query count:', err);
    return 0;
  }
}
