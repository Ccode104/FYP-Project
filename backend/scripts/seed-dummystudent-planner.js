import 'dotenv/config';
import { pool } from '../db/index.js';
import { createPlannerTables } from '../controllers/plannerController.js';

const DUMMY_STUDENT_EMAIL = 'student@gmail.com';
const DEMO_OFFERING_IDS = [301, 302];

async function getDummyStudent() {
  const result = await pool.query(
    `SELECT id, email, name
     FROM users
     WHERE email = $1 AND role = 'student'
     LIMIT 1`,
    [DUMMY_STUDENT_EMAIL]
  );

  if (result.rowCount === 0) {
    throw new Error(`DummyStudent not found for email ${DUMMY_STUDENT_EMAIL}`);
  }

  return result.rows[0];
}

async function ensureEnrollments(studentId) {
  const offerings = await pool.query(
    `SELECT id
     FROM course_offerings
     WHERE id = ANY($1::bigint[])`,
    [DEMO_OFFERING_IDS]
  );

  for (const row of offerings.rows) {
    await pool.query(
      `INSERT INTO enrollments (course_offering_id, student_id, enrolled_at, status)
       VALUES ($1, $2, NOW(), 'active')
       ON CONFLICT (course_offering_id, student_id) DO UPDATE
       SET status = EXCLUDED.status`,
      [row.id, studentId]
    );
  }
}

async function ensurePreferences(studentId) {
  await pool.query(
    `INSERT INTO planner_preferences (user_id, daily_minutes, timezone, preferred_hours, updated_at)
     VALUES ($1, 150, 'Asia/Calcutta', 'evening', NOW())
     ON CONFLICT (user_id) DO UPDATE
     SET daily_minutes = EXCLUDED.daily_minutes,
         timezone = EXCLUDED.timezone,
         preferred_hours = EXCLUDED.preferred_hours,
         updated_at = NOW()`,
    [studentId]
  );
}

async function seedPlannerContent(studentId) {
  const faculty = await pool.query(
    `SELECT faculty_id
     FROM course_offerings
     WHERE id = 301
     LIMIT 1`
  );

  const facultyId = faculty.rows[0]?.faculty_id;
  if (!facultyId) {
    throw new Error('No faculty found for offering 301');
  }

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const assignmentRelease = new Date(now.getTime() - day);
  const assignmentDue = new Date(now.getTime() + 9 * day);
  const quizStart = new Date(now.getTime() + 2 * day);
  const quizEnd = new Date(now.getTime() + 6 * day);
  const lectureTime = new Date(now.getTime() + 3 * day);

  await pool.query(
    `INSERT INTO assignments (
      course_offering_id, title, description, assignment_type, release_at, due_at,
      max_score, allow_multiple_submissions, created_by, created_at, allow_github_repo, file_size_limit_mb
    )
     SELECT 301, 'Planner Demo Assignment', 'Future assignment for planner testing.', 'code', $1, $2,
            100, true, $3, NOW(), true, 20
     WHERE NOT EXISTS (
       SELECT 1 FROM assignments
       WHERE course_offering_id = 301 AND title = 'Planner Demo Assignment'
     )`,
    [assignmentRelease, assignmentDue, facultyId]
  );

  await pool.query(
    `INSERT INTO quizzes (
      course_offering_id, title, start_at, end_at, max_score, is_proctored, time_limit, allow_suspension_resume
    )
     SELECT 302, 'Planner Demo Quiz', $1, $2, 25, false, 35, true
     WHERE NOT EXISTS (
       SELECT 1 FROM quizzes
       WHERE course_offering_id = 302 AND title = 'Planner Demo Quiz'
     )`,
    [quizStart, quizEnd]
  );

  await pool.query(
    `INSERT INTO live_lectures (
      title, description, course_offering_id, created_by, scheduled_at, status,
      stream_key, max_participants, is_recording, created_at, updated_at
    )
     SELECT 'Planner Demo Review Session',
            'Upcoming live lecture to test planner calendar and lecture tasks.',
            301, $1, $2, 'scheduled',
            'planner-demo-review-session', 80, false, NOW(), NOW()
     WHERE NOT EXISTS (
       SELECT 1 FROM live_lectures
       WHERE course_offering_id = 301 AND title = 'Planner Demo Review Session'
     )`,
    [facultyId, lectureTime]
  );

  const assignmentForHistory = await pool.query(
    `SELECT id
     FROM assignments
     WHERE course_offering_id = 301
     ORDER BY due_at ASC NULLS LAST, id ASC
     LIMIT 1`
  );

  const quizForHistory = await pool.query(
    `SELECT id
     FROM quizzes
     WHERE course_offering_id = 301
     ORDER BY end_at ASC NULLS LAST, id ASC
     LIMIT 1`
  );

  const assignmentId = assignmentForHistory.rows[0]?.id;
  const quizId = quizForHistory.rows[0]?.id;

  if (assignmentId) {
    await pool.query(
      `INSERT INTO assignment_submissions (
        assignment_id, student_id, submitted_at, status, final_score, attempt
      )
       SELECT $1, $2, NOW() - INTERVAL '2 days', 'submitted', NULL, 1
       WHERE NOT EXISTS (
         SELECT 1 FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2
       )`,
      [assignmentId, studentId]
    );
  }

  if (quizId) {
    await pool.query(
      `INSERT INTO quiz_attempts (
        quiz_id, student_id, started_at, finished_at, score, answers, violated
      )
       SELECT $1, $2, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '25 minutes',
              18, '{}'::jsonb, false
       WHERE NOT EXISTS (
         SELECT 1 FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2
       )`,
      [quizId, studentId]
    );
  }
}

