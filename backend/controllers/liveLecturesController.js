import { pool } from '../db/index.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new live lecture
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function createLiveLecture(req, res) {
  try {
    const { title, description, course_offering_id, scheduled_at } = req.body;
    const createdBy = req.user.id;

    // Validate required fields
    if (!title || !course_offering_id) {
      return res.status(400).json({ error: "Title and course_offering_id are required" });
    }

    // Verify user has permission to create lectures for this course
    const courseCheck = await pool.query(
      'SELECT id FROM course_offerings WHERE id = $1 AND faculty_id = $2',
      [course_offering_id, createdBy]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to create lectures for this course' });
    }

    // Generate unique stream key
    const streamKey = uuidv4();

    const insertQuery = `
      INSERT INTO live_lectures (title, description, course_offering_id, created_by, scheduled_at, stream_key)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      title,
      description || null,
      course_offering_id,
      createdBy,
      scheduled_at || null,
      streamKey
    ]);

    res.status(201).json({
      success: true,
      message: "Live lecture created successfully",
      lecture: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating live lecture:', error);
    res.status(500).json({ error: 'Failed to create live lecture', message: error.message });
  }
}

/**
 * Get all live lectures for a course offering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getLiveLecturesByCourse(req, res) {
  try {
    const courseOfferingId = parseInt(req.params.courseOfferingId);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (isNaN(courseOfferingId)) {
      return res.status(400).json({ error: 'Invalid course offering ID' });
    }

    // Check access permission
    let hasAccess = false;
    if (userRole === 'faculty' || userRole === 'admin' || userRole === 'ta') {
      hasAccess = true;
    } else {
      const enrollmentCheck = await pool.query(
        'SELECT id FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
        [courseOfferingId, userId]
      );
      hasAccess = enrollmentCheck.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this course' });
    }

    const query = `
      SELECT
        ll.*,
        u.name as created_by_name,
        u.email as created_by_email,
        COUNT(llp.id) as participant_count
      FROM live_lectures ll
      JOIN users u ON ll.created_by = u.id
      LEFT JOIN live_lecture_participants llp ON ll.id = llp.live_lecture_id AND llp.left_at IS NULL
      WHERE ll.course_offering_id = $1
      GROUP BY ll.id, u.name, u.email
      ORDER BY ll.scheduled_at DESC NULLS LAST, ll.created_at DESC
    `;

    const result = await pool.query(query, [courseOfferingId]);
    res.json({ lectures: result.rows });
  } catch (error) {
    logger.error('Error fetching live lectures:', error);
    res.status(500).json({ error: 'Failed to fetch live lectures', message: error.message });
  }
}

/**
 * Get a single live lecture by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getLiveLectureById(req, res) {
  try {
    const lectureId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    const query = `
      SELECT
        ll.*,
        u.name as created_by_name,
        u.email as created_by_email,
        co.course_id,
        c.code as course_code,
        c.title as course_title
      FROM live_lectures ll
      JOIN users u ON ll.created_by = u.id
      JOIN course_offerings co ON ll.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE ll.id = $1
    `;

    const result = await pool.query(query, [lectureId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Live lecture not found' });
    }

    const lecture = result.rows[0];

    // Check access permission
    let hasAccess = false;
    if (userRole === 'faculty' || userRole === 'admin' || userRole === 'ta') {
      hasAccess = true;
    } else {
      const enrollmentCheck = await pool.query(
        'SELECT id FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
        [lecture.course_offering_id, userId]
      );
      hasAccess = enrollmentCheck.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this lecture' });
    }

    res.json({ lecture });
  } catch (error) {
    logger.error('Error fetching live lecture:', error);
    res.status(500).json({ error: 'Failed to fetch live lecture', message: error.message });
  }
}

/**
 * Start a live lecture
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function startLiveLecture(req, res) {
  try {
    const lectureId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    // Check if user is the creator
    const lectureCheck = await pool.query(
      'SELECT id, status FROM live_lectures WHERE id = $1 AND created_by = $2',
      [lectureId, userId]
    );

    if (lectureCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to start this lecture' });
    }

    if (lectureCheck.rows[0].status !== 'scheduled') {
      return res.status(400).json({ error: 'Lecture is not in scheduled status' });
    }

    const updateQuery = `
      UPDATE live_lectures
      SET status = 'live', started_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [lectureId]);

    // Emit socket event to notify participants
    const io = req.app.get('io');
    if (io) {
      io.to(`lecture-${lectureId}`).emit('lecture-started', {
        lectureId,
        started_at: result.rows[0].started_at
      });
    }

    res.json({
      success: true,
      message: 'Live lecture started successfully',
      lecture: result.rows[0]
    });
  } catch (error) {
    logger.error('Error starting live lecture:', error);
    res.status(500).json({ error: 'Failed to start live lecture', message: error.message });
  }
}

