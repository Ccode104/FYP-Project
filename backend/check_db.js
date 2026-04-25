import { pool } from './db/index.js';

async function check() {
  try {
    const keyUsers = await pool.query(
      'SELECT id, email, name, role FROM users WHERE email IN ($1, $2, $3, $4)',
      ['student@gmail.com', 'teacher@gmail.com', 'ta@gmail.com', 'superadmin@gmail.com']
    );
    console.log('=== KEY USERS ===');
    keyUsers.rows.forEach(u => console.log(JSON.stringify(u, null, 2)));

    const admins = await pool.query('SELECT * FROM admins');
    console.log('\\n=== ADMINS ===');
    admins.rows.forEach(a => console.log(JSON.stringify(a, null, 2)));

    const rubrics = await pool.query('SELECT * FROM rubrics');
    console.log('\\n=== RUBRICS ===');
    rubrics.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

    const criteria = await pool.query('SELECT * FROM rubric_criteria');
    console.log('\\n=== RUBRIC CRITERIA ===');
    criteria.rows.forEach(c => console.log(JSON.stringify(c, null, 2)));

    const rubricGrades = await pool.query('SELECT * FROM rubric_grades');
    console.log('\\n=== RUBRIC GRADES ===');
    rubricGrades.rows.forEach(rg => console.log(JSON.stringify(rg, null, 2)));

    const achievements = await pool.query('SELECT count(*) FROM achievements');
    console.log('\\nAchievements count:', achievements.rows[0].count);
    const userAchievements = await pool.query('SELECT count(*) FROM user_achievements');
    console.log('User achievements count:', userAchievements.rows[0].count);
    const userStats = await pool.query('SELECT count(*) FROM user_gamification_stats');
    console.log('User gamification stats count:', userStats.rows[0].count);

    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('\\n=== ALL TABLES ===');
    tables.rows.forEach(t => console.log(t.table_name));

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
  }
}
check();
