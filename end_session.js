import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:password@localhost:5432/lms_db'
});

async function endSession() {
  try {
    console.log('Ending existing proctoring session...');

    // Find the active session for student 38 and quiz 13
    const sessionQuery = `
      SELECT ps.id, ps.status
      FROM proctoring_sessions ps
      LEFT JOIN quiz_attempts qa ON ps.quiz_attempt_id = qa.id
      WHERE ps.student_id = $1
      AND (qa.quiz_id = $2 OR ps.quiz_attempt_id IS NULL)
      AND ps.status IN ('active', 'suspended')
      ORDER BY ps.created_at DESC
      LIMIT 1
    `;

    const sessionResult = await pool.query(sessionQuery, [38, 13]);

    if (sessionResult.rows.length === 0) {
      console.log('No active session found');
      return;
    }

    const session = sessionResult.rows[0];
    console.log(`Found session ID ${session.id} with status ${session.status}`);

    // End the session
    await pool.query(
      'UPDATE proctoring_sessions SET status = $1, ended_at = now() WHERE id = $2',
      ['completed', session.id]
    );

    console.log('✅ Existing session ended successfully');
  } catch (error) {
    console.error('Error ending session:', error);
  } finally {
    await pool.end();
  }
}

endSession();