/**
 * End a live lecture
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function endLiveLecture(req, res) {
  try {
    const lectureId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    // Check if user is the creator
    const lectureCheck = await pool.query(
      'SELECT id, status FROM live_lectures WHERE id = $1 AND created_by = $2',
      [lectureId, userId]
    );

    if (lectureCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to end this lecture' });
    }

    if (lectureCheck.rows[0].status !== 'live') {
      return res.status(400).json({ error: 'Lecture is not currently live' });
    }

    const updateQuery = `
      UPDATE live_lectures
      SET status = 'ended', ended_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [lectureId]);

    // Emit socket event to notify participants
    const io = req.app.get('io');
    if (io) {
      io.to(`lecture-${lectureId}`).emit('lecture-ended', {
        lectureId,
        ended_at: result.rows[0].ended_at
      });
    }

    res.json({
      success: true,
      message: 'Live lecture ended successfully',
      lecture: result.rows[0]
    });
  } catch (error) {
    logger.error('Error ending live lecture:', error);
    res.status(500).json({ error: 'Failed to end live lecture', message: error.message });
  }
}

/**
 * Join a live lecture (add participant)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function joinLiveLecture(req, res) {
  try {
    const lectureId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    // Check if lecture exists and is live
    const lectureCheck = await pool.query(
      'SELECT id, status, course_offering_id FROM live_lectures WHERE id = $1',
      [lectureId]
    );

    if (lectureCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Live lecture not found' });
    }

    const lecture = lectureCheck.rows[0];
    if (lecture.status !== 'live') {
      return res.status(400).json({ error: 'Lecture is not currently live' });
    }

    // Check access permission
    let hasAccess = false;
    let role = 'student';
    if (userRole === 'faculty' || userRole === 'admin' || userRole === 'ta') {
      hasAccess = true;
      // Normalize role for database constraint
      role = userRole === 'faculty' ? 'teacher' : userRole;
    } else {
      const enrollmentCheck = await pool.query(
        'SELECT id FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
        [lecture.course_offering_id, userId]
      );
      hasAccess = enrollmentCheck.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this lecture' });
    }

    // Add or update participant
    const upsertQuery = `
      INSERT INTO live_lecture_participants (live_lecture_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (live_lecture_id, user_id)
      DO UPDATE SET
        joined_at = NOW(),
        left_at = NULL,
        role = EXCLUDED.role
      RETURNING *
    `;

    const result = await pool.query(upsertQuery, [lectureId, userId, role]);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`lecture-${lectureId}`).emit('participant-joined', {
        lectureId,
        userId,
        role,
        joined_at: result.rows[0].joined_at
      });
    }

    res.json({
      success: true,
      message: 'Joined live lecture successfully',
      participant: result.rows[0]
    });
  } catch (error) {
    logger.error('Error joining live lecture:', error);
    res.status(500).json({ error: 'Failed to join live lecture', message: error.message });
  }
}

/**
 * Leave a live lecture (update participant)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function leaveLiveLecture(req, res) {
  try {
    const lectureId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    const updateQuery = `
      UPDATE live_lecture_participants
      SET left_at = NOW()
      WHERE live_lecture_id = $1 AND user_id = $2 AND left_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [lectureId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Participant record not found' });
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`lecture-${lectureId}`).emit('participant-left', {
        lectureId,
        userId,
        left_at: result.rows[0].left_at
      });
    }

    res.json({
      success: true,
      message: 'Left live lecture successfully',
      participant: result.rows[0]
    });
  } catch (error) {
    logger.error('Error leaving live lecture:', error);
    res.status(500).json({ error: 'Failed to leave live lecture', message: error.message });
  }
}

/**
 * Get participants for a live lecture
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getLiveLectureParticipants(req, res) {
  try {
    const lectureId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    // Check if user has access to view participants
    let hasAccess = false;
    if (userRole === 'faculty' || userRole === 'admin' || userRole === 'ta') {
      hasAccess = true;
    } else {
      // For students, check if they are enrolled in the course offering
      const enrollmentCheck = await pool.query(`
        SELECT e.id FROM enrollments e
        JOIN live_lectures ll ON ll.course_offering_id = e.course_offering_id
        WHERE ll.id = $1 AND e.student_id = $2
      `, [lectureId, userId]);
      hasAccess = enrollmentCheck.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to view participants' });
    }

    const query = `
      SELECT
        llp.*,
        u.name,
        u.email,
        u.role as user_role
      FROM live_lecture_participants llp
      JOIN users u ON llp.user_id = u.id
      WHERE llp.live_lecture_id = $1 AND llp.left_at IS NULL
      ORDER BY llp.joined_at ASC
    `;

    const result = await pool.query(query, [lectureId]);
    res.json({ participants: result.rows });
  } catch (error) {
    logger.error('Error fetching live lecture participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants', message: error.message });
  }
}