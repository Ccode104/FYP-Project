import { pool } from '../db/index.js';

function clampPercentage(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, numeric));
}

function roundOne(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function buildStudentSupportLabels({ marksPct, consistencyPct, attendancePct, overallScore }) {
  const performanceLabel =
    marksPct >= 80 ? 'High scorer' : marksPct >= 60 ? 'Moderate scorer' : 'Low scorer';
  const consistencyLabel = consistencyPct >= 75 ? 'consistent' : 'inconsistent';
  const attendanceLabel =
    attendancePct >= 75 ? 'regular attendance' : attendancePct >= 50 ? 'uneven attendance' : 'low attendance';

  let profileLabel = `${performanceLabel} and ${consistencyLabel}`;
  if (performanceLabel === 'Low scorer' && consistencyPct >= 75) {
    profileLabel = 'Low scorer but consistent';
  } else if (performanceLabel === 'High scorer' && consistencyPct < 75) {
    profileLabel = 'High scorer but inconsistent';
  } else if (performanceLabel === 'Moderate scorer' && consistencyPct >= 75) {
    profileLabel = 'Moderate scorer and consistent';
  } else if (performanceLabel === 'Moderate scorer' && consistencyPct < 75) {
    profileLabel = 'Moderate scorer but inconsistent';
  }

  if (attendancePct < 50) {
    profileLabel = `${profileLabel} with low attendance`;
  } else if (attendancePct < 75) {
    profileLabel = `${profileLabel} with uneven attendance`;
  }

  const labels = [performanceLabel];
  labels.push(consistencyPct >= 75 ? 'Consistent' : 'Needs consistency support');
  labels.push(attendancePct >= 75 ? 'Regular attendance' : 'Attendance risk');

  let supportLevel = 'on_track';
  if (overallScore < 55 || marksPct < 50 || (consistencyPct < 60 && attendancePct < 60)) {
    supportLevel = 'high_priority';
  } else if (overallScore < 70 || marksPct < 65 || consistencyPct < 75 || attendancePct < 75) {
    supportLevel = 'watchlist';
  }

  return { performanceLabel, consistencyLabel, attendanceLabel, profileLabel, labels, supportLevel };
}

async function ensureOfferingAccess(user, offeringId) {
  if (!user?.id) return false;
  if (user.role === 'admin') return true;

  if (user.role === 'ta') {
    const taCheck = await pool.query(
      'SELECT 1 FROM ta_assignments WHERE course_offering_id = $1 AND ta_id = $2 LIMIT 1',
      [offeringId, user.id]
    );
    return taCheck.rows.length > 0;
  }

  const facultyCheck = await pool.query(
    'SELECT 1 FROM course_offerings WHERE id = $1 AND faculty_id = $2 LIMIT 1',
    [offeringId, user.id]
  );
  return facultyCheck.rows.length > 0;
}

function buildParams(studentId, offeringId) {
  const params = [studentId];
  const assignmentFilters = ['e.student_id = $1'];
  const quizFilters = ['e.student_id = $1'];

  if (offeringId) {
    params.push(offeringId);
    assignmentFilters.push(`co.id = $${params.length}`);
    quizFilters.push(`co.id = $${params.length}`);
  }

  return {
    params,
    assignmentWhere: assignmentFilters.join(' AND '),
    quizWhere: quizFilters.join(' AND ')
  };
}

async function fetchProgressRows(studentId, offeringId = null) {
  const { params, assignmentWhere, quizWhere } = buildParams(studentId, offeringId);

  const query = `
    SELECT
      co.id AS course_offering_id,
      c.code AS course_code,
      c.title AS course_title,
      co.term,
      co.section,
      e.student_id,
      u.name AS student_name,
      u.email AS student_email,
      'assignment'::text AS activity_type,
      a.id AS activity_id,
      a.title AS activity_title,
      a.max_score,
      s.final_score AS score,
      COALESCE(s.status, CASE WHEN s.id IS NULL THEN 'not_submitted' ELSE 'submitted' END) AS status,
      a.due_at,
      s.submitted_at
    FROM enrollments e
    JOIN users u ON u.id = e.student_id
    JOIN course_offerings co ON co.id = e.course_offering_id
    JOIN courses c ON c.id = co.course_id
    JOIN assignments a ON a.course_offering_id = co.id
    LEFT JOIN LATERAL (
      SELECT assignment_submissions.*
      FROM assignment_submissions
      WHERE assignment_submissions.assignment_id = a.id
        AND assignment_submissions.student_id = e.student_id
      ORDER BY assignment_submissions.attempt DESC NULLS LAST, assignment_submissions.submitted_at DESC NULLS LAST, assignment_submissions.id DESC
      LIMIT 1
    ) s ON true
    WHERE ${assignmentWhere}

    UNION ALL

    SELECT
      co.id AS course_offering_id,
      c.code AS course_code,
      c.title AS course_title,
      co.term,
      co.section,
      e.student_id,
      u.name AS student_name,
      u.email AS student_email,
      'quiz'::text AS activity_type,
      q.id AS activity_id,
      q.title AS activity_title,
      q.max_score,
      qa.score,
      CASE
        WHEN qa.id IS NULL THEN 'not_attempted'
        WHEN qa.finished_at IS NULL THEN 'in_progress'
        ELSE 'completed'
      END AS status,
      q.end_at AS due_at,
      qa.finished_at AS submitted_at
    FROM enrollments e
    JOIN users u ON u.id = e.student_id
    JOIN course_offerings co ON co.id = e.course_offering_id
    JOIN courses c ON c.id = co.course_id
    JOIN quizzes q ON q.course_offering_id = co.id
    LEFT JOIN LATERAL (
      SELECT quiz_attempts.*
      FROM quiz_attempts
      WHERE quiz_attempts.quiz_id = q.id
        AND quiz_attempts.student_id = e.student_id
      ORDER BY quiz_attempts.finished_at DESC NULLS LAST, quiz_attempts.started_at DESC NULLS LAST, quiz_attempts.id DESC
      LIMIT 1
    ) qa ON true
    WHERE ${quizWhere}

    ORDER BY course_offering_id, activity_type, activity_id
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * GET /api/progress/me
 * Returns the combined assignment + quiz progress for the authenticated student
 */
export async function getMyProgress(req, res) {
  try {
    if (!req.user) {return res.status(401).json({ error: 'Unauthorized' });}
    const studentId = Number(req.user.id);
    if (!studentId) {return res.status(400).json({ error: 'Invalid student id' });}

    const rows = await fetchProgressRows(studentId);
    return res.json({ rows });
  } catch (err) {
    console.error('getMyProgress error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/progress/course/:offeringId
 * Returns progress for all students in a course offering
 * Access: faculty, ta, admin (enforced in route)
 */
export async function getByCourseOffering(req, res) {
  try {
    const offeringId = parseInt(req.params.offeringId, 10);
    if (Number.isNaN(offeringId)) {return res.status(400).json({ error: 'Invalid offering id' });}

    const hasAccess = await ensureOfferingAccess(req.user, offeringId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this course offering' });
    }

    const students = await pool.query(
      `SELECT DISTINCT student_id
       FROM enrollments
       WHERE course_offering_id = $1
       ORDER BY student_id`,
      [offeringId]
    );

    const allRows = [];
    for (const row of students.rows) {
      const progressRows = await fetchProgressRows(Number(row.student_id), offeringId);
      allRows.push(...progressRows);
    }

    return res.json({ rows: allRows });
  } catch (err) {
    console.error('getByCourseOffering error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/progress/student/:studentId
 * Returns progress for a specific student. Optionally filter by course_offering_id ?course_offering_id=123
 * Access: faculty, ta, admin (enforced in route)
 */
export async function getByStudent(req, res) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    if (Number.isNaN(studentId)) {return res.status(400).json({ error: 'Invalid student id' });}

    const courseOfferingId = req.query.course_offering_id ? parseInt(req.query.course_offering_id, 10) : null;
    const offeringId = courseOfferingId && !Number.isNaN(courseOfferingId) ? courseOfferingId : null;

    if (offeringId) {
      const hasAccess = await ensureOfferingAccess(req.user, offeringId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have access to this course offering' });
      }
    }

    const rows = await fetchProgressRows(studentId, offeringId);
    return res.json({ rows });
  } catch (err) {
    console.error('getByStudent error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/progress/course/:offeringId/support-insights
 * Returns per-student support scoring for a course offering.
 */
export async function getCourseSupportInsights(req, res) {
  try {
    const offeringId = parseInt(req.params.offeringId, 10);
    if (Number.isNaN(offeringId)) {
      return res.status(400).json({ error: 'Invalid offering id' });
    }

    const hasAccess = await ensureOfferingAccess(req.user, offeringId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this course offering' });
    }

    const offeringResult = await pool.query(
      `SELECT
         co.id,
         co.term,
         co.section,
         c.code AS course_code,
         c.title AS course_title
       FROM course_offerings co
       JOIN courses c ON c.id = co.course_id
       WHERE co.id = $1`,
      [offeringId]
    );

    if (offeringResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course offering not found' });
    }

    const result = await pool.query(
      `
        WITH enrolled_students AS (
          SELECT e.student_id, u.name AS student_name, u.email AS student_email
          FROM enrollments e
          JOIN users u ON u.id = e.student_id
          WHERE e.course_offering_id = $1
        ),
        assignment_catalog AS (
          SELECT a.id, a.title, COALESCE(a.max_score, 0) AS max_score, a.due_at
          FROM assignments a
          WHERE a.course_offering_id = $1
            AND (
              a.due_at IS NULL
              OR a.due_at <= NOW()
              OR EXISTS (
                SELECT 1
                FROM assignment_submissions s
                WHERE s.assignment_id = a.id
              )
            )
        ),
        latest_assignment_submissions AS (
          SELECT ranked.*
          FROM (
            SELECT
              s.*,
              ROW_NUMBER() OVER (
                PARTITION BY s.assignment_id, s.student_id
                ORDER BY s.attempt DESC NULLS LAST, s.submitted_at DESC NULLS LAST, s.id DESC
              ) AS rn
            FROM assignment_submissions s
            JOIN assignment_catalog a ON a.id = s.assignment_id
          ) ranked
          WHERE ranked.rn = 1
        ),
        assignment_metrics AS (
          SELECT
            es.student_id,
            COUNT(*) FILTER (
              WHERE ac.id IS NOT NULL
                AND (ac.due_at IS NULL OR ac.due_at <= NOW() OR las.id IS NOT NULL)
            ) AS total_assignments,
            COUNT(*) FILTER (
              WHERE las.id IS NOT NULL
                AND (ac.due_at IS NULL OR ac.due_at <= NOW() OR las.id IS NOT NULL)
            ) AS submitted_assignments,
            COUNT(*) FILTER (
              WHERE las.id IS NOT NULL
                AND (ac.due_at IS NULL OR ac.due_at <= NOW() OR las.id IS NOT NULL)
                AND (ac.due_at IS NULL OR las.submitted_at <= ac.due_at)
            ) AS on_time_assignments,
            COALESCE(SUM(CASE
              WHEN ac.id IS NOT NULL AND (ac.due_at IS NULL OR ac.due_at <= NOW() OR las.id IS NOT NULL)
                THEN COALESCE(las.final_score, 0)
              ELSE 0
            END), 0) AS assignment_points_scored,
            COALESCE(SUM(CASE
              WHEN ac.id IS NOT NULL AND (ac.due_at IS NULL OR ac.due_at <= NOW() OR las.id IS NOT NULL)
                THEN COALESCE(ac.max_score, 0)
              ELSE 0
            END), 0) AS assignment_points_possible
          FROM enrolled_students es
          LEFT JOIN assignment_catalog ac ON TRUE
          LEFT JOIN latest_assignment_submissions las
            ON las.assignment_id = ac.id
           AND las.student_id = es.student_id
          GROUP BY es.student_id
        ),
        quiz_catalog AS (
          SELECT q.id, q.title, COALESCE(q.max_score, 0) AS max_score, q.end_at
          FROM quizzes q
          WHERE q.course_offering_id = $1
            AND (
              q.end_at IS NULL
              OR q.end_at <= NOW()
              OR EXISTS (
                SELECT 1
                FROM quiz_attempts qa
                WHERE qa.quiz_id = q.id
                  AND qa.finished_at IS NOT NULL
              )
            )
        ),
        latest_quiz_attempts AS (
          SELECT ranked.*
          FROM (
            SELECT
              qa.*,
              ROW_NUMBER() OVER (
                PARTITION BY qa.quiz_id, qa.student_id
                ORDER BY qa.finished_at DESC NULLS LAST, qa.started_at DESC NULLS LAST, qa.id DESC
              ) AS rn
            FROM quiz_attempts qa
            JOIN quiz_catalog q ON q.id = qa.quiz_id
          ) ranked
          WHERE ranked.rn = 1
        ),
        quiz_metrics AS (
          SELECT
            es.student_id,
            COUNT(*) FILTER (
              WHERE qc.id IS NOT NULL
                AND (qc.end_at IS NULL OR qc.end_at <= NOW() OR lqa.finished_at IS NOT NULL)
            ) AS total_quizzes,
            COUNT(*) FILTER (
              WHERE lqa.id IS NOT NULL
                AND (qc.end_at IS NULL OR qc.end_at <= NOW() OR lqa.finished_at IS NOT NULL)
            ) AS attempted_quizzes,
            COUNT(*) FILTER (
              WHERE lqa.id IS NOT NULL
                AND (qc.end_at IS NULL OR qc.end_at <= NOW() OR lqa.finished_at IS NOT NULL)
                AND (
                  qc.end_at IS NULL
                  OR COALESCE(lqa.finished_at, lqa.started_at) <= qc.end_at
                )
            ) AS on_time_quizzes,
            COALESCE(SUM(CASE
              WHEN qc.id IS NOT NULL AND (qc.end_at IS NULL OR qc.end_at <= NOW() OR lqa.finished_at IS NOT NULL)
                THEN COALESCE(lqa.score, 0)
              ELSE 0
            END), 0) AS quiz_points_scored,
            COALESCE(SUM(CASE
              WHEN qc.id IS NOT NULL AND (qc.end_at IS NULL OR qc.end_at <= NOW() OR lqa.finished_at IS NOT NULL)
                THEN COALESCE(qc.max_score, 0)
              ELSE 0
            END), 0) AS quiz_points_possible
          FROM enrolled_students es
          LEFT JOIN quiz_catalog qc ON TRUE
          LEFT JOIN latest_quiz_attempts lqa
            ON lqa.quiz_id = qc.id
           AND lqa.student_id = es.student_id
          GROUP BY es.student_id
        ),
        lecture_catalog AS (
          SELECT
            ll.id,
            ll.started_at,
            ll.ended_at,
            GREATEST(
              EXTRACT(EPOCH FROM (COALESCE(ll.ended_at, ll.started_at) - COALESCE(ll.started_at, ll.ended_at))) / 60.0,
              1
            ) AS duration_minutes
          FROM live_lectures ll
          WHERE ll.course_offering_id = $1
            AND COALESCE(ll.status, 'scheduled') <> 'cancelled'
            AND COALESCE(ll.ended_at, ll.scheduled_at, ll.created_at) <= NOW()
        ),
        attendance_metrics AS (
          SELECT
            es.student_id,
            COALESCE((SELECT COUNT(*) FROM lecture_catalog), 0) AS total_lectures,
            COUNT(DISTINCT CASE WHEN llp.id IS NOT NULL THEN lc.id END) AS attended_lectures,
            COALESCE(SUM(lc.duration_minutes), 0) AS total_lecture_minutes,
            COALESCE(SUM(
              CASE
                WHEN llp.id IS NULL OR lc.started_at IS NULL OR lc.ended_at IS NULL THEN 0
                ELSE GREATEST(
                  EXTRACT(EPOCH FROM (
                    LEAST(COALESCE(llp.left_at, lc.ended_at), lc.ended_at)
                    - GREATEST(COALESCE(llp.joined_at, lc.started_at), lc.started_at)
                  )) / 60.0,
                  0
                )
              END
            ), 0) AS attended_minutes
          FROM enrolled_students es
          LEFT JOIN lecture_catalog lc ON TRUE
          LEFT JOIN live_lecture_participants llp
            ON llp.user_id = es.student_id
           AND llp.role = 'student'
           AND llp.live_lecture_id = lc.id
          GROUP BY es.student_id
        )
        SELECT
          es.student_id,
          es.student_name,
          es.student_email,
          COALESCE(am.total_assignments, 0) AS total_assignments,
          COALESCE(am.submitted_assignments, 0) AS submitted_assignments,
          COALESCE(am.on_time_assignments, 0) AS on_time_assignments,
          COALESCE(am.assignment_points_scored, 0) AS assignment_points_scored,
          COALESCE(am.assignment_points_possible, 0) AS assignment_points_possible,
          COALESCE(qm.total_quizzes, 0) AS total_quizzes,
          COALESCE(qm.attempted_quizzes, 0) AS attempted_quizzes,
          COALESCE(qm.on_time_quizzes, 0) AS on_time_quizzes,
          COALESCE(qm.quiz_points_scored, 0) AS quiz_points_scored,
          COALESCE(qm.quiz_points_possible, 0) AS quiz_points_possible,
          COALESCE(atm.total_lectures, 0) AS total_lectures,
          COALESCE(atm.attended_lectures, 0) AS attended_lectures,
          COALESCE(atm.total_lecture_minutes, 0) AS total_lecture_minutes,
          COALESCE(atm.attended_minutes, 0) AS attended_minutes
        FROM enrolled_students es
        LEFT JOIN assignment_metrics am ON am.student_id = es.student_id
        LEFT JOIN quiz_metrics qm ON qm.student_id = es.student_id
        LEFT JOIN attendance_metrics atm ON atm.student_id = es.student_id
        ORDER BY es.student_name NULLS LAST, es.student_email NULLS LAST, es.student_id
      `,
      [offeringId]
    );

    const students = (result.rows || []).map((row) => {
      const totalPossible = Number(row.assignment_points_possible || 0) + Number(row.quiz_points_possible || 0);
      const totalScored = Number(row.assignment_points_scored || 0) + Number(row.quiz_points_scored || 0);
      const totalTasks = Number(row.total_assignments || 0) + Number(row.total_quizzes || 0);
      const completedTasks = Number(row.submitted_assignments || 0) + Number(row.attempted_quizzes || 0);
      const onTimeTasks = Number(row.on_time_assignments || 0) + Number(row.on_time_quizzes || 0);
      const totalLectures = Number(row.total_lectures || 0);
      const attendedLectures = Number(row.attended_lectures || 0);
      const totalLectureMinutes = Number(row.total_lecture_minutes || 0);
      const attendedMinutes = Number(row.attended_minutes || 0);

      const marksPct = clampPercentage(totalPossible > 0 ? (totalScored / totalPossible) * 100 : 100, 100);
      const completionPct = clampPercentage(totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100, 100);
      const onTimePct = clampPercentage(totalTasks > 0 ? (onTimeTasks / totalTasks) * 100 : 100, 100);
      const consistencyPct = clampPercentage((completionPct * 0.65) + (onTimePct * 0.35), 100);
      const attendancePct = clampPercentage(
        totalLectureMinutes > 0 ? (attendedMinutes / totalLectureMinutes) * 100 : 100,
        100
      );
      const overallScore = clampPercentage((marksPct * 0.5) + (consistencyPct * 0.3) + (attendancePct * 0.2), 100);

      const labels = buildStudentSupportLabels({ marksPct, consistencyPct, attendancePct, overallScore });

      return {
        student_id: row.student_id,
        student_name: row.student_name,
        student_email: row.student_email,
        marks_pct: roundOne(marksPct),
        consistency_pct: roundOne(consistencyPct),
        attendance_pct: roundOne(attendancePct),
        overall_score: roundOne(overallScore),
        assignment_completion_pct: roundOne(completionPct),
        on_time_pct: roundOne(onTimePct),
        metrics: {
          total_assignments: Number(row.total_assignments || 0),
          submitted_assignments: Number(row.submitted_assignments || 0),
          total_quizzes: Number(row.total_quizzes || 0),
          attempted_quizzes: Number(row.attempted_quizzes || 0),
          total_lectures: totalLectures,
          attended_lectures: attendedLectures,
          total_lecture_minutes: roundOne(totalLectureMinutes),
          attended_minutes: roundOne(attendedMinutes),
          total_points_possible: roundOne(totalPossible),
          total_points_scored: roundOne(totalScored)
        },
        ...labels
      };
    }).sort((a, b) => {
      if (a.supportLevel !== b.supportLevel) {
        const rank = { high_priority: 0, watchlist: 1, on_track: 2 };
        return rank[a.supportLevel] - rank[b.supportLevel];
      }
      return a.overall_score - b.overall_score;
    });

    return res.json({
      offering: offeringResult.rows[0],
      formula: {
        overall_score: '50% marks + 30% task consistency + 20% attendance',
        consistency_score: '65% task completion rate + 35% on-time completion rate'
      },
      students
    });
  } catch (err) {
    console.error('getCourseSupportInsights error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
