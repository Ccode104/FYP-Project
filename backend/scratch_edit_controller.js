import fs from 'fs';

const filePath = 'c:/Users/HP/Desktop/FYP/FYP-Project/backend/controllers/googleController.js';
let content = fs.readFileSync(filePath, 'utf8');

// Use regex to find the functions
const evaluateRegex = /export async function evaluateQuizResults\(req, res\) \{[\s\S]*?\n\}/;
const deleteRegex = /export async function deleteQuizAttemptByTeacher\(req, res\) \{[\s\S]*?\n\}/;

const newEval = `export async function evaluateQuizResults(req, res) {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    if (!quizId) {
      return res.status(400).json({ error: 'Missing quiz ID' });
    }

    // 1. Fetch latest data from Google Forms
    const results = await getGoogleFormQuizResultsData(quizId, userId);
    const quiz = results.quiz;
    const attempts = results.attempts;

    // 2. Persist matched students into our quiz_attempts table
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const attempt of attempts) {
        if (attempt.student_id) {
          // Check if attempt exists (including deleted ones)
          const existing = await client.query(
            'SELECT id, google_response_id, deleted_at FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2',
            [quizId, attempt.student_id]
          );

          if (existing.rowCount > 0) {
            const dbRecord = existing.rows[0];
            
            // If it was deleted, ONLY re-sync if it's a NEW response from Google Forms
            if (dbRecord.deleted_at && dbRecord.google_response_id === attempt.google_response_id) {
              continue; // Skip this one, it was manually deleted by teacher
            }

            // Update existing record (clear deleted_at if it's a new response)
            await client.query(
              \`UPDATE quiz_attempts 
               SET score = $1, finished_at = $2, answers = $3, updated_at = NOW(), 
                   google_response_id = $4, deleted_at = NULL
               WHERE id = $5 AND violated = false\`,
              [attempt.score, attempt.finished_at, JSON.stringify(attempt.answers), attempt.google_response_id, dbRecord.id]
            );
          } else {
            // Insert new record
            await client.query(
              \`INSERT INTO quiz_attempts (quiz_id, student_id, started_at, finished_at, score, answers, violated, google_response_id)
               VALUES ($1, $2, $3, $4, $5, $6, false, $7)\`,
              [quizId, attempt.student_id, attempt.started_at, attempt.finished_at, attempt.score, JSON.stringify(attempt.answers), attempt.google_response_id]
            );
          }
        }
      }
      
      await client.query('COMMIT');
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

    // 3. Re-generate/Update the Google Sheet
    await getOrCreateQuizResultsSheet(req, res);
    
    // getOrCreateQuizResultsSheet already sends the response
  } catch (error) {
    console.error('Error evaluating quiz results:', error);
    res.status(500).json({ error: error.message || 'Failed to evaluate quiz results' });
  }
}`;

const newDelete = `export async function deleteQuizAttemptByTeacher(req, res) {
  try {
    const { attemptId } = req.params;
    if (isNaN(Number(attemptId))) {
      return res.status(400).json({ error: 'Invalid attempt ID' });
    }

    // We use soft-delete so that sync doesn't immediately bring back the same response
    await pool.query('UPDATE quiz_attempts SET deleted_at = NOW() WHERE id = $1', [attemptId]);
    res.json({ success: true, message: 'Attempt deleted successfully. Student can now reattempt.' });
  } catch (error) {
    console.error('Error deleting quiz attempt:', error);
    res.status(500).json({ error: error.message || 'Failed to delete attempt' });
  }
}`;

content = content.replace(evaluateRegex, newEval);
content = content.replace(deleteRegex, newDelete);

fs.writeFileSync(filePath, content);
console.log('File updated successfully via regex');
