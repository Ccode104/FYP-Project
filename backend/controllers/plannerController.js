import { pool } from '../db/index.js';
import { logger } from '../utils/logger.js';

const DEFAULT_DAILY_MINUTES = 120;
const CATEGORY_OPTIONS = ['assignment', 'quiz', 'lecture', 'self-study', 'custom', 'grading', 'admin'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const DEFAULT_SCHEDULE_BUFFER_MINUTES = 10;

function roundToFiveMinutes(value, minimum = 5) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return minimum;
  return Math.max(minimum, Math.ceil(numeric / 5) * 5);
}

function roundToFiveOrZero(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.ceil(numeric / 5) * 5;
}

function applyPlanningBuffer(value) {
  return roundToFiveMinutes(Number(value || 0) + DEFAULT_SCHEDULE_BUFFER_MINUTES, 15);
}

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function estimateMinutes({ type, description, timeLimit }) {
  let base = 90;
  if (type === 'quiz') base = 45;
  if (type === 'assignment') base = 120;
  if (type === 'code') base = 180;
  if (typeof timeLimit === 'number' && timeLimit > 0) {
    base = Math.max(base, timeLimit + 15);
  }
  if (description && description.length > 500) base += 30;
  if (description && description.length > 1200) base += 30;
  return applyPlanningBuffer(base);
}

function normalizeDifficulty(value) {
  const lower = (value || '').toLowerCase();
  if (['easy', 'low', 'beginner'].includes(lower)) return 'easy';
  if (['hard', 'high', 'advanced'].includes(lower)) return 'hard';
  return 'medium';
}

function normalizeCategory(value) {
  const lower = (value || '').toLowerCase();
  if (CATEGORY_OPTIONS.includes(lower)) return lower;
  return 'custom';
}

function normalizePriority(value) {
  const lower = (value || '').toLowerCase();
  if (PRIORITY_OPTIONS.includes(lower)) return lower;
  return 'medium';
}

function computePriority(dueAt) {
  if (!dueAt) return 'low';
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return 'low';
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 2) return 'high';
  if (diffDays <= 7) return 'medium';
  return 'low';
}

function difficultyWeight(value) {
  const normalized = normalizeDifficulty(value);
  if (normalized === 'hard') return 3;
  if (normalized === 'medium') return 2;
  return 1;
}

