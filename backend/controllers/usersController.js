// src/controllers/usersController.js
import { pool } from '../db/index.js';

/**
 * GET /api/users/by-email?email=...
 * or
 * GET /api/users/email/:email
 *
 * Authorization:
 *  - Admin can fetch any user
 *  - A user can fetch their own details (based on JWT email)
 *
 * Returns user fields (NOT password_hash)
 */
export async function getUserByEmail(req, res) {
  try {
    // Accept either query param or path param
    const email = (req.query.email || req.params.email || '').toString().trim();
    if (!email) return res.status(400).json({ error: 'Missing email parameter' });

    // Authorization: require authenticated user
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Allow if admin or requesting own record
    const requesterRole = req.user.role;
    const requesterEmail = req.user.email;

    if (requesterRole !== 'admin' && requesterEmail !== email) {
      return res.status(403).json({ error: 'Forbidden: can only fetch your own user or require admin role' });
    }

    const q = `
      SELECT id, email, name, role, department_id, roll_number, created_at, updated_at
      FROM users WHERE email = $1
      LIMIT 1
    `;
    const r = await pool.query(q, [email]);

    if (r.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    return res.json({ user: r.rows[0] });
  } catch (err) {
    console.error('getUserByEmail error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/users/profile
 *
 * Returns full profile data for the authenticated user, including department name and role-specific information
 */
export async function getUserProfile(req, res) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const userId = req.user.id;
    const userRole = req.user.role;

    // Get basic user info with department name
    const userQuery = `
      SELECT u.id, u.email, u.name, u.role, u.department_id, u.roll_number, u.created_at, u.updated_at, u.is_active,
             u.github_username, u.github_connected_at,
             d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `;
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    const profile = { ...userResult.rows[0] };

    // Add GitHub integration status
    profile.github_connected = !!profile.github_username;

    // Role-specific data
    if (userRole === 'student') {
      // Enrolled courses
      const enrollmentsQuery = `
        SELECT e.enrolled_at, co.term, co.section, c.code as course_code, c.title as course_title,
               f.name as faculty_name, co.max_capacity,
               COUNT(e2.student_id) as enrolled_students
        FROM enrollments e
        JOIN course_offerings co ON e.course_offering_id = co.id
        JOIN courses c ON co.course_id = c.id
        LEFT JOIN users f ON co.faculty_id = f.id
        LEFT JOIN enrollments e2 ON co.id = e2.course_offering_id
        WHERE e.student_id = $1
        GROUP BY e.enrolled_at, co.term, co.section, c.code, c.title, f.name, co.max_capacity, co.id
        ORDER BY e.enrolled_at DESC
      `;
      const enrollments = await pool.query(enrollmentsQuery, [userId]);
      profile.enrolledCourses = enrollments.rows;

      // Gamification stats
      const gamificationQuery = `
        SELECT total_points, current_streak, longest_streak, problems_solved,
               easy_solved, medium_solved, hard_solved, total_submissions,
               successful_submissions, average_time_seconds, level, experience_points
        FROM user_gamification_stats
        WHERE user_id = $1
      `;
      const gamification = await pool.query(gamificationQuery, [userId]);
      profile.gamificationStats = gamification.rows[0] || null;

      // Achievements
      const achievementsQuery = `
        SELECT a.name, a.description, a.icon, a.category, a.rarity, ua.unlocked_at
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = $1
        ORDER BY ua.unlocked_at DESC
      `;
      const achievements = await pool.query(achievementsQuery, [userId]);
      profile.achievements = achievements.rows;

    } else if (userRole === 'faculty') {
      // Courses taught
      const offeringsQuery = `
        SELECT co.id, co.term, co.section, c.code as course_code, c.title as course_title,
               co.max_capacity, COUNT(e.student_id) as enrolled_students
        FROM course_offerings co
        JOIN courses c ON co.course_id = c.id
        LEFT JOIN enrollments e ON co.id = e.course_offering_id
        WHERE co.faculty_id = $1
        GROUP BY co.id, co.term, co.section, c.code, c.title, co.max_capacity
        ORDER BY co.term DESC, co.section
      `;
      const offerings = await pool.query(offeringsQuery, [userId]);
      profile.offerings = offerings.rows;

      // Total students taught
      const totalStudentsQuery = `
        SELECT COUNT(DISTINCT e.student_id) as total_students
        FROM course_offerings co
        JOIN enrollments e ON co.id = e.course_offering_id
        WHERE co.faculty_id = $1
      `;
      const totalStudents = await pool.query(totalStudentsQuery, [userId]);
      profile.totalStudents = parseInt(totalStudents.rows[0].total_students) || 0;

    } else if (userRole === 'ta') {
      // TA assignments
      const taAssignmentsQuery = `
        SELECT co.term, co.section, c.code as course_code, c.title as course_title,
               f.name as faculty_name, ta.assigned_at
        FROM ta_assignments ta
        JOIN course_offerings co ON ta.course_offering_id = co.id
        JOIN courses c ON co.course_id = c.id
        LEFT JOIN users f ON co.faculty_id = f.id
        WHERE ta.ta_id = $1
        ORDER BY ta.assigned_at DESC
      `;
      const taAssignments = await pool.query(taAssignmentsQuery, [userId]);
      profile.taAssignments = taAssignments.rows;

      // Students assisted (from courses where TA is assigned)
      const studentsAssistedQuery = `
        SELECT COUNT(DISTINCT e.student_id) as students_assisted
        FROM ta_assignments ta
        JOIN course_offerings co ON ta.course_offering_id = co.id
        JOIN enrollments e ON co.id = e.course_offering_id
        WHERE ta.ta_id = $1
      `;
      const studentsAssisted = await pool.query(studentsAssistedQuery, [userId]);
      profile.studentsAssisted = parseInt(studentsAssisted.rows[0].students_assisted) || 0;

    } else if (userRole === 'admin') {
      // System overview for admin
      const systemStatsQuery = `
        SELECT
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
          (SELECT COUNT(*) FROM users WHERE role = 'faculty') as total_faculty,
          (SELECT COUNT(*) FROM users WHERE role = 'ta') as total_tas,
          (SELECT COUNT(*) FROM course_offerings) as total_offerings,
          (SELECT COUNT(*) FROM courses) as total_courses
      `;
      const systemStats = await pool.query(systemStatsQuery);
      profile.systemStats = systemStats.rows[0];
    }

    return res.json({ profile });
  } catch (err) {
    console.error('getUserProfile error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/users/profile
 *
 * Updates user profile (name, email, roll_number for students)
 */
export async function updateUserProfile(req, res) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const userId = req.user.id;
    const { name, email, roll_number } = req.body;

    // Validate input
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    if (email !== undefined && (typeof email !== 'string' || !email.includes('@'))) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (roll_number !== undefined && typeof roll_number !== 'string') {
      return res.status(400).json({ error: 'Invalid roll number' });
    }

    // Check if email is already taken by another user
    if (email !== undefined && email !== req.user.email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rowCount > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Update user
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name.trim());
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(email.trim().toLowerCase());
    }
    if (roll_number !== undefined) {
      updateFields.push(`roll_number = $${paramIndex++}`);
      updateValues.push(roll_number.trim());
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push(`updated_at = now()`);
    updateValues.push(userId);

    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, role, department_id, roll_number, created_at, updated_at
    `;

    const result = await pool.query(updateQuery, updateValues);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('updateUserProfile error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
