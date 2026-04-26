import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/index.js';
import { getAuthenticatedClient } from './googleController.js';
import { logger } from '../utils/logger.js';

const DEFAULT_LECTURE_DURATION_MINUTES = 60;

function normalizeStaffRole(role) {
  if (role === 'faculty' || role === 'admin') {
    return 'teacher';
  }
  if (role === 'ta') {
    return 'ta';
  }
  return 'student';
}

function getMeetUrlFromEvent(event) {
  if (event?.hangoutLink) {
    return event.hangoutLink;
  }

  const entryPoint = event?.conferenceData?.entryPoints?.find(point => point.entryPointType === 'video');
  return entryPoint?.uri || null;
}

function buildEndedLectureStats(participants) {
  const totalParticipants = participants.length;
  const participantDurationsMinutes = participants.map(participant => {
    if (!participant.joined_at) {
      return 0;
    }

    const joinedAt = new Date(participant.joined_at).getTime();
    const leftAt = participant.left_at ? new Date(participant.left_at).getTime() : Date.now();
    return Math.max(0, Math.round((leftAt - joinedAt) / 60000));
  });

  const totalAttendanceMinutes = participantDurationsMinutes.reduce((sum, value) => sum + value, 0);
  const averageAttendanceMinutes =
    totalParticipants > 0 ? Math.round(totalAttendanceMinutes / totalParticipants) : 0;

  return {
    total_participants: totalParticipants,
    active_participants: participants.filter(participant => !participant.left_at).length,
    total_attendance_minutes: totalAttendanceMinutes,
    average_attendance_minutes: averageAttendanceMinutes,
  };
}

async function getLectureAccessContext(lectureId, userId, userRole) {
  const lectureResult = await pool.query(
    `
      SELECT
        ll.*,
        co.faculty_id,
        co.course_id,
        c.code AS course_code,
        c.title AS course_title,
        u.name AS created_by_name,
        u.email AS created_by_email
      FROM live_lectures ll
      JOIN course_offerings co ON ll.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN users u ON ll.created_by = u.id
      WHERE ll.id = $1
    `,
    [lectureId]
  );

  if (lectureResult.rows.length === 0) {
    return { found: false, lecture: null, hasAccess: false };
  }

  const lecture = lectureResult.rows[0];
  let hasAccess = false;

  if (userRole === 'admin') {
    hasAccess = true;
  } else if (userRole === 'faculty' || userRole === 'ta') {
    const teachingCheck = await pool.query(
      'SELECT id FROM course_offerings WHERE id = $1 AND faculty_id = $2',
      [lecture.course_offering_id, userId]
    );
    hasAccess = teachingCheck.rows.length > 0;
  } else {
    const enrollmentCheck = await pool.query(
      'SELECT id FROM enrollments WHERE course_offering_id = $1 AND student_id = $2',
      [lecture.course_offering_id, userId]
    );
    hasAccess = enrollmentCheck.rows.length > 0;
  }

  return { found: true, lecture, hasAccess };
}

async function getLectureParticipantsWithStats(lectureId, includeHistory = false) {
  const participantsResult = await pool.query(
    `
      SELECT
        llp.id,
        llp.live_lecture_id,
        llp.user_id,
        llp.role,
        llp.joined_at,
        llp.left_at,
        llp.is_muted,
        llp.is_video_off,
        llp.is_hand_raised,
        llp.is_screen_sharing,
        llp.last_activity,
        u.name,
        u.email,
        ROUND(EXTRACT(EPOCH FROM (COALESCE(llp.left_at, NOW()) - llp.joined_at)) / 60.0) AS attendance_minutes
      FROM live_lecture_participants llp
      JOIN users u ON u.id = llp.user_id
      WHERE llp.live_lecture_id = $1
        AND ($2::boolean = true OR llp.left_at IS NULL)
      ORDER BY llp.joined_at ASC
    `,
    [lectureId, includeHistory]
  );

  const participants = participantsResult.rows.map(participant => ({
    ...participant,
    attendance_minutes: Number(participant.attendance_minutes || 0),
  }));

  return {
    participants,
    stats: buildEndedLectureStats(participants),
  };
}

