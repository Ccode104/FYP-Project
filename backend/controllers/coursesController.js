import { pool } from '../db/index.js';

export async function createCourse(req, res) {
  const { code, title, description, department_id, credits } = req.body;

  // Only admins can create courses (faculty can create offerings but not courses)
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized - only admins can create courses' });
  }

  const q = `INSERT INTO courses (code, title, description, department_id, credits)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`;
  const r = await pool.query(q, [code, title, description, department_id || null, credits || null]);
  res.json(r.rows[0]);
}

export async function listCourses(req, res) {
  const q = `SELECT id, code, title, description, department_id, credits FROM courses ORDER BY code`;
  const r = await pool.query(q);
  res.json(r.rows);
}

export async function listMyCourses(req, res) {
  const facultyId = Number(req.user?.id);
  if (!facultyId) return res.status(401).json({ error: 'Unauthorized' });
  const q = `SELECT DISTINCT c.id, c.code, c.title, c.description, c.department_id, c.credits
             FROM course_offerings o
             JOIN courses c ON o.course_id = c.id
             WHERE o.faculty_id = $1
             ORDER BY c.code`;
  const r = await pool.query(q, [facultyId]);
  res.json(r.rows);
}

export async function createOffering(req, res) {
  const { course_id, term, section, faculty_id, max_capacity, start_date, end_date } = req.body;
  console.log(req.body);

  // Check if user has permission to create offerings
  if (req.user.role !== 'admin') {
    // Faculty can only create offerings where they are the faculty
    if (req.user.role === 'faculty' && req.user.id !== Number(faculty_id)) {
      return res.status(403).json({ error: 'Not authorized - you can only create offerings for yourself' });
    }
    // TA cannot create offerings
    if (req.user.role === 'ta') {
      return res.status(403).json({ error: 'Not authorized - TAs cannot create course offerings' });
    }
  }

  const q = `INSERT INTO course_offerings (course_id, term, section, faculty_id, max_capacity, start_date, end_date)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
  const r = await pool.query(q, [course_id, term, section, faculty_id, max_capacity || null, start_date || null, end_date || null]);
  res.json(r.rows[0]);
}

export async function enroll(req, res) {
  const offeringId = Number(req.params.offeringId);
  if (!offeringId) return res.status(400).json({ error: 'Missing offering id' });

  let studentId;
  if (req.user?.role === 'student') {
    // Students can only enroll themselves
    studentId = Number(req.user.id);
  } else {
    studentId = Number(req.body.student_id);
    if (!studentId) return res.status(400).json({ error: 'Missing student_id' });

    // Check if faculty/ta is authorized for this offering
    if (req.user.role !== 'admin') {
      const checkQ = `SELECT faculty_id FROM course_offerings WHERE id = $1`;
      const checkR = await pool.query(checkQ, [offeringId]);
      if (checkR.rowCount === 0) return res.status(404).json({ error: 'Course offering not found' });

      const offering = checkR.rows[0];
      if (req.user.role === 'faculty' && req.user.id !== offering.faculty_id) {
        return res.status(403).json({ error: 'Not authorized - you can only enroll students in your own courses' });
      }
      // For TA, check if they are assigned to this offering
      if (req.user.role === 'ta') {
        const taCheck = await pool.query('SELECT 1 FROM ta_assignments WHERE ta_id = $1 AND course_offering_id = $2', [req.user.id, offeringId]);
        if (taCheck.rowCount === 0) {
          return res.status(403).json({ error: 'Not authorized - you are not assigned to this course' });
        }
      }
    }
  }

  const q = `INSERT INTO enrollments (course_offering_id, student_id)
             VALUES ($1,$2)
             ON CONFLICT DO NOTHING
             RETURNING *`;
  const r = await pool.query(q, [offeringId, studentId]);
  res.json({ success: true, row: r.rows[0] || null });
}

export async function unenroll(req, res) {
  const offeringId = Number(req.params.offeringId);
  if (!offeringId) return res.status(400).json({ error: 'Missing offering id' });
  let studentId;
  if (req.user?.role === 'student') {
    studentId = Number(req.user.id);
  } else {
    studentId = Number(req.body.student_id);
    if (!studentId) return res.status(400).json({ error: 'Missing student_id' });
  }
  await pool.query(`DELETE FROM enrollments WHERE course_offering_id=$1 AND student_id=$2`, [offeringId, studentId]);
  res.json({ success: true });
}

export async function listMyOfferings(req, res) {
  const facultyId = Number(req.user?.id);
  if (!facultyId) return res.status(401).json({ error: 'Unauthorized' });
  const q = `SELECT o.*, c.code as course_code, c.title as course_title
             FROM course_offerings o
             JOIN courses c ON o.course_id = c.id
             WHERE o.faculty_id = $1
             ORDER BY o.id DESC`;
  const r = await pool.query(q, [facultyId]);
  res.json(r.rows);
}

export async function deleteCourse(req, res) {
  const courseId = Number(req.params.courseId);
  if (!courseId) return res.status(400).json({ error: 'Missing course id' });

  // Check if course has any offerings
  const offeringCheck = await pool.query(`SELECT COUNT(*)::int as count FROM course_offerings WHERE course_id = $1`, [courseId]);
  if (offeringCheck.rows[0].count > 0) {
    return res.status(400).json({ error: 'Cannot delete course with existing offerings. Delete offerings first.' });
  }

  // Delete the course
  const q = `DELETE FROM courses WHERE id = $1 RETURNING *`;
  const r = await pool.query(q, [courseId]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Course not found' });

  res.json({ success: true, deleted: r.rows[0] });
}

export async function getCourseCardData(req, res) {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Get all enrolled course offerings for the student
    const enrolledOfferingsQuery = `
      SELECT
        o.id,
        o.term,
        o.section,
        c.code as course_code,
        c.title as course_title,
        c.description as course_description,
        f.name as faculty_name,
        f.email as faculty_email
      FROM enrollments e
      JOIN course_offerings o ON e.course_offering_id = o.id
      JOIN courses c ON o.course_id = c.id
      LEFT JOIN users f ON o.faculty_id = f.id
      WHERE e.student_id = $1 AND e.status = 'active'
      ORDER BY o.term DESC, c.code ASC
    `;

    const enrolledOfferings = await pool.query(enrolledOfferingsQuery, [userId]);

    if (enrolledOfferings.rows.length === 0) {
      return res.json({ courses: [] });
    }

    const offeringIds = enrolledOfferings.rows.map(row => row.id);

    // Get all assignments for these offerings in one query
    const assignmentsQuery = `
      SELECT
        a.id,
        a.course_offering_id,
        a.title,
        a.assignment_type,
        a.due_at,
        a.release_at,
        a.total_points
      FROM assignments a
      WHERE a.course_offering_id = ANY($1)
        AND (a.release_at IS NULL OR a.release_at <= NOW())
      ORDER BY a.due_at ASC NULLS LAST
    `;

    const assignments = await pool.query(assignmentsQuery, [offeringIds]);

    // Get all quizzes for these offerings in one query
    const quizzesQuery = `
      SELECT
        q.id,
        q.course_offering_id,
        q.title,
        q.start_at,
        q.end_at,
        q.max_score,
        q.is_proctored,
        q.time_limit
      FROM quizzes q
      WHERE q.course_offering_id = ANY($1)
        AND q.start_at <= NOW()
      ORDER BY q.end_at ASC NULLS LAST
    `;

    const quizzes = await pool.query(quizzesQuery, [offeringIds]);

    // Get all submissions for this student in one query
    const submissionsQuery = `
      SELECT
        s.assignment_id,
        s.submitted_at,
        s.final_score,
        s.status
      FROM assignment_submissions s
      WHERE s.student_id = $1
    `;

    const submissions = await pool.query(submissionsQuery, [userId]);

    // Get all quiz attempts for this student in one query
    const quizAttemptsQuery = `
      SELECT
        qa.quiz_id,
        qa.score,
        qa.finished_at,
        qa.violated
      FROM quiz_attempts qa
      WHERE qa.student_id = $1
    `;

    const quizAttempts = await pool.query(quizAttemptsQuery, [userId]);

    // Get discussion counts for each offering (simplified)
    const discussionsQuery = `
      SELECT
        course_offering_id,
        COUNT(*) as total_messages,
        0 as unread_count
      FROM discussion_messages
      WHERE course_offering_id = ANY($1)
      GROUP BY course_offering_id
    `;

    const discussions = await pool.query(discussionsQuery, [offeringIds]);

    // Process the data to create course card data
    const courseCardData = enrolledOfferings.rows.map(offering => {
      const offeringAssignments = assignments.rows.filter(a => a.course_offering_id === offering.id);
      const offeringQuizzes = quizzes.rows.filter(q => q.course_offering_id === offering.id);
      const offeringDiscussions = discussions.rows.find(d => d.course_offering_id === offering.id);

      // Count pending assignments (not submitted and valid types)
      const submittedAssignmentIds = new Set(
        submissions.rows
          .filter(s => s.assignment_id)
          .map(s => String(s.assignment_id))
      );

      const pendingAssignments = offeringAssignments.filter(a => {
        const assignmentId = String(a.id);
        const notSubmitted = !submittedAssignmentIds.has(assignmentId);
        const isValidType = ['code', 'file', 'pdf', 'ppt', 'mixed'].includes(a.assignment_type);
        return notSubmitted && isValidType;
      }).length;

      // Count pending quizzes (not attempted)
      const attemptedQuizIds = new Set(
        quizAttempts.rows
          .filter(qa => qa.quiz_id)
          .map(qa => String(qa.quiz_id))
      );

      const pendingQuizzes = offeringQuizzes.filter(q => {
        const quizId = String(q.id);
        return !attemptedQuizIds.has(quizId);
      }).length;

      // Get unread discussion count
      const unreadNotifications = offeringDiscussions ? parseInt(offeringDiscussions.unread_count) || 0 : 0;

      return {
        id: offering.id,
        term: offering.term,
        section: offering.section,
        course_code: offering.course_code,
        course_title: offering.course_title,
        course_description: offering.course_description,
        faculty_name: offering.faculty_name,
        faculty_email: offering.faculty_email,
        pending_assignments: pendingAssignments,
        pending_quizzes: pendingQuizzes,
        unread_notifications: unreadNotifications
      };
    });

    res.json({ courses: courseCardData });

  } catch (error) {
    console.error('Error fetching course card data:', error);
    res.status(500).json({ error: 'Failed to fetch course data' });
  }
}

export async function offeringOverview(req, res) {
  const offeringId = Number(req.params.offeringId);
  if (!offeringId) return res.status(400).json({ error: 'Missing offering id' });

  // Basic offering info with course and faculty
  const q = `SELECT o.*, c.code as course_code, c.title as course_title, u.id as faculty_id, u.name as faculty_name, u.email as faculty_email
             FROM course_offerings o
             JOIN courses c ON o.course_id = c.id
             JOIN users u ON o.faculty_id = u.id
             WHERE o.id = $1 LIMIT 1`;
  const r = await pool.query(q, [offeringId]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Offering not found' });
  const offering = r.rows[0];

  // Enrollment count
  const enr = await pool.query(`SELECT COUNT(*)::int as count FROM enrollments WHERE course_offering_id=$1`, [offeringId]);
  offering.enrollment_count = enr.rows[0].count;

  // TAs
  const tasR = await pool.query(`SELECT ta.id as ta_id, u.name, u.email, ta.role FROM ta_assignments ta JOIN users u ON ta.ta_id = u.id WHERE ta.course_offering_id=$1`, [offeringId]);
  offering.tas = tasR.rows;

  // Upcoming assignments
  const asR = await pool.query(`SELECT id, title, due_at, release_at FROM assignments WHERE course_offering_id=$1 ORDER BY due_at NULLS LAST`, [offeringId]);
  offering.assignments = asR.rows;

  res.json({ offering });
}