function buildDailyBuckets(startDate, endDate) {
  const buckets = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    buckets.push({
      date: parseDateOnly(cursor),
      allocated: 0
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
}

function scheduleTasks(tasks, preferences) {
  const dailyMinutes = roundToFiveMinutes(preferences?.daily_minutes || DEFAULT_DAILY_MINUTES, 30);
  const today = new Date();
  const preferredBlock = preferences?.preferred_hours || null;

  // Sort by due date (earlier first), and within same due date schedule harder tasks earlier.
  const sorted = [...tasks].sort((a, b) => {
    const dueDiff = new Date(a.due_at || 0) - new Date(b.due_at || 0);
    if (dueDiff !== 0) return dueDiff;
    return difficultyWeight(b.difficulty) - difficultyWeight(a.difficulty);
  });

  const lastDue = sorted.length ? new Date(sorted[sorted.length - 1].due_at) : new Date();
  const buckets = buildDailyBuckets(today, lastDue);

  for (const task of sorted) {
    const dueDate = new Date(task.due_at);
    const availableBuckets = buckets.filter(bucket => new Date(bucket.date) <= dueDate);
    if (!availableBuckets.length) continue;
    const minutes = roundToFiveMinutes(task.estimated_minutes || 0, 15);

    // Prefer buckets that stay within daily focus minutes; fallback to least-allocated if all overflow.
    const withinCap = availableBuckets.filter((b) => b.allocated + minutes <= dailyMinutes);
    const candidateBuckets = withinCap.length ? withinCap : availableBuckets;

    let best = candidateBuckets[0];
    for (const bucket of candidateBuckets) {
      if (bucket.allocated < best.allocated) best = bucket;
    }

    best.allocated += minutes;
    task.scheduled_for = best.date;
    // Attach a study-time block for UI ("morning/afternoon/evening/late-night").
    if (preferredBlock) task.scheduled_block = preferredBlock;
  }

  return sorted;
}

async function fetchPlannerTasksForUser(userId) {
  const refreshed = await pool.query(
    `SELECT *
     FROM planner_tasks
     WHERE user_id = $1
     ORDER BY status = 'done', scheduled_for NULLS LAST, due_at NULLS LAST, order_index ASC`,
    [userId]
  );
  return refreshed.rows || [];
}

async function fetchPlannerPreferencesForUser(userId) {
  const preferencesResult = await pool.query(
    `SELECT daily_minutes, timezone, preferred_hours
     FROM planner_preferences
     WHERE user_id = $1`,
    [userId]
  );
  return preferencesResult.rows[0] || { daily_minutes: DEFAULT_DAILY_MINUTES };
}

async function scheduleExistingManualTasks(userId, preferences) {
  // Auto-schedule existing manual tasks that have a due date but no schedule yet.
  const existing = await fetchPlannerTasksForUser(userId);
  const candidates = existing.filter(
    (t) =>
      t.source_type === 'manual' &&
      t.status !== 'done' &&
      !!t.due_at &&
      !t.scheduled_for
  );

  if (candidates.length === 0) return existing;

  const scheduled = scheduleTasks(
    candidates.map((t) => ({
      id: t.id,
      due_at: t.due_at,
      estimated_minutes: t.estimated_minutes || 90,
      difficulty: t.difficulty,
      scheduled_for: null
    })),
    preferences
  );

  for (const task of scheduled) {
    if (!task.scheduled_for) continue;
    await pool.query(
      `UPDATE planner_tasks
       SET scheduled_for = $1, scheduled_block = $2, updated_at = now()
       WHERE id = $3 AND user_id = $4 AND scheduled_for IS NULL`,
      [task.scheduled_for, task.scheduled_block || null, task.id, userId]
    );
  }

  return fetchPlannerTasksForUser(userId);
}

export async function createPlannerTables() {
  const sql = `
    CREATE TABLE IF NOT EXISTS planner_preferences (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      daily_minutes INTEGER DEFAULT ${DEFAULT_DAILY_MINUTES},
      timezone TEXT DEFAULT 'UTC',
      preferred_hours TEXT DEFAULT 'morning',
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS planner_tasks (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_offering_id BIGINT REFERENCES course_offerings(id) ON DELETE SET NULL,
      source_type TEXT NOT NULL DEFAULT 'manual',
      source_id BIGINT,
      category TEXT DEFAULT 'custom',
      priority TEXT DEFAULT 'medium',
      title TEXT NOT NULL,
      description TEXT,
      due_at TIMESTAMPTZ,
      estimated_minutes INTEGER DEFAULT 90,
      difficulty TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      completed_at TIMESTAMPTZ,
      last_status_at TIMESTAMPTZ DEFAULT now(),
      time_spent_minutes INTEGER DEFAULT 0,
      scheduled_for DATE,
      scheduled_block TEXT,
      reminder_dismissed_until TIMESTAMPTZ,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE planner_tasks
      ADD COLUMN IF NOT EXISTS scheduled_block TEXT;
    ALTER TABLE planner_tasks
      ADD COLUMN IF NOT EXISTS reminder_dismissed_until TIMESTAMPTZ;
    ALTER TABLE planner_tasks
      ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'custom';
    ALTER TABLE planner_tasks
      ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
    ALTER TABLE planner_tasks
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
    ALTER TABLE planner_tasks
      ADD COLUMN IF NOT EXISTS last_status_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE planner_tasks
      ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT 0;

    CREATE TABLE IF NOT EXISTS planner_recommendations (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS planner_task_logs (
      id BIGSERIAL PRIMARY KEY,
      task_id BIGINT NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT,
      time_spent_minutes INTEGER,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_unique_source
      ON planner_tasks(user_id, source_type, source_id);
    CREATE INDEX IF NOT EXISTS idx_planner_user ON planner_tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_planner_due ON planner_tasks(due_at);
    CREATE INDEX IF NOT EXISTS idx_planner_status ON planner_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_planner_rec_user ON planner_recommendations(user_id);
    CREATE INDEX IF NOT EXISTS idx_planner_category ON planner_tasks(category);
    CREATE INDEX IF NOT EXISTS idx_planner_priority ON planner_tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_planner_log_task ON planner_task_logs(task_id);
  `;

  try {
    const statements = sql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    console.log('✅ Planner tables ready');
  } catch (error) {
    console.error('Error creating planner tables:', error);
  }
}

async function computeTimeOfDayRecommendation(userId) {
  let submissions;
  try {
    submissions = await pool.query(
      `SELECT submitted_at as activity_at
       FROM assignment_submissions
       WHERE student_id = $1
       UNION ALL
       SELECT finished_at as activity_at
       FROM quiz_attempts
       WHERE student_id = $1 AND finished_at IS NOT NULL
       ORDER BY activity_at DESC
       LIMIT 50`,
      [userId]
    );
  } catch (error) {
    logger.warn('Planner recommendations fallback: activity tables unavailable', { error });
    return { best_hours: ['18:00-20:00'], reason: 'Not enough activity history yet.' };
  }

  if (submissions.rows.length === 0) {
    return { best_hours: ['18:00-20:00'], reason: 'Not enough activity history yet.' };
  }

  const buckets = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0
  };

  submissions.rows.forEach(row => {
    const hour = new Date(row.activity_at).getHours();
    if (hour >= 6 && hour < 12) buckets.morning += 1;
    else if (hour >= 12 && hour < 17) buckets.afternoon += 1;
    else if (hour >= 17 && hour < 21) buckets.evening += 1;
    else buckets.night += 1;
  });

  const best = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0]?.[0] || 'evening';
  const hourMap = {
    morning: ['08:00-10:00', '10:00-12:00'],
    afternoon: ['13:00-15:00', '15:00-17:00'],
    evening: ['18:00-20:00', '20:00-22:00'],
    night: ['22:00-00:00']
  };

  return {
    best_hours: hourMap[best],
    reason: `Most of your recent study activity happens in the ${best}.`
  };
}

