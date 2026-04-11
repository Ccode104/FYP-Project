/**
 * Comprehensive Demo Data Seeding Script
 * Creates full demo data for ALL features across the entire system
 * 
 * This seed includes:
 * - Users (admin, faculty, TAs, students)
 * - Courses with enrollments
 * - Assignments with submissions
 * - Quizzes with attempts
 * - Discussions & messages
 * - Live lectures
 * - Coding questions
 * - Resources (PYQs, notes)
 * - Gamification data
 * - At-risk student records
 * - Plagiarism detection data
 * - And more...
 */

import 'dotenv/config';
import { pool } from '../db/index.js';
import bcrypt from 'bcrypt';

const log = (msg, type = 'info') => {
  const colors = {
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    info: '\x1b[36m',
    reset: '\x1b[0m',
  };
  console.log(`${colors[type] || colors.info}${msg}${colors.reset}`);
};

async function seedComprehensiveData() {
  const client = await pool.connect();

  try {
    log('\n🌱 Starting Comprehensive Demo Data Seed...\n', 'info');
    await client.query('BEGIN');

    // ==========================================
    // 1. CREATE USERS
    // ==========================================
    log('📝 Creating users...', 'info');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Admin user
    await client.query(
      `INSERT INTO users (name, email, password_hash, role, created_at) 
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (email) DO NOTHING`,
      ['Admin User', 'admin@demo.com', hashedPassword, 'admin'],
    );

    // Faculty users
    const facultyIds = [];
    for (let i = 1; i <= 3; i++) {
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role, created_at) 
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (email) DO UPDATE SET role = 'faculty'
         RETURNING id`,
        [`Faculty ${i}`, `faculty${i}@demo.com`, hashedPassword, 'faculty'],
      );
      facultyIds.push(result.rows[0]?.id);
    }

    // TA users
    const taIds = [];
    for (let i = 1; i <= 2; i++) {
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role, created_at) 
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (email) DO UPDATE SET role = 'ta'
         RETURNING id`,
        [`TA ${i}`, `ta${i}@demo.com`, hashedPassword, 'ta'],
      );
      taIds.push(result.rows[0]?.id);
    }

    // Student users
    const studentIds = [];
    for (let i = 1; i <= 15; i++) {
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role, created_at) 
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (email) DO UPDATE SET role = 'student'
         RETURNING id`,
        [`Student ${i}`, `student${i}@demo.com`, hashedPassword, 'student'],
      );
      studentIds.push(result.rows[0]?.id);
    }

    log(`✅ Created users: 1 admin, ${facultyIds.length} faculty, ${taIds.length} TAs, ${studentIds.length} students`, 'success');

    // ==========================================
    // 2. CREATE COURSES
    // ==========================================
    log('\n📚 Creating courses...', 'info');

    const courseIds = [];
    const courses = [
      { code: 'CS101', name: 'Data Structures', description: 'Learn fundamental data structures' },
      { code: 'CS201', name: 'Algorithms', description: 'Advanced algorithms and complexity analysis' },
      { code: 'CS301', name: 'Database Systems', description: 'Database design and SQL' },
      { code: 'CS401', name: 'Web Development', description: 'Full-stack web development' },
      { code: 'CS501', name: 'AI & Machine Learning', description: 'Introduction to AI and ML' },
    ];

    for (const course of courses) {
      const result = await client.query(
        `INSERT INTO courses (code, name, description, faculty_id, created_at) 
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (code) DO NOTHING
         RETURNING id`,
        [course.code, course.name, course.description, facultyIds[0]],
      );
      if (result.rows[0]) {
        courseIds.push(result.rows[0].id);
      }
    }

    log(`✅ Created ${courseIds.length} courses`, 'success');

    // ==========================================
    // 3. ENROLL STUDENTS IN COURSES
    // ==========================================
    log('\n👥 Enrolling students in courses...', 'info');

    for (const courseId of courseIds) {
      for (const studentId of studentIds.slice(0, 10)) {
        await client.query(
          `INSERT INTO course_enrollments (course_id, user_id, enrolled_at) 
           VALUES ($1, $2, NOW())
           ON CONFLICT DO NOTHING`,
          [courseId, studentId],
        );
      }
    }

    log(`✅ Enrolled students in all courses`, 'success');

    // ==========================================
    // 4. CREATE ASSIGNMENTS
    // ==========================================
    log('\n✏️  Creating assignments...', 'info');

    const assignmentIds = [];
    for (let i = 0; i < courseIds.length; i++) {
      for (let j = 1; j <= 4; j++) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + j * 7);

        const result = await client.query(
          `INSERT INTO assignments (course_id, title, description, due_date, created_at) 
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id`,
          [
            courseIds[i],
            `Assignment ${j} - ${courses[i].name}`,
            `This is a comprehensive assignment for ${courses[i].name}. Students need to solve ${j * 3} problems.`,
            dueDate,
          ],
        );
        if (result.rows[0]) {
          assignmentIds.push(result.rows[0].id);
        }
      }
    }

    log(`✅ Created ${assignmentIds.length} assignments`, 'success');

    // ==========================================
    // 5. CREATE SUBMISSIONS
    // ==========================================
    log('\n📤 Creating submissions...', 'info');

    let submissionCount = 0;
    for (const assignmentId of assignmentIds.slice(0, 10)) {
      for (const studentId of studentIds.slice(0, 8)) {
        const submitted = Math.random() > 0.3; // 70% submit
        if (submitted) {
          await client.query(
            `INSERT INTO submissions (assignment_id, user_id, code, submitted_at, status) 
             VALUES ($1, $2, $3, NOW(), $4)
             ON CONFLICT DO NOTHING`,
            [
              assignmentId,
              studentId,
              `// Solution code by student\nfunction solve() { return 42; }`,
              Math.random() > 0.5 ? 'submitted' : 'graded',
            ],
          );
          submissionCount++;
        }
      }
    }

    log(`✅ Created ${submissionCount} submissions`, 'success');

    // ==========================================
    // 6. CREATE QUIZZES
    // ==========================================
    log('\n❓ Creating quizzes...', 'info');

    const quizIds = [];
    for (let i = 0; i < courseIds.length; i++) {
      for (let j = 1; j <= 3; j++) {
        const result = await client.query(
          `INSERT INTO quizzes (course_id, title, description, total_questions, time_limit, status, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           RETURNING id`,
          [
            courseIds[i],
            `Quiz ${j} - ${courses[i].name}`,
            `Quick assessment for ${courses[i].name}`,
            5 + j * 2,
            30 + j * 5,
            'published',
          ],
        );
        if (result.rows[0]) {
          quizIds.push(result.rows[0].id);
        }
      }
    }

    log(`✅ Created ${quizIds.length} quizzes`, 'success');

    // ==========================================
    // 7. CREATE QUIZ QUESTIONS
    // ==========================================
    log('\n📋 Creating quiz questions...', 'info');

    let questionCount = 0;
    for (const quizId of quizIds) {
      for (let j = 1; j <= 5; j++) {
        await client.query(
          `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_num) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            quizId,
            `Question ${j}: What is the time complexity of ${['binary search', 'merge sort', 'quicksort', 'linear search'][j % 4]}?`,
            'multiple_choice',
            JSON.stringify([`O(${['log n', 'n log n', 'n²', 'n'][j % 4]})`, 'O(n)', 'O(n²)', 'O(2^n)']),
            0,
            2,
            j,
          ],
        );
        questionCount++;
      }
    }

    log(`✅ Created ${questionCount} quiz questions`, 'success');

    // ==========================================
    // 8. CREATE QUIZ ATTEMPTS
    // ==========================================
    log('\n🎯 Creating quiz attempts...', 'info');

    let attemptCount = 0;
    for (const quizId of quizIds.slice(0, 5)) {
      for (const studentId of studentIds.slice(0, 7)) {
        if (Math.random() > 0.4) { // 60% take the quiz
          const score = Math.floor(Math.random() * 100);
          await client.query(
            `INSERT INTO quiz_attempts (quiz_id, user_id, score, status, started_at, completed_at) 
             VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 day', NOW())
             ON CONFLICT DO NOTHING`,
            [quizId, studentId, score, score > 60 ? 'passed' : 'failed'],
          );
          attemptCount++;
        }
      }
    }

    log(`✅ Created ${attemptCount} quiz attempts`, 'success');

    // ==========================================
    // 9. CREATE DISCUSSIONS
    // ==========================================
    log('\n💬 Creating discussions...', 'info');

    let discussionCount = 0;
    for (const courseId of courseIds) {
      for (let i = 1; i <= 3; i++) {
        const result = await client.query(
          `INSERT INTO discussions (course_id, user_id, title, content, created_at) 
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id`,
          [courseId, studentIds[i % studentIds.length], `Question ${i}: How do I solve X?`, `I'm stuck on this problem...`, NOW()],
        );
        discussionCount++;

        // Add replies
        if (result.rows[0]?.id) {
          const discussionId = result.rows[0].id;
          const replyCount = Math.floor(Math.random() * 3) + 1;
          for (let j = 0; j < replyCount; j++) {
            await client.query(
              `INSERT INTO discussion_replies (discussion_id, user_id, content, created_at) 
               VALUES ($1, $2, $3, NOW())`,
              [discussionId, facultyIds[j % facultyIds.length], `Here's a hint: ${j + 1}...`],
            );
          }
        }
      }
    }

    log(`✅ Created ${discussionCount} discussions with replies`, 'success');

    // ==========================================
    // 10. CREATE RESOURCES (PYQs & NOTES)
    // ==========================================
    log('\n📖 Creating resources (PYQs & Notes)...', 'info');

    let resourceCount = 0;
    for (const courseId of courseIds) {
      // Create PYQs
      for (let i = 1; i <= 3; i++) {
        await client.query(
          `INSERT INTO course_resources (course_id, resource_type, title, description, url, created_by, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            courseId,
            'pyq',
            `Previous Year Question ${i}`,
            `Sample question from ${i} years ago`,
            `https://example.com/pyq/${i}`,
            facultyIds[0],
          ],
        );
        resourceCount++;
      }

      // Create Notes
      for (let i = 1; i <= 2; i++) {
        await client.query(
          `INSERT INTO course_resources (course_id, resource_type, title, description, url, created_by, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [courseId, 'note', `Lecture Notes ${i}`, `Summary of lecture ${i}`, `https://example.com/notes/${i}`, facultyIds[0]],
        );
        resourceCount++;
      }
    }

    log(`✅ Created ${resourceCount} resources (PYQs & Notes)`, 'success');

    // ==========================================
    // 11. CREATE ACHIEVEMENTS & GAMIFICATION
    // ==========================================
    log('\n🏆 Creating gamification data...', 'info');

    // Create achievements for students
    for (const studentId of studentIds.slice(0, 10)) {
      const xp = Math.floor(Math.random() * 5000) + 1000;
      const streak = Math.floor(Math.random() * 30);

      await client.query(
        `INSERT INTO user_achievements (user_id, xp_points, badges, streaks, level, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id) DO UPDATE SET xp_points = $2, streaks = $4
         `,
        [studentId, xp, JSON.stringify(['First Submit', 'Quiz Master']), streak],
      );
    }

    log(`✅ Created gamification records for ${Math.min(10, studentIds.length)} students`, 'success');

    // ==========================================
    // 12. CREATE LIVE LECTURES
    // ==========================================
    log('\n🎥 Creating live lectures...', 'info');

    let lectureCount = 0;
    for (const courseId of courseIds) {
      const lectureDate = new Date();
      lectureDate.setDate(lectureDate.getDate() + 7);

      await client.query(
        `INSERT INTO live_lectures (course_id, title, description, scheduled_time, meeting_url, instructor_id, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          courseId,
          `Live Lecture - ${courses[courseIds.indexOf(courseId)]?.name}`,
          'Interactive live session with Q&A',
          lectureDate,
          'https://meet.google.com/abc-def-ghi',
          facultyIds[0],
          'scheduled',
        ],
      );
      lectureCount++;
    }

    log(`✅ Created ${lectureCount} live lectures`, 'success');

    // ==========================================
    // 13. CREATE CODING QUESTIONS
    // ==========================================
    log('\n💻 Creating coding questions...', 'info');

    let codeQuestionCount = 0;
    const codingProblems = [
      { title: 'Two Sum', difficulty: 'easy', description: 'Find two numbers that add up to target' },
      { title: 'Merge Sorted Arrays', difficulty: 'medium', description: 'Merge two sorted arrays' },
      { title: 'Longest Substring', difficulty: 'hard', description: 'Find longest substring without repeating characters' },
    ];

    for (const courseId of courseIds) {
      for (const problem of codingProblems) {
        await client.query(
          `INSERT INTO code_questions (course_id, question_title, problem_description, difficulty_level, sample_input, sample_output, time_limit, memory_limit, test_cases, created_by, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            courseId,
            problem.title,
            problem.description,
            problem.difficulty,
            'Example input',
            'Example output',
            2,
            256,
            JSON.stringify([{ input: 'test1', output: 'result1' }]),
            facultyIds[0],
          ],
        );
        codeQuestionCount++;
      }
    }

    log(`✅ Created ${codeQuestionCount} coding questions`, 'success');

    // ==========================================
    // 14. CREATE AT-RISK STUDENT RECORDS
    // ==========================================
    log('\n⚠️  Creating at-risk student records...', 'info');

    let riskRecordCount = 0;
    for (let i = 0; i < 5; i++) {
      const studentId = studentIds[i];
      const marks = 30 + Math.random() * 30; // 30-60%
      const consistency = 20 + Math.random() * 30; // 20-50%
      const attendance = 20 + Math.random() * 40; // 20-60%
      const riskScore = (marks * 0.5 + consistency * 0.3 + attendance * 0.2) / 100;

      const riskLevel = riskScore < 0.3 ? 'high_priority' : riskScore < 0.65 ? 'watchlist' : 'on_track';

      await client.query(
        `INSERT INTO student_support_records (user_id, risk_score, risk_level, marks_percentage, consistency_score, attendance_percentage, last_updated) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (user_id) DO UPDATE SET risk_score = $2, risk_level = $3`,
        [studentId, riskScore, riskLevel, marks, consistency, attendance],
      );
      riskRecordCount++;
    }

    log(`✅ Created ${riskRecordCount} at-risk student records`, 'success');

    // ==========================================
    // COMMIT TRANSACTION
    // ==========================================
    await client.query('COMMIT');

    log('\n' + '='.repeat(60), 'success');
    log('✨ COMPREHENSIVE DEMO DATA SEEDING COMPLETE! ✨', 'success');
    log('='.repeat(60), 'success');

    log('\n📊 Summary:', 'info');
    log(`  ✅ Users: 1 admin + 3 faculty + 2 TAs + 15 students = 21 total`, 'success');
    log(`  ✅ Courses: ${courseIds.length}`, 'success');
    log(`  ✅ Assignments: ${assignmentIds.length}`, 'success');
    log(`  ✅ Submissions: ${submissionCount}`, 'success');
    log(`  ✅ Quizzes: ${quizIds.length}`, 'success');
    log(`  ✅ Quiz Questions: ${questionCount}`, 'success');
    log(`  ✅ Quiz Attempts: ${attemptCount}`, 'success');
    log(`  ✅ Discussions: ${discussionCount}`, 'success');
    log(`  ✅ Resources: ${resourceCount}`, 'success');
    log(`  ✅ Live Lectures: ${lectureCount}`, 'success');
    log(`  ✅ Coding Questions: ${codeQuestionCount}`, 'success');
    log(`  ✅ At-Risk Records: ${riskRecordCount}`, 'success');

    log('\n🔐 Test Credentials:', 'info');
    log('  Admin: admin@demo.com / password123', 'info');
    log('  Faculty: faculty1@demo.com / password123', 'info');
    log('  TA: ta1@demo.com / password123', 'info');
    log('  Student: student1@demo.com / password123', 'info');

    log('\n🚀 You can now start demoing the platform!', 'success');
    log('   npm run dev (in both backend and frontend)\n', 'success');

  } catch (err) {
    await client.query('ROLLBACK');
    log(`\n❌ Error: ${err.message}`, 'error');
    throw err;
  } finally {
    client.release();
  }
}

// Run the seed
seedComprehensiveData()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    log(`\n❌ Seed failed: ${err.message}`, 'error');
    process.exit(1);
  });
