import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const TEACHER_EMAIL = 'teacher@gmail.com';
const OFFERINGS = [301, 302];

const ASSIGNMENTS = [
  { offeringId: 301, title: 'Support Insight Lab 1', dueAt: '2026-03-07T17:00:00.000Z', maxScore: 100 },
  { offeringId: 301, title: 'Support Insight Lab 2', dueAt: '2026-03-15T17:00:00.000Z', maxScore: 100 },
  { offeringId: 302, title: 'Support Insight Worksheet', dueAt: '2026-03-11T17:00:00.000Z', maxScore: 100 }
];

const QUIZZES = [
  { offeringId: 301, title: 'Support Insight Quiz 1', endAt: '2026-03-08T17:00:00.000Z', maxScore: 50 },
  { offeringId: 302, title: 'Support Insight Quiz 2', endAt: '2026-03-12T17:00:00.000Z', maxScore: 50 }
];

const LECTURES = [
  {
    offeringId: 301,
    title: 'Support Insight Lecture A',
    scheduledAt: '2026-03-10T09:00:00.000Z',
    startedAt: '2026-03-10T09:00:00.000Z',
    endedAt: '2026-03-10T10:00:00.000Z'
  },
  {
    offeringId: 301,
    title: 'Support Insight Lecture B',
    scheduledAt: '2026-03-18T09:00:00.000Z',
    startedAt: '2026-03-18T09:00:00.000Z',
    endedAt: '2026-03-18T10:00:00.000Z'
  },
  {
    offeringId: 302,
    title: 'Support Insight Lecture C',
    scheduledAt: '2026-03-14T09:00:00.000Z',
    startedAt: '2026-03-14T09:00:00.000Z',
    endedAt: '2026-03-14T10:00:00.000Z'
  }
];

const SUBMISSIONS = [
  { assignmentTitle: 'Support Insight Lab 1', studentEmail: 'student.alice@lms.edu', submittedAt: '2026-03-06T13:00:00.000Z', score: 96, status: 'graded' },
  { assignmentTitle: 'Support Insight Lab 2', studentEmail: 'student.alice@lms.edu', submittedAt: '2026-03-14T12:00:00.000Z', score: 92, status: 'graded' },
  { assignmentTitle: 'Support Insight Worksheet', studentEmail: 'student.alice@lms.edu', submittedAt: '2026-03-10T12:00:00.000Z', score: 93, status: 'graded' },

  { assignmentTitle: 'Support Insight Lab 1', studentEmail: 'student.bob@lms.edu', submittedAt: '2026-03-06T16:00:00.000Z', score: 61, status: 'graded' },
  { assignmentTitle: 'Support Insight Lab 2', studentEmail: 'student.bob@lms.edu', submittedAt: '2026-03-14T16:00:00.000Z', score: 58, status: 'graded' },
  { assignmentTitle: 'Support Insight Worksheet', studentEmail: 'student.bob@lms.edu', submittedAt: '2026-03-10T16:00:00.000Z', score: 60, status: 'graded' },

  { assignmentTitle: 'Support Insight Lab 1', studentEmail: 'student.carol@lms.edu', submittedAt: '2026-03-12T12:00:00.000Z', score: 42, status: 'graded' },

  { assignmentTitle: 'Support Insight Lab 1', studentEmail: 'student@gmail.com', submittedAt: '2026-03-07T11:00:00.000Z', score: 74, status: 'graded' }
];

const QUIZ_ATTEMPTS = [
  { quizTitle: 'Support Insight Quiz 1', studentEmail: 'student.alice@lms.edu', startedAt: '2026-03-08T09:00:00.000Z', finishedAt: '2026-03-08T09:28:00.000Z', score: 47 },
  { quizTitle: 'Support Insight Quiz 2', studentEmail: 'student.alice@lms.edu', startedAt: '2026-03-12T10:00:00.000Z', finishedAt: '2026-03-12T10:24:00.000Z', score: 44 },

  { quizTitle: 'Support Insight Quiz 1', studentEmail: 'student.bob@lms.edu', startedAt: '2026-03-08T11:00:00.000Z', finishedAt: '2026-03-08T11:30:00.000Z', score: 28 },
  { quizTitle: 'Support Insight Quiz 2', studentEmail: 'student.bob@lms.edu', startedAt: '2026-03-12T11:00:00.000Z', finishedAt: '2026-03-12T11:27:00.000Z', score: 30 },

  { quizTitle: 'Support Insight Quiz 1', studentEmail: 'student@gmail.com', startedAt: '2026-03-08T13:00:00.000Z', finishedAt: '2026-03-08T13:31:00.000Z', score: 24 },
  { quizTitle: 'Support Insight Quiz 2', studentEmail: 'student@gmail.com', startedAt: '2026-03-12T13:00:00.000Z', finishedAt: '2026-03-12T13:35:00.000Z', score: 20 }
];

