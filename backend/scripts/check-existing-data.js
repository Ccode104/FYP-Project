import 'dotenv/config';
import { pool } from '../db/index.js';

async function checkExistingData() {
  try {
    console.log('=== CHECKING EXISTING DATA ===\n');

    // Check departments
    const depts = await pool.query('SELECT * FROM departments ORDER BY id');
    console.log('Departments:', depts.rows.length, 'found');
    if (depts.rows.length > 0) {
      depts.rows.forEach(d => console.log(`  ${d.id}: ${d.name} (${d.code})`));
    }

    // Check courses
    const courses = await pool.query('SELECT * FROM courses ORDER BY id');
    console.log('\nCourses:', courses.rows.length, 'found');
    if (courses.rows.length > 0) {
      courses.rows.forEach(c => console.log(`  ${c.id}: ${c.title} (${c.code})`));
    }

    // Check course offerings
    const offerings = await pool.query('SELECT * FROM course_offerings ORDER BY id');
    console.log('\nCourse Offerings:', offerings.rows.length, 'found');
    if (offerings.rows.length > 0) {
      offerings.rows.forEach(o => console.log(`  ${o.id}: Course ${o.course_id}, Term ${o.term}, Section ${o.section}`));
    }

    // Check enrollments
    const enrollments = await pool.query('SELECT * FROM enrollments ORDER BY id');
    console.log('\nEnrollments:', enrollments.rows.length, 'found');

    // Check assignments
    const assignments = await pool.query('SELECT * FROM assignments ORDER BY id');
    console.log('\nAssignments:', assignments.rows.length, 'found');

    // Check quizzes
    const quizzes = await pool.query('SELECT * FROM quizzes ORDER BY id');
    console.log('\nQuizzes:', quizzes.rows.length, 'found');

    // Check achievements
    const achievements = await pool.query('SELECT * FROM achievements ORDER BY id');
    console.log('\nAchievements:', achievements.rows.length, 'found');

    // Check support tickets
    const tickets = await pool.query('SELECT * FROM support_tickets ORDER BY id');
    console.log('\nSupport Tickets:', tickets.rows.length, 'found');

    console.log('\n=== DATA CHECK COMPLETE ===');

  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await pool.end();
  }
}

checkExistingData();