export async function getPlannerRecommendations(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const recommendation = await computeTimeOfDayRecommendation(userId);

    try {
      await pool.query(
        `INSERT INTO planner_recommendations (user_id, kind, payload)
         VALUES ($1, $2, $3)`,
        [userId, 'time_of_day', recommendation]
      );
    } catch (error) {
      logger.warn('Failed to persist planner recommendation', { error });
    }

    res.json({ recommendations: [recommendation] });
  } catch (error) {
    console.error('getPlannerRecommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
}

export async function generateTeacherPlanner(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const offerings = await pool.query(
      `SELECT id FROM course_offerings WHERE faculty_id = $1`,
      [userId]
    );
    const offeringIds = offerings.rows.map(row => Number(row.id));
    if (offeringIds.length === 0) return res.json({ success: true, tasks: [] });

    const assignments = await pool.query(
      `SELECT id, course_offering_id, title, description, due_at
       FROM assignments
       WHERE course_offering_id = ANY($1) AND due_at IS NOT NULL
       ORDER BY due_at ASC`,
      [offeringIds]
    );

    const tasks = assignments.rows.map(assignment => ({
      source_type: 'assignment_plan',
      source_id: assignment.id,
      course_offering_id: assignment.course_offering_id,
      category: 'grading',
      priority: computePriority(assignment.due_at),
      title: `Review grading timeline: ${assignment.title}`,
      description: assignment.description,
      due_at: assignment.due_at,
      estimated_minutes: 60,
      difficulty: 'medium'
    }));

    for (const task of tasks) {
      await pool.query(
        `INSERT INTO planner_tasks (
          user_id, course_offering_id, source_type, source_id,
          category, priority, title, description, due_at, estimated_minutes, difficulty,
          status, last_status_at, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',now(),now(),now())
        ON CONFLICT (user_id, source_type, source_id) DO UPDATE
        SET category = EXCLUDED.category,
            priority = EXCLUDED.priority,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            due_at = EXCLUDED.due_at,
            estimated_minutes = EXCLUDED.estimated_minutes,
            updated_at = now()`,
        [
          userId,
          task.course_offering_id,
          task.source_type,
          task.source_id,
          normalizeCategory(task.category),
          normalizePriority(task.priority),
          task.title,
          task.description,
          task.due_at,
          task.estimated_minutes,
          task.difficulty
        ]
      );
    }

    const refreshed = await pool.query(
      `SELECT * FROM planner_tasks WHERE user_id = $1
       ORDER BY status = 'done', due_at NULLS LAST, order_index ASC`,
      [userId]
    );
    res.json({ success: true, tasks: refreshed.rows });
  } catch (error) {
    logger.error('generateTeacherPlanner error:', error);
    res.status(500).json({ error: 'Failed to generate teacher planner' });
  }
}