const ATTENDANCE = {
  'Support Insight Lecture A': [
    { email: 'student.alice@lms.edu', joinOffsetMinutes: 0, leaveOffsetMinutes: 60 },
    { email: 'student.bob@lms.edu', joinOffsetMinutes: 5, leaveOffsetMinutes: 52 },
    { email: 'student.carol@lms.edu', joinOffsetMinutes: 18, leaveOffsetMinutes: 41 },
    { email: 'student@gmail.com', joinOffsetMinutes: 10, leaveOffsetMinutes: 39 }
  ],
  'Support Insight Lecture B': [
    { email: 'student.alice@lms.edu', joinOffsetMinutes: 0, leaveOffsetMinutes: 58 },
    { email: 'student.bob@lms.edu', joinOffsetMinutes: 12, leaveOffsetMinutes: 46 },
    { email: 'student.carol@lms.edu', joinOffsetMinutes: 22, leaveOffsetMinutes: 34 },
    { email: 'student@gmail.com', joinOffsetMinutes: 8, leaveOffsetMinutes: 49 }
  ],
  'Support Insight Lecture C': [
    { email: 'student.alice@lms.edu', joinOffsetMinutes: 0, leaveOffsetMinutes: 59 },
    { email: 'student.bob@lms.edu', joinOffsetMinutes: 7, leaveOffsetMinutes: 44 },
    { email: 'student@gmail.com', joinOffsetMinutes: 14, leaveOffsetMinutes: 32 }
  ]
};

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

async function getUsersByEmail(client, emails) {
  const result = await client.query(
    'SELECT id, email, name FROM users WHERE lower(email) = ANY($1::text[])',
    [emails.map((email) => email.toLowerCase())]
  );

  return new Map(result.rows.map((row) => [row.email.toLowerCase(), row]));
}

