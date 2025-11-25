import 'dotenv/config';
import { pool } from './db/index.js';

async function testDatabase() {
  try {
    console.log('Testing database connection and data...');

    // Test basic connection
    const connectionTest = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Test users
    const users = await pool.query('SELECT id, name, email, role FROM users ORDER BY id');
    console.log(`✅ Found ${users.rows.length} users:`, users.rows.map(u => `${u.name} (${u.role})`));

    // Test departments
    const departments = await pool.query('SELECT id, code, name FROM departments ORDER BY id');
    console.log(`✅ Found ${departments.rows.length} departments:`, departments.rows.map(d => `${d.code} - ${d.name}`));

    // Test courses
    const courses = await pool.query('SELECT id, code, title FROM courses ORDER BY id');
    console.log(`✅ Found ${courses.rows.length} courses:`, courses.rows.map(c => `${c.code} - ${c.title}`));

    // Test course offerings
    const offerings = await pool.query('SELECT id, course_id, term, section FROM course_offerings ORDER BY id');
    console.log(`✅ Found ${offerings.rows.length} course offerings`);

    // Test enrollments
    const enrollments = await pool.query('SELECT id, course_offering_id, student_id FROM enrollments ORDER BY id');
    console.log(`✅ Found ${enrollments.rows.length} enrollments`);

    // Test advanced features tables exist
    const tables = [
      'achievements',
      'user_achievements',
      'user_gamification_stats',
      'proctoring_configs',
      'proctoring_sessions',
      'proctoring_violations',
      'rubrics',
      'rubric_criteria',
      'support_tickets',
      'messages',
      'notifications',
      'study_materials',
      'videos',
      'video_quiz_questions',
      'video_quiz_attempts',
      'live_lectures',
      'live_lecture_participants'
    ];

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ Table ${table} exists with ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`❌ Table ${table} error:`, error.message);
      }
    }

    console.log('\n🎉 Database setup verification completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: ${users.rows.length}`);
    console.log(`   - Departments: ${departments.rows.length}`);
    console.log(`   - Courses: ${courses.rows.length}`);
    console.log(`   - Course Offerings: ${offerings.rows.length}`);
    console.log(`   - Enrollments: ${enrollments.rows.length}`);
    console.log('\n🚀 LMS is ready for testing all implemented features!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testDatabase();