export async function generateTAPlanner(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const taCourses = await pool.query(
      `SELECT course_offering_id FROM ta_assignments WHERE ta_id = $1`,
      [userId]
    );
    const offeringIds = taCourses.rows.map(row => Number(row.course_offering_id));
    if (offeringIds.length === 0) return res.json({ success: true, tasks: [] });

    const pending = await pool.query(
      `SELECT a.id, a.course_offering_id, a.title, a.due_at,
              COUNT(s.id) FILTER (WHERE s.final_score IS NULL) AS ungraded
       FROM assignments a
       LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
       WHERE a.course_offering_id = ANY($1)
       GROUP BY a.id, a.course_offering_id, a.title, a.due_at
       ORDER BY a.due_at ASC`,
      [offeringIds]
    );

    const tasks = pending.rows.map(item => ({
      source_type: 'ta_grading',
      source_id: item.id,
      course_offering_id: item.course_offering_id,
      category: 'grading',
      priority: computePriority(item.due_at),
      title: `Grade ${item.ungraded} submissions: ${item.title}`,
      description: 'TA grading queue',
      due_at: item.due_at,
      estimated_minutes: Math.max(30, Number(item.ungraded) * 10),
      difficulty: 'medium'
    }));

    for (const task of tasks) {
      await pool.query(
        `INSERT INTO planner_tasks (
          user_id, course_offering_id, source_type, source_id,
          category, priority, title, description, due_at, estimated_minutes, difficulty,
          status, last_status_at, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',now(),now(),now())
        ON CONFLICT (user_id, source_type, source_id) DO UPDATE
        SET category = EXCLUDED.category,
            priority = EXCLUDED.priority,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            due_at = EXCLUDED.due_at,
            estimated_minutes = EXCLUDED.estimated_minutes,
            updated_at = now()`,
        [
          userId,
          task.course_offering_id,
          task.source_type,
          task.source_id,
          normalizeCategory(task.category),
          normalizePriority(task.priority),
          task.title,
          task.description,
          task.due_at,
          task.estimated_minutes,
          task.difficulty
        ]
      );
    }

    const refreshed = await pool.query(
      `SELECT * FROM planner_tasks WHERE user_id = $1
       ORDER BY status = 'done', due_at NULLS LAST, order_index ASC`,
      [userId]
    );
    res.json({ success: true, tasks: refreshed.rows });
  } catch (error) {
    logger.error('generateTAPlanner error:', error);
    res.status(500).json({ error: 'Failed to generate TA planner' });
  }
}