async function ensureAssignment(client, teacherId, config) {
  const existing = await client.query(
    'SELECT id FROM assignments WHERE course_offering_id = $1 AND title = $2 LIMIT 1',
    [config.offeringId, config.title]
  );

  if (existing.rows.length) {
    const updated = await client.query(
      `UPDATE assignments
       SET due_at = $1,
           release_at = $2,
           max_score = $3,
           created_by = $4
       WHERE id = $5
       RETURNING id, title`,
      [config.dueAt, new Date(new Date(config.dueAt).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), config.maxScore, teacherId, existing.rows[0].id]
    );
    return updated.rows[0];
  }

  const inserted = await client.query(
    `INSERT INTO assignments (
      course_offering_id, title, description, assignment_type, release_at, due_at, max_score, allow_multiple_submissions, created_by, created_at
    ) VALUES ($1, $2, $3, 'file', $4, $5, $6, false, $7, now())
    RETURNING id, title`,
    [
      config.offeringId,
      config.title,
      'Deterministic support-insights seed assignment.',
      new Date(new Date(config.dueAt).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      config.dueAt,
      config.maxScore,
      teacherId
    ]
  );
  return inserted.rows[0];
}

async function ensureQuiz(client, config) {
  const existing = await client.query(
    'SELECT id FROM quizzes WHERE course_offering_id = $1 AND title = $2 LIMIT 1',
    [config.offeringId, config.title]
  );

  const startAt = new Date(new Date(config.endAt).getTime() - 60 * 60 * 1000).toISOString();

  if (existing.rows.length) {
    const updated = await client.query(
      `UPDATE quizzes
       SET start_at = $1,
           end_at = $2,
           max_score = $3
       WHERE id = $4
       RETURNING id, title`,
      [startAt, config.endAt, config.maxScore, existing.rows[0].id]
    );
    return updated.rows[0];
  }

  const inserted = await client.query(
    `INSERT INTO quizzes (
      course_offering_id, title, start_at, end_at, max_score, is_proctored, time_limit, allow_suspension_resume
    ) VALUES ($1, $2, $3, $4, $5, false, 30, true)
    RETURNING id, title`,
    [config.offeringId, config.title, startAt, config.endAt, config.maxScore]
  );
  return inserted.rows[0];
}

async function ensureLecture(client, teacherId, config) {
  const existing = await client.query(
    'SELECT id FROM live_lectures WHERE course_offering_id = $1 AND title = $2 LIMIT 1',
    [config.offeringId, config.title]
  );

  if (existing.rows.length) {
    const updated = await client.query(
      `UPDATE live_lectures
       SET created_by = $1,
           scheduled_at = $2,
           started_at = $3,
           ended_at = $4,
           status = 'ended',
           stream_key = COALESCE(stream_key, $5),
           updated_at = now()
       WHERE id = $6
       RETURNING id, title`,
      [teacherId, config.scheduledAt, config.startedAt, config.endedAt, `support-${config.offeringId}-${config.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, existing.rows[0].id]
    );
    return updated.rows[0];
  }

  const inserted = await client.query(
    `INSERT INTO live_lectures (
      title, description, course_offering_id, created_by, scheduled_at, started_at, ended_at, status, stream_key, max_participants, is_recording, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ended', $8, 100, false, now(), now())
    RETURNING id, title`,
    [
      config.title,
      'Deterministic support-insights seed lecture.',
      config.offeringId,
      teacherId,
      config.scheduledAt,
      config.startedAt,
      config.endedAt,
      `support-${config.offeringId}-${config.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    ]
  );
  return inserted.rows[0];
}

async function upsertSubmission(client, assignmentId, studentId, teacherId, submission) {
  await client.query(
    `INSERT INTO assignment_submissions (
      assignment_id, student_id, submitted_at, status, final_score, grader_id, graded_at, comments, attempt
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
    ON CONFLICT (assignment_id, student_id, attempt)
    DO UPDATE SET
      submitted_at = EXCLUDED.submitted_at,
      status = EXCLUDED.status,
      final_score = EXCLUDED.final_score,
      grader_id = EXCLUDED.grader_id,
      graded_at = EXCLUDED.graded_at,
      comments = EXCLUDED.comments`,
    [
      assignmentId,
      studentId,
      submission.submittedAt,
      submission.status,
      submission.score,
      teacherId,
      submission.submittedAt,
      'Seeded for teacher-side support insights.'
    ]
  );
}

async function replaceQuizAttempt(client, quizId, studentId, attempt) {
  await client.query('DELETE FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2', [quizId, studentId]);
  await client.query(
    `INSERT INTO quiz_attempts (
      quiz_id, student_id, started_at, finished_at, score, answers, violated
    ) VALUES ($1, $2, $3, $4, $5, '{}'::jsonb, false)`,
    [quizId, studentId, attempt.startedAt, attempt.finishedAt, attempt.score]
  );
}

async function replaceLectureAttendance(client, lectureId, teacherId, attendees) {
  await client.query('DELETE FROM live_lecture_participants WHERE live_lecture_id = $1', [lectureId]);

  const lectureResult = await client.query(
    'SELECT started_at, ended_at FROM live_lectures WHERE id = $1',
    [lectureId]
  );
  const lecture = lectureResult.rows[0];
  const lectureStart = new Date(lecture.started_at);
  const lectureEnd = new Date(lecture.ended_at || lecture.started_at);

  await client.query(
    `INSERT INTO live_lecture_participants (
      live_lecture_id, user_id, joined_at, left_at, role
    ) VALUES ($1, $2, $3, $4, 'teacher')`,
    [lectureId, teacherId, lectureStart.toISOString(), lectureEnd.toISOString()]
  );

  for (const attendee of attendees) {
    const joinedAt = new Date(lectureStart.getTime() + attendee.joinOffsetMinutes * 60 * 1000);
    const leftAt = new Date(lectureStart.getTime() + attendee.leaveOffsetMinutes * 60 * 1000);
    await client.query(
      `INSERT INTO live_lecture_participants (
        live_lecture_id, user_id, joined_at, left_at, role
      ) VALUES ($1, $2, $3, $4, 'student')`,
      [lectureId, attendee.userId, joinedAt.toISOString(), leftAt.toISOString()]
    );
  }
}

async function main() {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const teacherResult = await client.query(
      'SELECT id, email, name FROM users WHERE lower(email) = $1 LIMIT 1',
      [TEACHER_EMAIL]
    );
    if (!teacherResult.rows.length) {
      throw new Error(`Teacher not found for ${TEACHER_EMAIL}`);
    }
    const teacher = teacherResult.rows[0];

    await client.query(
      'UPDATE course_offerings SET faculty_id = $1 WHERE id = ANY($2::bigint[])',
      [teacher.id, OFFERINGS]
    );

    const neededEmails = new Set([
      ...SUBMISSIONS.map((item) => item.studentEmail),
      ...QUIZ_ATTEMPTS.map((item) => item.studentEmail),
      ...Object.values(ATTENDANCE).flat().map((attendee) => attendee.email)
    ]);
    const usersByEmail = await getUsersByEmail(client, [...neededEmails, TEACHER_EMAIL]);

    const missingEmails = [...neededEmails].filter((email) => !usersByEmail.has(email.toLowerCase()));
    if (missingEmails.length) {
      throw new Error(`Missing users for emails: ${missingEmails.join(', ')}`);
    }

    const assignmentsByTitle = new Map();
    for (const assignment of ASSIGNMENTS) {
      const row = await ensureAssignment(client, teacher.id, assignment);
      assignmentsByTitle.set(assignment.title, Number(row.id));
    }

    const quizzesByTitle = new Map();
    for (const quiz of QUIZZES) {
      const row = await ensureQuiz(client, quiz);
      quizzesByTitle.set(quiz.title, Number(row.id));
    }

    const lecturesByTitle = new Map();
    for (const lecture of LECTURES) {
      const row = await ensureLecture(client, teacher.id, lecture);
      lecturesByTitle.set(lecture.title, Number(row.id));
    }

    for (const submission of SUBMISSIONS) {
      await upsertSubmission(
        client,
        assignmentsByTitle.get(submission.assignmentTitle),
        Number(usersByEmail.get(submission.studentEmail.toLowerCase()).id),
        Number(teacher.id),
        submission
      );
    }

    for (const attempt of QUIZ_ATTEMPTS) {
      await replaceQuizAttempt(
        client,
        quizzesByTitle.get(attempt.quizTitle),
        Number(usersByEmail.get(attempt.studentEmail.toLowerCase()).id),
        attempt
      );
    }

    for (const [lectureTitle, emails] of Object.entries(ATTENDANCE)) {
      await replaceLectureAttendance(
        client,
        lecturesByTitle.get(lectureTitle),
        Number(teacher.id),
        emails.map((attendee) => ({
          userId: Number(usersByEmail.get(attendee.email.toLowerCase()).id),
          joinOffsetMinutes: attendee.joinOffsetMinutes,
          leaveOffsetMinutes: attendee.leaveOffsetMinutes
        }))
      );
    }

    const seeded = await client.query(
      `
        SELECT
          c.code AS course_code,
          c.title AS course_title,
          co.id AS offering_id,
          COUNT(DISTINCT e.student_id) AS students,
          COUNT(DISTINCT a.id) FILTER (WHERE a.title LIKE 'Support Insight%') AS seeded_assignments,
          COUNT(DISTINCT q.id) FILTER (WHERE q.title LIKE 'Support Insight%') AS seeded_quizzes,
          COUNT(DISTINCT ll.id) FILTER (WHERE ll.title LIKE 'Support Insight%') AS seeded_lectures
        FROM course_offerings co
        JOIN courses c ON c.id = co.course_id
        LEFT JOIN enrollments e ON e.course_offering_id = co.id
        LEFT JOIN assignments a ON a.course_offering_id = co.id
        LEFT JOIN quizzes q ON q.course_offering_id = co.id
        LEFT JOIN live_lectures ll ON ll.course_offering_id = co.id
        WHERE co.id = ANY($1::bigint[])
        GROUP BY c.code, c.title, co.id
        ORDER BY co.id
      `,
      [OFFERINGS]
    );

    await client.query('COMMIT');

    console.log('Support-insights demo data seeded successfully.');
    console.log(JSON.stringify({
      teacher,
      offerings: seeded.rows
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed support-insights demo data:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
