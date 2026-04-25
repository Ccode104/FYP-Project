import { pool } from './db/index.js';

async function check() {
  try {
    // Check enrollments for key users
    console.log('=== ENROLLMENTS FOR KEY USERS ===');
    const enrollments = await pool.query(
      `
      SELECT e.id, u.email, u.name, c.code, c.title, co.term, co.section, e.status
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN course_offerings co ON e.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE u.email IN ($1, $2, $3, $4)
      ORDER BY u.email, c.code
    `,
      ['student@gmail.com', 'teacher@gmail.com', 'ta@gmail.com', 'superadmin@gmail.com']
    );
    enrollments.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

    // Check TA assignments for key users
    console.log('\\n=== TA ASSIGNMENTS ===');
    const taAssign = await pool.query(
      `
      SELECT ta.id, u.email, c.code, co.term, co.section
      FROM ta_assignments ta
      JOIN users u ON ta.ta_id = u.id
      JOIN course_offerings co ON ta.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE u.email IN ($1, $2, $3, $4)
    `,
      ['student@gmail.com', 'teacher@gmail.com', 'ta@gmail.com', 'superadmin@gmail.com']
    );
    taAssign.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

    // Check course ownership
    console.log('\\n=== FACULTY COURSE OWNERSHIP ===');
    const facultyCourses = await pool.query(
      `
      SELECT fc.id, u.email, c.code, c.title
      FROM faculty_courses fc
      JOIN users u ON fc.faculty_id = u.id
      JOIN courses c ON fc.course_id = c.id
      WHERE u.email IN ($1, $2, $3, $4)
    `,
      ['student@gmail.com', 'teacher@gmail.com', 'ta@gmail.com', 'superadmin@gmail.com']
    );
    facultyCourses.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

    // Check all submissions with linked data
    console.log('\\n=== ALL SUBMISSIONS ===');
    const allSubs = await pool.query(`
      SELECT asub.id, u.email as student_email, a.title as assignment_title,
             c.code as course_code, asub.submitted_at, asub.status, asub.final_score,
             asub.grader_id, g.email as grader_email
      FROM assignment_submissions asub
      JOIN users u ON asub.student_id = u.id
      JOIN assignments a ON asub.assignment_id = a.id
      JOIN course_offerings co ON a.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      LEFT JOIN users g ON asub.grader_id = g.id
      ORDER BY asub.submitted_at
    `);
    allSubs.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

    // Check quiz attempts
    console.log('\\n=== ALL QUIZ ATTEMPTS ===');
    const allQuiz = await pool.query(`
      SELECT qa.id, u.email as student_email, q.title as quiz_title,
             c.code as course_code, qa.started_at, qa.finished_at, qa.score
      FROM quiz_attempts qa
      JOIN users u ON qa.student_id = u.id
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
    `);
    allQuiz.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

    // Check user gamification stats
    console.log('\\n=== USER GAMIFICATION STATS ===');
    const stats = await pool.query('SELECT * FROM user_gamification_stats');
    stats.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

    // Check achievements
    console.log('\\n=== ACHIEVEMENTS ===');
    const ach = await pool.query('SELECT * FROM achievements');
    ach.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

    // Check user achievements
    console.log('\\n=== USER ACHIEVEMENTS ===');
    const ua = await pool.query(`
      SELECT ua.id, u.email, a.name as achievement_name, ua.unlocked_at
      FROM user_achievements ua
      JOIN users u ON ua.user_id = u.id
      JOIN achievements a ON ua.achievement_id = a.id
    `);
    ua.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
  }
}
check();