export async function generateAdminPlanner(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const issues = await pool.query(
      `SELECT id, title, status, created_at
       FROM support_tickets
       WHERE status IN ('open', 'pending')
       ORDER BY created_at DESC
       LIMIT 10`
    );

    const tasks = issues.rows.map(ticket => ({
      source_type: 'admin_support',
      source_id: ticket.id,
      course_offering_id: null,
      category: 'admin',
      priority: computePriority(ticket.created_at),
      title: `Resolve ticket: ${ticket.title}`,
      description: `Status: ${ticket.status}`,
      due_at: ticket.created_at,
      estimated_minutes: 30,
      difficulty: 'medium'
    }));

    for (const task of tasks) {
      await pool.query(
        `INSERT INTO planner_tasks (
          user_id, course_offering_id, source_type, source_id,
          category, priority, title, description, due_at, estimated_minutes, difficulty,
          status, last_status_at, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',now(),now(),now())
        ON CONFLICT (user_id, source_type, source_id) DO UPDATE
        SET category = EXCLUDED.category,
            priority = EXCLUDED.priority,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            due_at = EXCLUDED.due_at,
            estimated_minutes = EXCLUDED.estimated_minutes,
            updated_at = now()`,
        [
          userId,
          task.course_offering_id,
          task.source_type,
          task.source_id,
          normalizeCategory(task.category),
          normalizePriority(task.priority),
          task.title,
          task.description,
          task.due_at,
          task.estimated_minutes,
          task.difficulty
        ]
      );
    }

    const refreshed = await pool.query(
      `SELECT * FROM planner_tasks WHERE user_id = $1
       ORDER BY status = 'done', due_at NULLS LAST, order_index ASC`,
      [userId]
    );
    res.json({ success: true, tasks: refreshed.rows });
  } catch (error) {
    logger.error('generateAdminPlanner error:', error);
    res.status(500).json({ error: 'Failed to generate admin planner' });
  }
}