async function seedManualTasks(studentId) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const tonight = new Date(now.getTime() + 10 * 60 * 60 * 1000).toISOString();
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const inFiveDays = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const dismissedUntil = new Date(now.getTime() + 18 * 60 * 60 * 1000).toISOString();

  await pool.query(
    `DELETE FROM planner_task_logs
     WHERE user_id = $1
       AND task_id IN (
         SELECT id FROM planner_tasks
         WHERE user_id = $1 AND source_type = 'manual' AND title LIKE 'Planner Demo:%'
       )`,
    [studentId]
  );

  await pool.query(
    `DELETE FROM planner_tasks
     WHERE user_id = $1 AND source_type = 'manual' AND title LIKE 'Planner Demo:%'`,
    [studentId]
  );

  const tasks = [
    {
      title: 'Planner Demo: Review recursion notes',
      description: 'Read lecture notes and summarize tricky recursion patterns.',
      dueAt: tonight,
      estimatedMinutes: 60,
      difficulty: 'medium',
      category: 'self-study',
      priority: 'high',
      scheduledFor: today,
      scheduledBlock: 'evening',
      status: 'pending',
      orderIndex: 0,
      timeSpent: 0,
      reminderDismissedUntil: null
    },
    {
      title: 'Planner Demo: Finish CS101 lab draft',
      description: 'Continue the draft and test edge cases before submission.',
      dueAt: inTwoDays,
      estimatedMinutes: 90,
      difficulty: 'hard',
      category: 'assignment',
      priority: 'high',
      scheduledFor: tomorrow,
      scheduledBlock: 'evening',
      status: 'in_progress',
      orderIndex: 1,
      timeSpent: 35,
      reminderDismissedUntil: null
    },
    {
      title: 'Planner Demo: Prepare for quiz review',
      description: 'Create a one-page cheat sheet for arrays, loops, and functions.',
      dueAt: inFiveDays,
      estimatedMinutes: 45,
      difficulty: 'easy',
      category: 'quiz',
      priority: 'medium',
      scheduledFor: nextWeek,
      scheduledBlock: 'morning',
      status: 'pending',
      orderIndex: 2,
      timeSpent: 0,
      reminderDismissedUntil: dismissedUntil
    },
    {
      title: 'Planner Demo: Organize study checklist',
      description: 'Completed task to validate progress and done-state UI.',
      dueAt: now.toISOString(),
      estimatedMinutes: 30,
      difficulty: 'easy',
      category: 'custom',
      priority: 'low',
      scheduledFor: today,
      scheduledBlock: 'afternoon',
      status: 'done',
      orderIndex: 3,
      timeSpent: 30,
      reminderDismissedUntil: null
    }
  ];

  for (const task of tasks) {
    const inserted = await pool.query(
      `INSERT INTO planner_tasks (
        user_id, course_offering_id, source_type, source_id, category, priority, title, description,
        due_at, estimated_minutes, difficulty, status, completed_at, last_status_at, time_spent_minutes,
        scheduled_for, scheduled_block, reminder_dismissed_until, order_index, created_at, updated_at
      ) VALUES (
        $1, NULL, 'manual', NULL, $2, $3, $4, $5, $6, $7, $8, $9,
        CASE WHEN $9 = 'done' THEN NOW() - INTERVAL '1 hour' ELSE NULL END,
        NOW() - INTERVAL '2 hours', $10, $11, $12, $13, $14, NOW(), NOW()
      )
      RETURNING id`,
      [
        studentId,
        task.category,
        task.priority,
        task.title,
        task.description,
        task.dueAt,
        task.estimatedMinutes,
        task.difficulty,
        task.status,
        task.timeSpent,
        task.scheduledFor,
        task.scheduledBlock,
        task.reminderDismissedUntil,
        task.orderIndex
      ]
    );

    if (task.timeSpent > 0) {
      await pool.query(
        `INSERT INTO planner_task_logs (task_id, user_id, status, time_spent_minutes, note, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '90 minutes')`,
        [inserted.rows[0].id, studentId, task.status, task.timeSpent, 'Seeded planner demo work log']
      );
    }
  }
}

async function summarize(studentId) {
  const counts = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM enrollments WHERE student_id = $1) AS enrollments,
       (SELECT COUNT(*)::int FROM planner_tasks WHERE user_id = $1) AS planner_tasks,
       (SELECT COUNT(*)::int FROM planner_task_logs WHERE user_id = $1) AS planner_logs,
       (SELECT COUNT(*)::int FROM assignments WHERE title = 'Planner Demo Assignment') AS demo_assignments,
       (SELECT COUNT(*)::int FROM quizzes WHERE title = 'Planner Demo Quiz') AS demo_quizzes,
       (SELECT COUNT(*)::int FROM live_lectures WHERE title = 'Planner Demo Review Session') AS demo_lectures`,
    [studentId]
  );

  console.log(JSON.stringify(counts.rows[0], null, 2));
}

async function main() {
  await createPlannerTables();
  const student = await getDummyStudent();

  await ensureEnrollments(student.id);
  await ensurePreferences(student.id);
  await seedPlannerContent(student.id);
  await seedManualTasks(student.id);
  await summarize(student.id);
}

main()
  .catch((error) => {
    console.error('Failed to seed DummyStudent planner data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
