import 'dotenv/config';
import { pool } from './db/index.js';

async function addCourseOfferings() {
  try {
    console.log('🌱 Adding demo course offerings...\n');
    
    // First, get all courses and a faculty member
    const coursesResult = await pool.query(
      'SELECT id, code, title FROM courses LIMIT 5'
    );
    const facultyResult = await pool.query(
      'SELECT id FROM users WHERE role = $1 LIMIT 1',
      ['faculty']
    );
    
    if (coursesResult.rows.length === 0) {
      console.log('❌ No courses found. Creating demo courses first...');
      
      // Create demo courses
      const courseQueries = [
        ['CS101', 'Introduction to Programming', 'Learn programming basics'],
        ['CS102', 'Data Structures', 'Master fundamental data structures'],
        ['CS201', 'Web Development', 'Build modern web applications'],
        ['CS202', 'Database Design', 'Design efficient databases'],
        ['CS301', 'Machine Learning', 'Explore ML algorithms']
      ];
      
      for (const [code, title, description] of courseQueries) {
        await pool.query(
          'INSERT INTO courses (code, title, description) VALUES ($1, $2, $3)',
          [code, title, description]
        );
        console.log(`✅ Created course: ${code}`);
      }
    }
    
    // Get faculty for offerings
    let facultyId = facultyResult.rows[0]?.id;
    if (!facultyId) {
      console.log('❌ No faculty found. Creating a faculty user...');
      const newFaculty = await pool.query(
        'INSERT INTO users (name, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['Demo Faculty', 'faculty.demo@demo.com', 'placeholder', 'faculty', true]
      );
      facultyId = newFaculty.rows[0].id;
      console.log(`✅ Created faculty: ${facultyId}`);
    }
    
    // Get all courses (fresh query)
    const allCoursesResult = await pool.query(
      'SELECT id, code, title FROM courses LIMIT 5'
    );
    
    // Create course offerings
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000); // 120 days from now
    
    console.log('\n📚 Creating course offerings...');
    
    for (const course of allCoursesResult.rows) {
      const sections = ['A', 'B', 'C'];
      
      for (const section of sections) {
        const result = await pool.query(
          `INSERT INTO course_offerings 
           (course_id, term, section, faculty_id, max_capacity, start_date, end_date) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [course.id, 'Spring 2024', section, facultyId, 30, startDate, endDate]
        );
        
        if (result.rows.length > 0) {
          console.log(`✅ Created offering: ${course.code} - Section ${section}`);
        }
      }
    }
    
    // Verify what's available
    const checkResult = await pool.query(
      `SELECT o.id, c.code, c.title, o.term, o.section 
       FROM course_offerings o 
       JOIN courses c ON o.course_id = c.id
       WHERE o.start_date <= NOW() AND o.end_date >= NOW()
       ORDER BY c.code`
    );
    
    console.log('\n✅ Available course offerings:');
    checkResult.rows.forEach(row => {
      console.log(`  - ${row.code} (${row.title}) - ${row.term} Section ${row.section} [ID: ${row.id}]`);
    });
    
    if (checkResult.rows.length === 0) {
      console.log('⚠️  No active offerings found within date range');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

addCourseOfferings();