async function getCourseAttendees(courseOfferingId) {
  const attendeeResult = await pool.query(
    `
      SELECT DISTINCT u.email, u.name
      FROM enrollments e
      JOIN users u ON u.id = e.student_id
      WHERE e.course_offering_id = $1
        AND u.email IS NOT NULL
        AND TRIM(u.email) <> ''
      ORDER BY u.name ASC, u.email ASC
    `,
    [courseOfferingId]
  );

  return attendeeResult.rows.map(row => ({
    email: row.email,
    displayName: row.name || row.email,
  }));
}

async function createGoogleMeetEvent({
  creatorId,
  title,
  description,
  scheduledAt,
  durationMinutes,
  attendees,
  courseCode,
  courseTitle,
}) {
  const auth = await getAuthenticatedClient(creatorId);
  const calendar = google.calendar({ version: 'v3', auth });
  const startDate = new Date(scheduledAt);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const event = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: attendees.length > 0 ? 'all' : 'none',
    requestBody: {
      summary: title,
      description: description || `Live lecture for ${courseCode} - ${courseTitle}`,
      start: {
        dateTime: startDate.toISOString(),
      },
      end: {
        dateTime: endDate.toISOString(),
      },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
      guestsCanSeeOtherGuests: true,
    },
  });

  const meetingUrl = getMeetUrlFromEvent(event.data);
  if (!meetingUrl) {
    throw new Error('Google Meet link was not returned by Google Calendar');
  }

  return {
    meetingUrl,
    calendarEventId: event.data.id || null,
    calendarEventUrl: event.data.htmlLink || null,
  };
}

async function tryUpdateGoogleCalendarEventEnd(lecture, userId) {
  if (!lecture.google_calendar_event_id) {
    return;
  }

  try {
    const auth = await getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.patch({
      calendarId: 'primary',
      eventId: lecture.google_calendar_event_id,
      sendUpdates: 'all',
      requestBody: {
        end: {
          dateTime: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    logger.warn('Failed to update Google Calendar event end time for lecture', {
      lectureId: lecture.id,
      message: error.message,
    });
  }
}

/**
 * Create a new live lecture and schedule a Google Meet event.
 */
export async function createLiveLecture(req, res) {
  try {
    const { title, description, course_offering_id, scheduled_at, duration_minutes } = req.body;
    const createdBy = req.user.id;

    if (!title || !course_offering_id || !scheduled_at) {
      return res.status(400).json({
        error: 'title, course_offering_id, and scheduled_at are required',
      });
    }

    const scheduledDate = new Date(scheduled_at);
    if (Number.isNaN(scheduledDate.getTime())) {
      return res
        .status(400)
        .json({ error: 'Invalid scheduled_at format. Use ISO 8601 date-time string.' });
    }

    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'scheduled_at must be in the future' });
    }

    const courseCheck = await pool.query(
      `
        SELECT co.id, c.code, c.title
        FROM course_offerings co
        JOIN courses c ON c.id = co.course_id
        WHERE co.id = $1 AND co.faculty_id = $2
      `,
      [course_offering_id, createdBy]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'You do not have permission to create lectures for this course',
      });
    }

    const durationMinutes = Math.max(
      15,
      Number.parseInt(String(duration_minutes || DEFAULT_LECTURE_DURATION_MINUTES), 10) ||
        DEFAULT_LECTURE_DURATION_MINUTES
    );
    const course = courseCheck.rows[0];
    const attendees = await getCourseAttendees(course_offering_id);

    let googleEvent;
    try {
      googleEvent = await createGoogleMeetEvent({
        creatorId: createdBy,
        title: title.trim(),
        description: description?.trim(),
        scheduledAt: scheduledDate.toISOString(),
        durationMinutes,
        attendees,
        courseCode: course.code,
        courseTitle: course.title,
      });
    } catch (error) {
      const message = error?.message || 'Failed to schedule Google Meet';
      const needsReconnect =
        message.toLowerCase().includes('insufficient') ||
        message.toLowerCase().includes('scope') ||
        message.toLowerCase().includes('google not connected');

      return res.status(400).json({
        error: needsReconnect
          ? 'Google Calendar is not connected with Meet scheduling access. Reconnect Google and try again.'
          : message,
      });
    }

    const result = await pool.query(
      `
        INSERT INTO live_lectures (
          title,
          description,
          course_offering_id,
          created_by,
          scheduled_at,
          stream_key,
          meeting_url,
          google_calendar_event_id,
          google_calendar_event_url,
          invite_sent_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `,
      [
        title.trim(),
        description?.trim() || null,
        course_offering_id,
        createdBy,
        scheduledDate.toISOString(),
        uuidv4(),
        googleEvent.meetingUrl,
        googleEvent.calendarEventId,
        googleEvent.calendarEventUrl,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Live lecture scheduled successfully',
      lecture: {
        ...result.rows[0],
        invitee_count: attendees.length,
      },
    });
  } catch (error) {
    logger.error('Error creating live lecture:', error);
    res.status(500).json({ error: 'Failed to create live lecture', message: error.message });
  }
}