export async function getPlannerPreferences(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    let result;
    try {
      result = await pool.query(
        `SELECT user_id, daily_minutes, timezone, preferred_hours
         FROM planner_preferences WHERE user_id = $1`,
        [userId]
      );
    } catch (error) {
      logger.warn('Planner preferences fallback: table unavailable', { error });
      return res.json({
        user_id: userId,
        daily_minutes: DEFAULT_DAILY_MINUTES,
        timezone: 'UTC',
        preferred_hours: 'morning'
      });
    }

    if (result.rows.length === 0) {
      return res.json({
        user_id: userId,
        daily_minutes: DEFAULT_DAILY_MINUTES,
        timezone: 'UTC',
        preferred_hours: 'morning'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('getPlannerPreferences error:', error);
    res.status(500).json({ error: 'Failed to load planner preferences' });
  }
}

export async function updatePlannerPreferences(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { daily_minutes, timezone, preferred_hours } = req.body;
    await pool.query(
      `INSERT INTO planner_preferences (user_id, daily_minutes, timezone, preferred_hours, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id) DO UPDATE
       SET daily_minutes = EXCLUDED.daily_minutes,
           timezone = EXCLUDED.timezone,
           preferred_hours = EXCLUDED.preferred_hours,
           updated_at = now()`,
      [
        userId,
        roundToFiveMinutes(daily_minutes ?? DEFAULT_DAILY_MINUTES, 30),
        timezone || 'UTC',
        preferred_hours || 'morning'
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('updatePlannerPreferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
}

export async function getPlannerTasks(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { from, to, courseId, status, category, priority } = req.query;
    const conditions = ['user_id = $1'];
    const values = [userId];
    let index = 2;

    if (courseId) {
      conditions.push(`course_offering_id = $${index++}`);
      values.push(Number(courseId));
    }
    if (status) {
      conditions.push(`status = $${index++}`);
      values.push(String(status));
    }
    if (category) {
      conditions.push(`category = $${index++}`);
      values.push(normalizeCategory(String(category)));
    }
    if (priority) {
      conditions.push(`priority = $${index++}`);
      values.push(normalizePriority(String(priority)));
    }
    if (from) {
      conditions.push(`(scheduled_for IS NULL OR scheduled_for >= $${index++})`);
      values.push(parseDateOnly(from));
    }
    if (to) {
      conditions.push(`(scheduled_for IS NULL OR scheduled_for <= $${index++})`);
      values.push(parseDateOnly(to));
    }

    const query = `
      SELECT *
      FROM planner_tasks
      WHERE ${conditions.join(' AND ')}
      ORDER BY status = 'done', scheduled_for NULLS LAST, due_at NULLS LAST, order_index ASC
    `;

    const result = await pool.query(query, values);
    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('getPlannerTasks error:', error);
    res.status(500).json({ error: 'Failed to load planner tasks' });
  }
}

export async function createPlannerTask(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const {
      course_offering_id,
      category,
      priority,
      title,
      description,
      due_at,
      estimated_minutes,
      difficulty,
      scheduled_for
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const result = await pool.query(
      `INSERT INTO planner_tasks (
        user_id, course_offering_id, source_type, category, priority, title, description,
        due_at, estimated_minutes, difficulty, scheduled_for, last_status_at, created_at, updated_at
      ) VALUES ($1, $2, 'manual', $3, $4, $5, $6, $7, $8, $9, $10, now(), now(), now())
      RETURNING *`,
      [
        userId,
        course_offering_id || null,
        normalizeCategory(category),
        normalizePriority(priority),
        title,
        description || null,
        due_at || null,
        roundToFiveMinutes(estimated_minutes || 90, 15),
        normalizeDifficulty(difficulty),
        scheduled_for || null
      ]
    );

    if (result.rows[0]?.estimated_minutes !== undefined) {
      result.rows[0].estimated_minutes = roundToFiveMinutes(result.rows[0].estimated_minutes, 15);
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('createPlannerTask error:', error);
    res.status(500).json({ error: 'Failed to create planner task' });
  }
}

function normalizePlannerField(key, value) {
  if (key === 'difficulty') return normalizeDifficulty(value);
  if (key === 'category') return normalizeCategory(value);
  if (key === 'priority') return normalizePriority(value);
  if (key === 'estimated_minutes') {
    return roundToFiveMinutes(value, 5);
  }
  if (key === 'time_spent_minutes') {
    return roundToFiveOrZero(value);
  }
  return value;
}

export async function updatePlannerTask(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    // Accept both camelCase and snake_case from clients.
    if (req.body && req.body.reminderDismissedUntil !== undefined && req.body.reminder_dismissed_until === undefined) {
      req.body.reminder_dismissed_until = req.body.reminderDismissedUntil;
    }

    const { taskId } = req.params;
    const existing = await pool.query(
      'SELECT * FROM planner_tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const current = existing.rows[0];
    const fields = [];
    const values = [];
    let index = 1;

    const allowed = [
      'category',
      'priority',
      'title',
      'description',
      'due_at',
      'estimated_minutes',
      'difficulty',
      'status',
      'scheduled_for',
      'scheduled_block',
      'reminder_dismissed_until',
      'order_index',
      'time_spent_minutes'
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        const value = normalizePlannerField(key, req.body[key]);
        fields.push(`${key} = $${index++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const nextStatus = req.body.status;
    if (nextStatus !== undefined && nextStatus !== current.status) {
      fields.push(`last_status_at = now()`);
      if (nextStatus === 'done') {
        fields.push(`completed_at = now()`);
      } else {
        fields.push(`completed_at = NULL`);
      }
    }

    values.push(taskId, userId);

    const result = await pool.query(
      `UPDATE planner_tasks
       SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $${index++} AND user_id = $${index}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (nextStatus !== undefined && nextStatus !== current.status) {
      await pool.query(
        `INSERT INTO planner_task_logs (task_id, user_id, status, created_at)
         VALUES ($1, $2, $3, now())`,
        [taskId, userId, nextStatus]
      );
    }

    if (req.body.time_spent_minutes !== undefined) {
      const nextTime = roundToFiveMinutes(req.body.time_spent_minutes || 0, 5);
      const prevTime = Number(current.time_spent_minutes || 0);
      const delta = nextTime - prevTime;
      if (delta > 0) {
        await pool.query(
          `INSERT INTO planner_task_logs (task_id, user_id, time_spent_minutes, created_at)
           VALUES ($1, $2, $3, now())`,
          [taskId, userId, delta]
        );
      }
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('updatePlannerTask error:', error);
    res.status(500).json({ error: 'Failed to update planner task' });
  }
}

export async function logPlannerTaskTime(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { taskId } = req.params;
    const { minutes, note } = req.body;
    const increment = roundToFiveMinutes(minutes, 5);
    if (!increment || increment <= 0) {
      return res.status(400).json({ error: 'Minutes must be a positive number' });
    }

    const result = await pool.query(
      `UPDATE planner_tasks
       SET time_spent_minutes = COALESCE(time_spent_minutes, 0) + $1, updated_at = now()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [increment, taskId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await pool.query(
      `INSERT INTO planner_task_logs (task_id, user_id, time_spent_minutes, note, created_at)
       VALUES ($1, $2, $3, $4, now())`,
      [taskId, userId, increment, note || null]
    );

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('logPlannerTaskTime error:', error);
    res.status(500).json({ error: 'Failed to log time' });
  }
}

export async function deletePlannerTask(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { taskId } = req.params;
    const result = await pool.query(
      'DELETE FROM planner_tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('deletePlannerTask error:', error);
    res.status(500).json({ error: 'Failed to delete planner task' });
  }
}

export async function reorderPlannerTasks(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Order must be an array' });
    }

    const updates = order.map((item, idx) => ({
      id: item.id,
      order_index: item.order_index ?? idx
    }));

    for (const item of updates) {
      await pool.query(
        `UPDATE planner_tasks
         SET order_index = $1, updated_at = now()
         WHERE id = $2 AND user_id = $3`,
        [item.order_index, item.id, userId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('reorderPlannerTasks error:', error);
    res.status(500).json({ error: 'Failed to reorder tasks' });
  }
}

export async function reschedulePlannerTasks(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const preferences = await fetchPlannerPreferencesForUser(userId);

    const result = await pool.query(
      `SELECT *
       FROM planner_tasks
       WHERE user_id = $1
         AND status != 'done'
         AND due_at IS NOT NULL
       ORDER BY due_at ASC`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, tasks: [] });
    }

    const scheduled = scheduleTasks(
      result.rows.map((task) => ({
        id: task.id,
        due_at: task.due_at,
        estimated_minutes: task.estimated_minutes || 90,
        difficulty: task.difficulty,
        scheduled_for: null
      })),
      preferences
    );

    for (const task of scheduled) {
      if (!task.scheduled_for) continue;
      await pool.query(
        `UPDATE planner_tasks
         SET scheduled_for = $1, scheduled_block = $2, updated_at = now()
         WHERE id = $3 AND user_id = $4`,
        [task.scheduled_for, task.scheduled_block || null, task.id, userId]
      );
    }

    const refreshed = await fetchPlannerTasksForUser(userId);
    res.json({ success: true, tasks: refreshed });
  } catch (error) {
    console.error('reschedulePlannerTasks error:', error);
    res.status(500).json({ error: 'Failed to reschedule tasks' });
  }
}

export async function generatePlanner(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { courseIds = [] } = req.body || {};
    const preferences = await fetchPlannerPreferencesForUser(userId);

    const courseResult = await pool.query(
      `SELECT course_offering_id
       FROM enrollments
       WHERE student_id = $1`,
      [userId]
    );
    const enrolled = courseResult.rows.map(row => Number(row.course_offering_id));
    const targetCourses = courseIds.length
      ? enrolled.filter(id => courseIds.includes(id))
      : enrolled;

    if (targetCourses.length === 0) {
      const tasks = await scheduleExistingManualTasks(userId, preferences);
      return res.json({ success: true, tasks });
    }

    const assignments = await pool.query(
      `SELECT id, course_offering_id, title, description, assignment_type, due_at
       FROM assignments
       WHERE course_offering_id = ANY($1) AND due_at IS NOT NULL AND due_at > now()`,
      [targetCourses]
    );

    const quizzes = await pool.query(
      `SELECT id, course_offering_id, title, start_at, end_at, time_limit
       FROM quizzes
       WHERE course_offering_id = ANY($1) AND end_at IS NOT NULL AND end_at > now()`,
      [targetCourses]
    );

    const taskCandidates = [];

    for (const assignment of assignments.rows) {
      taskCandidates.push({
        source_type: 'assignment',
        source_id: assignment.id,
        course_offering_id: assignment.course_offering_id,
        category: 'assignment',
        priority: computePriority(assignment.due_at),
        title: assignment.title,
        description: assignment.description,
        due_at: assignment.due_at,
        estimated_minutes: estimateMinutes({
          type: assignment.assignment_type === 'code' ? 'code' : 'assignment',
          description: assignment.description
        }),
        difficulty: 'medium'
      });
    }

    for (const quiz of quizzes.rows) {
      taskCandidates.push({
        source_type: 'quiz',
        source_id: quiz.id,
        course_offering_id: quiz.course_offering_id,
        category: 'quiz',
        priority: computePriority(quiz.end_at),
        title: quiz.title || 'Quiz',
        description: `Quiz available from ${new Date(quiz.start_at).toLocaleString('en-US')} to ${new Date(quiz.end_at).toLocaleString('en-US')}`,
        due_at: quiz.end_at,
        estimated_minutes: estimateMinutes({ type: 'quiz', timeLimit: quiz.time_limit }),
        difficulty: 'medium'
      });
    }

    const lectures = await pool.query(
      `SELECT id, course_offering_id, title, description, scheduled_at
       FROM live_lectures
       WHERE course_offering_id = ANY($1)
         AND scheduled_at IS NOT NULL
         AND scheduled_at > now()
         AND status IN ('scheduled', 'live')`,
      [targetCourses]
    );

    for (const lecture of lectures.rows) {
      taskCandidates.push({
        source_type: 'lecture',
        source_id: lecture.id,
        course_offering_id: lecture.course_offering_id,
        category: 'lecture',
        priority: computePriority(lecture.scheduled_at),
        title: `Attend lecture: ${lecture.title}`,
        description: lecture.description,
        due_at: lecture.scheduled_at,
        estimated_minutes: 60,
        difficulty: 'easy'
      });
    }

    if (taskCandidates.length === 0) {
      const tasks = await scheduleExistingManualTasks(userId, preferences);
      return res.json({ success: true, tasks });
    }
    const scheduled = scheduleTasks(taskCandidates, preferences);

    for (const task of scheduled) {
      await pool.query(
        `INSERT INTO planner_tasks (
          user_id, course_offering_id, source_type, source_id,
          category, priority, title, description, due_at, estimated_minutes, difficulty,
          scheduled_for, scheduled_block, status, last_status_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', now(), now(), now())
        ON CONFLICT (user_id, source_type, source_id) DO UPDATE
        SET category = EXCLUDED.category,
            priority = EXCLUDED.priority,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            due_at = EXCLUDED.due_at,
            estimated_minutes = EXCLUDED.estimated_minutes,
            difficulty = EXCLUDED.difficulty,
            scheduled_for = EXCLUDED.scheduled_for,
            scheduled_block = EXCLUDED.scheduled_block,
            updated_at = now()`,
        [
          userId,
          task.course_offering_id,
          task.source_type,
          task.source_id,
          normalizeCategory(task.category),
          normalizePriority(task.priority),
          task.title,
          task.description,
          task.due_at,
          task.estimated_minutes,
          task.difficulty,
          task.scheduled_for,
          task.scheduled_block || null
        ]
      );
    }

    const refreshed = await pool.query(
      `SELECT * FROM planner_tasks WHERE user_id = $1
       ORDER BY status = 'done', scheduled_for NULLS LAST, due_at NULLS LAST, order_index ASC`,
      [userId]
    );
    // Also schedule any existing manual tasks that are still unscheduled.
    const merged = await scheduleExistingManualTasks(userId, preferences);
    res.json({ success: true, tasks: merged });
  } catch (error) {
    logger.error('generatePlanner error:', error);
    res.status(500).json({ error: 'Failed to generate planner' });
  }
}
