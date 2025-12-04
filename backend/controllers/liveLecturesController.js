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

    // Validate scheduled_at format if provided
    if (scheduled_at) {
      const scheduledDate = new Date(scheduled_at);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ error: "Invalid scheduled_at format. Use ISO 8601 date-time string." });
      }

      // Check if scheduled time is not in the past
      const now = new Date();
      if (scheduledDate <= now) {
        return res.status(400).json({ error: "scheduled_at must be in the future" });
      }
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
    if (userRole === 'admin') {
      hasAccess = true; // Admins can access all courses
    } else if (userRole === 'faculty' || userRole === 'ta') {
      // Teachers/TAs can only access courses they teach/are assigned to
      const teachingCheck = await pool.query(
        'SELECT id FROM course_offerings WHERE id = $1 AND faculty_id = $2',
        [courseOfferingId, userId]
      );
      hasAccess = teachingCheck.rows.length > 0;
    } else {
      // Students can only access courses they're enrolled in
      const enrollmentCheck = await pool.query(
        'SELECT id FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
        [courseOfferingId, userId]
      );
      hasAccess = enrollmentCheck.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this course' });
    }

    // Build query based on user role
    let whereClause = 'll.course_offering_id = $1';

    // All users can see all lectures (live, scheduled, ended, cancelled)
    // No status filtering needed

    const query = `
      SELECT
        ll.*,
        u.name as created_by_name,
        u.email as created_by_email,
        COUNT(llp.id) as participant_count
      FROM live_lectures ll
      JOIN users u ON ll.created_by = u.id
      LEFT JOIN live_lecture_participants llp ON ll.id = llp.live_lecture_id AND llp.left_at IS NULL
      WHERE ${whereClause}
      GROUP BY ll.id, u.name, u.email
      ORDER BY
        CASE
          WHEN ll.status = 'live' THEN 1
          WHEN ll.status = 'scheduled' THEN 2
          ELSE 3
        END,
        ll.scheduled_at DESC NULLS LAST,
        ll.created_at DESC
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
    if (userRole === 'admin') {
      hasAccess = true; // Admins can access all courses
    } else if (userRole === 'faculty' || userRole === 'ta') {
      // Teachers/TAs can only access courses they teach/are assigned to
      const teachingCheck = await pool.query(
        'SELECT id FROM course_offerings WHERE id = $1 AND faculty_id = $2',
        [lecture.course_offering_id, userId]
      );
      hasAccess = teachingCheck.rows.length > 0;
    } else {
      // Students can only access courses they're enrolled in
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

    console.log(`User ${userId} (${userRole}) attempting to join lecture ${lectureId}`);

    if (isNaN(lectureId)) {
      console.log('Invalid lecture ID provided');
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    // Check if lecture exists and is live
    console.log(`Checking if lecture ${lectureId} exists and is live`);
    const lectureCheck = await pool.query(
      'SELECT id, status, course_offering_id FROM live_lectures WHERE id = $1',
      [lectureId]
    );

    console.log(`Lecture check result:`, lectureCheck.rows);

    if (lectureCheck.rows.length === 0) {
      console.log(`Lecture ${lectureId} not found`);
      return res.status(404).json({ error: 'Live lecture not found' });
    }

    const lecture = lectureCheck.rows[0];
    console.log(`Lecture status: ${lecture.status}`);

    // Allow joining if lecture is live OR scheduled (users can wait for it to start)
    if (lecture.status !== 'live' && lecture.status !== 'scheduled') {
      console.log(`Cannot join lecture with status: ${lecture.status}`);
      return res.status(400).json({ error: `Cannot join lecture with status: ${lecture.status}` });
    }

    // Check access permission and normalize role
    console.log(`Checking access permissions for user role: ${userRole}`);
    let hasAccess = false;
    let normalizedRole = 'student';

    if (userRole === 'admin') {
      hasAccess = true;
      normalizedRole = 'teacher'; // Admins are treated as teachers
      console.log(`Admin granted access, normalized role: ${normalizedRole}`);
    } else if (userRole === 'faculty' || userRole === 'ta') {
      // Teachers/TAs can only access courses they teach/are assigned to
      const teachingCheck = await pool.query(
        'SELECT id FROM course_offerings WHERE id = $1 AND faculty_id = $2',
        [lecture.course_offering_id, userId]
      );
      hasAccess = teachingCheck.rows.length > 0;
      // Normalize role for database constraint (only allows 'student', 'teacher', 'ta')
      if (userRole === 'faculty') {
        normalizedRole = 'teacher';
      } else if (userRole === 'ta') {
        normalizedRole = 'ta';
      }
      console.log(`Staff user ${hasAccess ? 'granted' : 'denied'} access, normalized role: ${normalizedRole}`);
    } else if (userRole === 'student') {
      console.log(`Checking student enrollment in course ${lecture.course_offering_id}`);
      const enrollmentCheck = await pool.query(
        'SELECT id FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
        [lecture.course_offering_id, userId]
      );
      hasAccess = enrollmentCheck.rows.length > 0;
      normalizedRole = 'student';
      console.log(`Student enrollment check: ${hasAccess ? 'enrolled' : 'not enrolled'}`);
    } else {
      // Unknown role, deny access
      console.log(`Unknown user role: ${userRole}, denying access`);
      hasAccess = false;
    }

    if (!hasAccess) {
      console.log('Access denied');
      return res.status(403).json({ error: 'You do not have access to this lecture' });
    }

    // Add or update participant with initial media states
    console.log(`Inserting participant record for user ${userId} in lecture ${lectureId}`);
    const upsertQuery = `
      INSERT INTO live_lecture_participants (
        live_lecture_id, user_id, role, is_muted, is_video_off, is_hand_raised, is_screen_sharing, last_activity
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (live_lecture_id, user_id)
      DO UPDATE SET
        joined_at = NOW(),
        left_at = NULL,
        role = EXCLUDED.role,
        last_activity = NOW()
      RETURNING *
    `;

    // Default states: muted and video off for privacy
    const result = await pool.query(upsertQuery, [
      lectureId,
      userId,
      normalizedRole,
      true,  // is_muted
      true,  // is_video_off
      false, // is_hand_raised
      false  // is_screen_sharing
    ]);

    console.log(`Participant record inserted/updated successfully:`, result.rows[0]);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`lecture-${lectureId}`).emit('participant-joined', {
        lectureId,
        userId,
        role: normalizedRole,
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
 * Clean up orphaned or inactive participants
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function cleanupLiveLectureParticipants(req, res) {
  try {
    const lectureId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    // Only allow teachers/admins to perform cleanup
    if (userRole !== 'faculty' && userRole !== 'admin' && userRole !== 'ta') {
      return res.status(403).json({ error: 'Only instructors can perform participant cleanup' });
    }

    // Check if user has permission for this lecture
    const lectureCheck = await pool.query(
      'SELECT id FROM live_lectures WHERE id = $1 AND created_by = $2',
      [lectureId, userId]
    );

    if (lectureCheck.rows.length === 0 && userRole !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to manage this lecture' });
    }

    // Clean up participants who have been inactive for more than 5 minutes
    // or have invalid states
    const cleanupQuery = `
      UPDATE live_lecture_participants
      SET left_at = NOW()
      WHERE live_lecture_id = $1
        AND left_at IS NULL
        AND (
          last_activity < NOW() - INTERVAL '5 minutes'
          OR user_id NOT IN (SELECT id FROM users)
        )
    `;

    const result = await pool.query(cleanupQuery, [lectureId]);

    logger.info(`Cleaned up ${result.rowCount} orphaned participants for lecture ${lectureId}`);

    res.json({
      success: true,
      message: `Cleaned up ${result.rowCount} orphaned participants`,
      cleanedCount: result.rowCount
    });
  } catch (error) {
    logger.error('Error cleaning up participants:', error);
    res.status(500).json({ error: 'Failed to cleanup participants', message: error.message });
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
    if (userRole === 'admin') {
      hasAccess = true; // Admins can access all courses
    } else if (userRole === 'faculty' || userRole === 'ta') {
      // Teachers/TAs can only access courses they teach/are assigned to
      const teachingCheck = await pool.query(`
        SELECT co.id FROM course_offerings co
        JOIN live_lectures ll ON ll.course_offering_id = co.id
        WHERE ll.id = $1 AND co.faculty_id = $2
      `, [lectureId, userId]);
      hasAccess = teachingCheck.rows.length > 0;
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

    // First, clean up any orphaned participants
    await pool.query(`
      UPDATE live_lecture_participants
      SET left_at = NOW()
      WHERE live_lecture_id = $1
        AND left_at IS NULL
        AND last_activity < NOW() - INTERVAL '10 minutes'
    `, [lectureId]);

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