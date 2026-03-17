import 'dotenv/config';
import { pool } from '../db/index.js';

async function seedPlanner() {
  const users = await pool.query(
    `SELECT id, email FROM users WHERE email IN (
      'student@gmail.com',
      'teacher@gmail.com',
      'ta@gmail.com',
      'admin@gmail.com'
    )`,
  );

  const tasks = [];
  const now = new Date();
  const inTwoDays = new Date(now);
  inTwoDays.setDate(now.getDate() + 2);
  const inFiveDays = new Date(now);
  inFiveDays.setDate(now.getDate() + 5);

  for (const user of users.rows) {
    if (user.email === 'student@gmail.com') {
      tasks.push(
        {
          user_id: user.id,
          title: 'Review lecture notes: Week 4',
          description: 'Summarize key concepts and mark weak areas.',
          due_at: inTwoDays,
          estimated_minutes: 90,
          difficulty: 'medium',
          scheduled_for: now.toISOString().slice(0, 10),
        },
        {
          user_id: user.id,
          title: 'Practice quiz questions',
          description: 'Focus on recursion and data structures.',
          due_at: inFiveDays,
          estimated_minutes: 60,
          difficulty: 'easy',
          scheduled_for: inTwoDays.toISOString().slice(0, 10),
        },
      );
    }
    if (user.email === 'teacher@gmail.com') {
      tasks.push({
        user_id: user.id,
        title: 'Finalize assignment rubric',
        description: 'Balance difficulty across questions.',
        due_at: inTwoDays,
        estimated_minutes: 45,
        difficulty: 'medium',
      });
    }
    if (user.email === 'ta@gmail.com') {
      tasks.push({
        user_id: user.id,
        title: 'Grade submissions for Lab 3',
        description: 'Prioritize late submissions.',
        due_at: inFiveDays,
        estimated_minutes: 120,
        difficulty: 'medium',
      });
    }
    if (user.email === 'admin@gmail.com') {
      tasks.push({
        user_id: user.id,
        title: 'Review platform feedback summary',
        description: 'Compile common issues from last week.',
        due_at: inTwoDays,
        estimated_minutes: 30,
        difficulty: 'easy',
      });
    }
  }

  for (const task of tasks) {
    await pool.query(
      `INSERT INTO planner_tasks (
        user_id, title, description, due_at, estimated_minutes, difficulty, scheduled_for, source_type
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'manual')`,
      [
        task.user_id,
        task.title,
        task.description,
        task.due_at,
        task.estimated_minutes,
        task.difficulty,
        task.scheduled_for || null,
      ],
    );
  }

  console.log(`Seeded planner demo tasks for ${users.rows.length} users.`);
  await pool.end();
}

seedPlanner().catch((err) => {
  console.error('Failed to seed planner demo:', err);
  process.exit(1);
});