/**
 * Get all live lectures for a course offering.
 */
export async function getLiveLecturesByCourse(req, res) {
  try {
    const courseOfferingId = Number.parseInt(req.params.courseOfferingId, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (Number.isNaN(courseOfferingId)) {
      return res.status(400).json({ error: 'Invalid course offering ID' });
    }

    let hasAccess = false;
    if (userRole === 'admin') {
      hasAccess = true;
    } else if (userRole === 'faculty' || userRole === 'ta') {
      const teachingCheck = await pool.query(
        'SELECT id FROM course_offerings WHERE id = $1 AND faculty_id = $2',
        [courseOfferingId, userId]
      );
      hasAccess = teachingCheck.rows.length > 0;
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

    const result = await pool.query(
      `
        SELECT
          ll.*,
          u.name AS created_by_name,
          u.email AS created_by_email,
          COUNT(llp.id) FILTER (WHERE llp.left_at IS NULL) AS active_participant_count,
          COUNT(llp.id) AS total_participant_count,
          COUNT(llp.id) FILTER (WHERE llp.role = 'student' AND llp.left_at IS NULL) AS active_student_count,
          COUNT(llp.id) FILTER (WHERE llp.role = 'student') AS total_student_count,
          COALESCE(
            ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(llp.left_at, NOW()) - llp.joined_at)) / 60.0)),
            0
          ) AS average_attendance_minutes
        FROM live_lectures ll
        JOIN users u ON u.id = ll.created_by
        LEFT JOIN live_lecture_participants llp ON llp.live_lecture_id = ll.id
        WHERE ll.course_offering_id = $1
        GROUP BY ll.id, u.name, u.email
        ORDER BY
          CASE
            WHEN ll.status = 'live' THEN 1
            WHEN ll.status = 'scheduled' THEN 2
            ELSE 3
          END,
          ll.scheduled_at ASC NULLS LAST,
          ll.created_at DESC
      `,
      [courseOfferingId]
    );

    const lectures = result.rows.map(row => ({
      ...row,
      active_participant_count: Number(row.active_participant_count || 0),
      total_participant_count: Number(row.total_participant_count || 0),
      active_student_count: Number(row.active_student_count || 0),
      total_student_count: Number(row.total_student_count || 0),
      average_attendance_minutes: Number(row.average_attendance_minutes || 0),
    }));

    res.json({ lectures });
  } catch (error) {
    logger.error('Error fetching live lectures:', error);
    res.status(500).json({ error: 'Failed to fetch live lectures', message: error.message });
  }
}

/**
 * Get a single live lecture by ID with participants and stats.
 */
export async function getLiveLectureById(req, res) {
  try {
    const lectureId = Number.parseInt(req.params.id, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (Number.isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    const access = await getLectureAccessContext(lectureId, userId, userRole);
    if (!access.found) {
      return res.status(404).json({ error: 'Live lecture not found' });
    }
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this lecture' });
    }

    const includeHistory = access.lecture.status === 'ended';
    const { participants, stats } = await getLectureParticipantsWithStats(lectureId, includeHistory);

    res.json({
      lecture: {
        ...access.lecture,
        active_participant_count: stats.active_participants,
        total_participant_count: stats.total_participants,
        average_attendance_minutes: stats.average_attendance_minutes,
        total_attendance_minutes: stats.total_attendance_minutes,
      },
      participants,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching live lecture:', error);
    res.status(500).json({ error: 'Failed to fetch live lecture', message: error.message });
  }
}

/**
 * Mark a scheduled lecture live.
 */
export async function startLiveLecture(req, res) {
  try {
    const lectureId = Number.parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (Number.isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    const lectureCheck = await pool.query(
      'SELECT id, status, meeting_url FROM live_lectures WHERE id = $1 AND created_by = $2',
      [lectureId, userId]
    );

    if (lectureCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to start this lecture' });
    }

    if (!lectureCheck.rows[0].meeting_url) {
      return res.status(400).json({ error: 'Lecture does not have a Google Meet link yet' });
    }

    if (lectureCheck.rows[0].status === 'ended') {
      return res.status(400).json({ error: 'Lecture has already ended' });
    }

    const result = await pool.query(
      `
        UPDATE live_lectures
        SET status = 'live', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [lectureId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`lecture-${lectureId}`).emit('lecture-started', {
        lectureId,
        started_at: result.rows[0].started_at,
      });
    }

    res.json({
      success: true,
      message: 'Live lecture started successfully',
      lecture: result.rows[0],
    });
  } catch (error) {
    logger.error('Error starting live lecture:', error);
    res.status(500).json({ error: 'Failed to start live lecture', message: error.message });
  }
}

/**
 * End a live lecture.
 */
export async function endLiveLecture(req, res) {
  try {
    const lectureId = Number.parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (Number.isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    const lectureCheck = await pool.query(
      'SELECT * FROM live_lectures WHERE id = $1 AND created_by = $2',
      [lectureId, userId]
    );

    if (lectureCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to end this lecture' });
    }

    if (lectureCheck.rows[0].status === 'ended') {
      return res.status(400).json({ error: 'Lecture is already ended' });
    }

    const result = await pool.query(
      `
        UPDATE live_lectures
        SET status = 'ended', ended_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [lectureId]
    );

    await pool.query(
      `
        UPDATE live_lecture_participants
        SET left_at = COALESCE(left_at, NOW())
        WHERE live_lecture_id = $1
      `,
      [lectureId]
    );

    await tryUpdateGoogleCalendarEventEnd(lectureCheck.rows[0], userId);

    const io = req.app.get('io');
    if (io) {
      io.to(`lecture-${lectureId}`).emit('lecture-ended', {
        lectureId,
        ended_at: result.rows[0].ended_at,
      });
    }

    res.json({
      success: true,
      message: 'Live lecture ended successfully',
      lecture: result.rows[0],
    });
  } catch (error) {
    logger.error('Error ending live lecture:', error);
    res.status(500).json({ error: 'Failed to end live lecture', message: error.message });
  }
}

/**
 * Join a live lecture and return the Google Meet URL.
 */
export async function joinLiveLecture(req, res) {
  try {
    const lectureId = Number.parseInt(req.params.id, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (Number.isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    const access = await getLectureAccessContext(lectureId, userId, userRole);
    if (!access.found) {
      return res.status(404).json({ error: 'Live lecture not found' });
    }
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this lecture' });
    }

    const lecture = access.lecture;
    if (lecture.status !== 'scheduled' && lecture.status !== 'live') {
      return res.status(400).json({ error: `Cannot join lecture with status: ${lecture.status}` });
    }

    if (!lecture.meeting_url) {
      return res.status(400).json({
        error: 'This lecture does not have a Google Meet link. Please contact the instructor.',
      });
    }

    const normalizedRole = normalizeStaffRole(userRole);
    const upsertResult = await pool.query(
      `
        INSERT INTO live_lecture_participants (
          live_lecture_id,
          user_id,
          role,
          is_muted,
          is_video_off,
          is_hand_raised,
          is_screen_sharing,
          last_activity
        )
        VALUES ($1, $2, $3, true, true, false, false, NOW())
        ON CONFLICT (live_lecture_id, user_id)
        DO UPDATE SET
          joined_at = NOW(),
          left_at = NULL,
          role = EXCLUDED.role,
          last_activity = NOW()
        RETURNING *
      `,
      [lectureId, userId, normalizedRole]
    );

    let updatedLecture = lecture;
    if (normalizedRole !== 'student' && lecture.status === 'scheduled') {
      const startResult = await pool.query(
        `
          UPDATE live_lectures
          SET status = 'live', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [lectureId]
      );
      updatedLecture = startResult.rows[0];
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`lecture-${lectureId}`).emit('participant-joined', {
        lectureId,
        userId,
        role: normalizedRole,
        joined_at: upsertResult.rows[0].joined_at,
      });
    }

    res.json({
      success: true,
      message: 'Joined live lecture successfully',
      meeting_url: updatedLecture.meeting_url,
      lecture: updatedLecture,
      participant: upsertResult.rows[0],
    });
  } catch (error) {
    logger.error('Error joining live lecture:', error);
    res.status(500).json({ error: 'Failed to join live lecture', message: error.message });
  }
}

/**
 * Leave a live lecture.
 */
export async function leaveLiveLecture(req, res) {
  try {
    const lectureId = Number.parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (Number.isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    const result = await pool.query(
      `
        UPDATE live_lecture_participants
        SET left_at = NOW(), last_activity = NOW()
        WHERE live_lecture_id = $1 AND user_id = $2 AND left_at IS NULL
        RETURNING *
      `,
      [lectureId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Participant record not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`lecture-${lectureId}`).emit('participant-left', {
        lectureId,
        userId,
        left_at: result.rows[0].left_at,
      });
    }

    res.json({
      success: true,
      message: 'Left live lecture successfully',
      participant: result.rows[0],
    });
  } catch (error) {
    logger.error('Error leaving live lecture:', error);
    res.status(500).json({ error: 'Failed to leave live lecture', message: error.message });
  }
}

/**
 * Clean up orphaned or inactive participants.
 */
export async function cleanupLiveLectureParticipants(req, res) {
  try {
    const lectureId = Number.parseInt(req.params.id, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (Number.isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    if (!['faculty', 'admin', 'ta'].includes(userRole)) {
      return res.status(403).json({ error: 'Only instructors can perform participant cleanup' });
    }

    const lectureCheck = await pool.query(
      'SELECT id FROM live_lectures WHERE id = $1 AND created_by = $2',
      [lectureId, userId]
    );

    if (lectureCheck.rows.length === 0 && userRole !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to manage this lecture' });
    }

    const result = await pool.query(
      `
        UPDATE live_lecture_participants
        SET left_at = NOW()
        WHERE live_lecture_id = $1
          AND left_at IS NULL
          AND (
            last_activity < NOW() - INTERVAL '5 minutes'
            OR user_id NOT IN (SELECT id FROM users)
          )
      `,
      [lectureId]
    );

    res.json({
      success: true,
      message: `Cleaned up ${result.rowCount} orphaned participants`,
      cleanedCount: result.rowCount,
    });
  } catch (error) {
    logger.error('Error cleaning up participants:', error);
    res.status(500).json({ error: 'Failed to cleanup participants', message: error.message });
  }
}

/**
 * Get participants and stats for a live lecture.
 */
export async function getLiveLectureParticipants(req, res) {
  try {
    const lectureId = Number.parseInt(req.params.id, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (Number.isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    const access = await getLectureAccessContext(lectureId, userId, userRole);
    if (!access.found) {
      return res.status(404).json({ error: 'Live lecture not found' });
    }
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to view participants' });
    }

    await pool.query(
      `
        UPDATE live_lecture_participants
        SET left_at = NOW()
        WHERE live_lecture_id = $1
          AND left_at IS NULL
          AND last_activity < NOW() - INTERVAL '10 minutes'
      `,
      [lectureId]
    );

    const includeHistory = access.lecture.status === 'ended';
    const { participants, stats } = await getLectureParticipantsWithStats(lectureId, includeHistory);

    res.json({ participants, stats });
  } catch (error) {
    logger.error('Error fetching live lecture participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants', message: error.message });
  }
}

/**
 * Return the existing Google Meet link for a lecture.
 */
export async function generateMeetLink(req, res) {
  try {
    const lectureId = Number.parseInt(req.params.id, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (Number.isNaN(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    const access = await getLectureAccessContext(lectureId, userId, userRole);
    if (!access.found) {
      return res.status(404).json({ error: 'Live lecture not found' });
    }
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this lecture' });
    }
    if (!access.lecture.meeting_url) {
      return res.status(400).json({ error: 'Meet link has not been scheduled for this lecture' });
    }

    res.json({
      success: true,
      meeting_url: access.lecture.meeting_url,
      google_calendar_event_url: access.lecture.google_calendar_event_url,
    });
  } catch (error) {
    logger.error('Error retrieving meet link:', error);
    res.status(500).json({ error: 'Failed to retrieve meet link', message: error.message });
  }
}
