import { pool } from '../db/index.js';
import { logger } from '../utils/logger.js';

const DEFAULT_DAILY_MINUTES = 120;

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
  return base;
}

function normalizeDifficulty(value) {
  const lower = (value || '').toLowerCase();
  if (['easy', 'low', 'beginner'].includes(lower)) return 'easy';
  if (['hard', 'high', 'advanced'].includes(lower)) return 'hard';
  return 'medium';
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
  const dailyMinutes = preferences?.daily_minutes || DEFAULT_DAILY_MINUTES;
  const today = new Date();
  const sorted = [...tasks].sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

  const lastDue = sorted.length ? new Date(sorted[sorted.length - 1].due_at) : new Date();
  const buckets = buildDailyBuckets(today, lastDue);

  for (const task of sorted) {
    const dueDate = new Date(task.due_at);
    const availableBuckets = buckets.filter(bucket => new Date(bucket.date) <= dueDate);
    if (!availableBuckets.length) continue;
    let best = availableBuckets[0];
    for (const bucket of availableBuckets) {
      if (bucket.allocated < best.allocated) best = bucket;
    }
    best.allocated += task.estimated_minutes || 0;
    task.scheduled_for = best.date;
  }

  return sorted;
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
      title TEXT NOT NULL,
      description TEXT,
      due_at TIMESTAMPTZ,
      estimated_minutes INTEGER DEFAULT 90,
      difficulty TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      scheduled_for DATE,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_unique_source
      ON planner_tasks(user_id, source_type, source_id);
    CREATE INDEX IF NOT EXISTS idx_planner_user ON planner_tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_planner_due ON planner_tasks(due_at);
    CREATE INDEX IF NOT EXISTS idx_planner_status ON planner_tasks(status);
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

export async function getPlannerPreferences(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const result = await pool.query(
      `SELECT user_id, daily_minutes, timezone, preferred_hours
       FROM planner_preferences WHERE user_id = $1`,
      [userId]
    );

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
        daily_minutes ?? DEFAULT_DAILY_MINUTES,
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

    const { from, to, courseId, status } = req.query;
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
        user_id, course_offering_id, source_type, title, description,
        due_at, estimated_minutes, difficulty, scheduled_for, created_at, updated_at
      ) VALUES ($1, $2, 'manual', $3, $4, $5, $6, $7, $8, now(), now())
      RETURNING *`,
      [
        userId,
        course_offering_id || null,
        title,
        description || null,
        due_at || null,
        estimated_minutes || 90,
        normalizeDifficulty(difficulty),
        scheduled_for || null
      ]
    );

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('createPlannerTask error:', error);
    res.status(500).json({ error: 'Failed to create planner task' });
  }
}

export async function updatePlannerTask(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { taskId } = req.params;
    const fields = [];
    const values = [];
    let index = 1;

    const allowed = [
      'title',
      'description',
      'due_at',
      'estimated_minutes',
      'difficulty',
      'status',
      'scheduled_for',
      'order_index'
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${index++}`);
        values.push(key === 'difficulty' ? normalizeDifficulty(req.body[key]) : req.body[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
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

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('updatePlannerTask error:', error);
    res.status(500).json({ error: 'Failed to update planner task' });
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

export async function generatePlanner(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { courseIds = [] } = req.body || {};

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
      return res.json({ success: true, tasks: [] });
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
        title: quiz.title || 'Quiz',
        description: `Quiz available from ${new Date(quiz.start_at).toLocaleString('en-US')} to ${new Date(quiz.end_at).toLocaleString('en-US')}`,
        due_at: quiz.end_at,
        estimated_minutes: estimateMinutes({ type: 'quiz', timeLimit: quiz.time_limit }),
        difficulty: 'medium'
      });
    }

    if (taskCandidates.length === 0) {
      return res.json({ success: true, tasks: [] });
    }

    const preferencesResult = await pool.query(
      `SELECT daily_minutes, timezone, preferred_hours
       FROM planner_preferences
       WHERE user_id = $1`,
      [userId]
    );

    const preferences = preferencesResult.rows[0] || { daily_minutes: DEFAULT_DAILY_MINUTES };
    const scheduled = scheduleTasks(taskCandidates, preferences);

    for (const task of scheduled) {
      await pool.query(
        `INSERT INTO planner_tasks (
          user_id, course_offering_id, source_type, source_id,
          title, description, due_at, estimated_minutes, difficulty,
          scheduled_for, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', now(), now())
        ON CONFLICT (user_id, source_type, source_id) DO UPDATE
        SET title = EXCLUDED.title,
            description = EXCLUDED.description,
            due_at = EXCLUDED.due_at,
            estimated_minutes = EXCLUDED.estimated_minutes,
            difficulty = EXCLUDED.difficulty,
            scheduled_for = EXCLUDED.scheduled_for,
            updated_at = now()`,
        [
          userId,
          task.course_offering_id,
          task.source_type,
          task.source_id,
          task.title,
          task.description,
          task.due_at,
          task.estimated_minutes,
          task.difficulty,
          task.scheduled_for
        ]
      );
    }

    const refreshed = await pool.query(
      `SELECT * FROM planner_tasks WHERE user_id = $1
       ORDER BY status = 'done', scheduled_for NULLS LAST, due_at NULLS LAST, order_index ASC`,
      [userId]
    );

    res.json({ success: true, tasks: refreshed.rows });
  } catch (error) {
    logger.error('generatePlanner error:', error);
    res.status(500).json({ error: 'Failed to generate planner' });
  }
}
