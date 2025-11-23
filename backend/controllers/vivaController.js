import { pool } from '../db/index.js';

export async function createVivaSession(req, res) {
  const { courseOfferingId, title, description, scheduledAt, durationMinutes, maxStudents, participants } = req.body;
  const createdBy = req.user.id;

  try {
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create viva session
      const sessionQuery = `
        INSERT INTO viva_sessions (course_offering_id, title, description, scheduled_at, duration_minutes, max_students, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const sessionResult = await client.query(sessionQuery, [
        courseOfferingId, title, description, scheduledAt, durationMinutes || 30, maxStudents || 1, createdBy
      ]);
      const session = sessionResult.rows[0];

      // Add participants if provided
      if (participants && participants.length > 0) {
        const participantValues = participants.map((p, index) =>
          `(${session.id}, ${p.studentId}, ${index + 1})`
        ).join(', ');
        const participantQuery = `
          INSERT INTO viva_participants (viva_session_id, student_id, scheduled_order)
          VALUES ${participantValues}
        `;
        await client.query(participantQuery);
      }

      await client.query('COMMIT');
      res.json({ session, message: 'Viva session created successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating viva session:', error);
    res.status(500).json({ error: 'Failed to create viva session' });
  }
}

export async function getVivaSessions(req, res) {
  const { courseOfferingId } = req.query;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let query = `
      SELECT vs.*, co.course_code, co.course_title,
             COUNT(vp.id) as participant_count,
             COUNT(CASE WHEN vp.status = 'completed' THEN 1 END) as completed_count
      FROM viva_sessions vs
      JOIN course_offerings co ON vs.course_offering_id = co.id
    `;
    let params = [];
    let whereConditions = [];

    if (courseOfferingId) {
      whereConditions.push(`vs.course_offering_id = $${params.length + 1}`);
      params.push(courseOfferingId);
    }

    // If not admin/faculty, only show sessions for courses where user is TA
    if (userRole === 'ta') {
      query += `
        JOIN ta_assignments ta ON ta.course_offering_id = vs.course_offering_id
        WHERE ta.ta_id = $${params.length + 1}
      `;
      params.push(userId);
    } else if (userRole === 'faculty') {
      whereConditions.push(`co.faculty_id = $${params.length + 1}`);
      params.push(userId);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += `
      GROUP BY vs.id, co.course_code, co.course_title
      ORDER BY vs.scheduled_at DESC
    `;

    const result = await pool.query(query, params);
    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Error fetching viva sessions:', error);
    res.status(500).json({ error: 'Failed to fetch viva sessions' });
  }
}

export async function getVivaSessionDetails(req, res) {
  const { id } = req.params;

  try {
    // Get session details
    const sessionQuery = `
      SELECT vs.*, co.course_code, co.course_title, co.term, co.section,
             u.name as created_by_name
      FROM viva_sessions vs
      JOIN course_offerings co ON vs.course_offering_id = co.id
      LEFT JOIN users u ON vs.created_by = u.id
      WHERE vs.id = $1
    `;
    const sessionResult = await pool.query(sessionQuery, [id]);
    const session = sessionResult.rows[0];

    if (!session) {
      return res.status(404).json({ error: 'Viva session not found' });
    }

    // Get participants
    const participantsQuery = `
      SELECT vp.*, u.name as student_name, u.email as student_email,
             vg.score, vg.feedback, vg.graded_at,
             gu.name as grader_name
      FROM viva_participants vp
      JOIN users u ON vp.student_id = u.id
      LEFT JOIN viva_grades vg ON vp.id = vg.viva_participant_id
      LEFT JOIN users gu ON vg.grader_id = gu.id
      WHERE vp.viva_session_id = $1
      ORDER BY vp.scheduled_order
    `;
    const participantsResult = await pool.query(participantsQuery, [id]);

    res.json({
      session,
      participants: participantsResult.rows
    });
  } catch (error) {
    console.error('Error fetching viva session details:', error);
    res.status(500).json({ error: 'Failed to fetch viva session details' });
  }
}

export async function gradeVivaParticipant(req, res) {
  const { participantId, score, feedback } = req.body;
  const graderId = req.user.id;

  try {
    const query = `
      INSERT INTO viva_grades (viva_participant_id, grader_id, score, feedback)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (viva_participant_id, grader_id)
      DO UPDATE SET score = EXCLUDED.score, feedback = EXCLUDED.feedback, graded_at = now()
      RETURNING *
    `;
    const result = await pool.query(query, [participantId, graderId, score, feedback]);
    res.json({ grade: result.rows[0], message: 'Viva graded successfully' });
  } catch (error) {
    console.error('Error grading viva participant:', error);
    res.status(500).json({ error: 'Failed to grade viva participant' });
  }
}

export async function updateVivaParticipantStatus(req, res) {
  const { participantId, status, notes } = req.body;

  try {
    const query = `
      UPDATE viva_participants
      SET status = $1, notes = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [status, notes, participantId]);
    res.json({ participant: result.rows[0], message: 'Participant status updated successfully' });
  } catch (error) {
    console.error('Error updating viva participant status:', error);
    res.status(500).json({ error: 'Failed to update participant status' });
  }
}