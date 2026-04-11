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
  const q = 'SELECT id, code, title, description, department_id, credits FROM courses ORDER BY code';
  const r = await pool.query(q);
  res.json(r.rows);
}

export async function listMyCourses(req, res) {
  const facultyId = Number(req.user?.id);
  if (!facultyId) {return res.status(401).json({ error: 'Unauthorized' });}
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
  if (!offeringId) {return res.status(400).json({ error: 'Missing offering id' });}

  let studentId;
  if (req.user?.role === 'student') {
    // Students can only enroll themselves
    studentId = Number(req.user.id);
  } else {
    studentId = Number(req.body.student_id);
    if (!studentId) {return res.status(400).json({ error: 'Missing student_id' });}

    // Check if faculty/ta is authorized for this offering
    if (req.user.role !== 'admin') {
      const checkQ = 'SELECT faculty_id FROM course_offerings WHERE id = $1';
      const checkR = await pool.query(checkQ, [offeringId]);
      if (checkR.rowCount === 0) {return res.status(404).json({ error: 'Course offering not found' });}

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
  if (!offeringId) {return res.status(400).json({ error: 'Missing offering id' });}
  let studentId;
  if (req.user?.role === 'student') {
    studentId = Number(req.user.id);
  } else {
    studentId = Number(req.body.student_id);
    if (!studentId) {return res.status(400).json({ error: 'Missing student_id' });}
  }
  await pool.query('DELETE FROM enrollments WHERE course_offering_id=$1 AND student_id=$2', [offeringId, studentId]);
  res.json({ success: true });
}

export async function listMyOfferings(req, res) {
  const facultyId = Number(req.user?.id);
  if (!facultyId) {return res.status(401).json({ error: 'Unauthorized' });}
  const q = `SELECT o.*, c.code as course_code, c.title as course_title
             FROM course_offerings o
             JOIN courses c ON o.course_id = c.id
             WHERE o.faculty_id = $1
             ORDER BY o.id DESC`;
  const r = await pool.query(q, [facultyId]);
  res.json(r.rows);
}

export async function listAvailableOfferings(req, res) {
  const userId = Number(req.user?.id);
  if (!userId) {return res.status(401).json({ error: 'Unauthorized' });}

  // Get all offerings that the student is not already enrolled in
  const q = `
    SELECT o.id, o.term, o.section, c.code as course_code, c.title as course_title, 
           c.id as course_id, o.faculty_id, o.max_capacity,
           COUNT(ce.id)::int as enrolled_count,
           (o.max_capacity - COUNT(ce.id))::int as available_seats
    FROM course_offerings o
    JOIN courses c ON o.course_id = c.id
    LEFT JOIN course_enrollments ce ON o.id = ce.course_offering_id
    WHERE o.id NOT IN (
      SELECT course_offering_id FROM course_enrollments WHERE user_id = $1
    )
    AND o.start_date <= NOW() AND o.end_date >= NOW()
    GROUP BY o.id, o.term, o.section, c.code, c.title, c.id, o.faculty_id, o.max_capacity
    ORDER BY c.code, o.term DESC, o.section
  `;
  
  const r = await pool.query(q, [userId]);
  res.json(r.rows);
}

export async function deleteCourse(req, res) {
  const courseId = Number(req.params.courseId);
  if (!courseId) {return res.status(400).json({ error: 'Missing course id' });}

  // Check if course has any offerings
  const offeringCheck = await pool.query('SELECT COUNT(*)::int as count FROM course_offerings WHERE course_id = $1', [courseId]);
  if (offeringCheck.rows[0].count > 0) {
    return res.status(400).json({ error: 'Cannot delete course with existing offerings. Delete offerings first.' });
  }

  // Delete the course
  const q = 'DELETE FROM courses WHERE id = $1 RETURNING *';
  const r = await pool.query(q, [courseId]);
  if (r.rowCount === 0) {return res.status(404).json({ error: 'Course not found' });}

  res.json({ success: true, deleted: r.rows[0] });
}

export async function getCourseCardData(req, res) {
  const userId = req.user?.id;

  if (!userId) {return res.status(401).json({ error: 'Unauthorized' });}

  try {
    const now = new Date();
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

    // Get all assignments for these offerings in one query (code assignments are now contests)
    const assignmentsQuery = `
      SELECT
        a.id,
        a.course_offering_id,
        a.title,
        a.due_at,
        a.release_at,
        a.max_score
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
    const latestSubmissionByAssignment = new Map();
    submissions.rows.forEach((submission) => {
      if (!submission.assignment_id) return;
      const key = String(submission.assignment_id);
      const existing = latestSubmissionByAssignment.get(key);
      if (!existing) {
        latestSubmissionByAssignment.set(key, submission);
        return;
      }
      const existingAt = existing.submitted_at ? new Date(existing.submitted_at).getTime() : 0;
      const nextAt = submission.submitted_at ? new Date(submission.submitted_at).getTime() : 0;
      if (nextAt >= existingAt) {
        latestSubmissionByAssignment.set(key, submission);
      }
    });

    const latestAttemptByQuiz = new Map();
    quizAttempts.rows.forEach((attempt) => {
      if (!attempt.quiz_id) return;
      const key = String(attempt.quiz_id);
      const existing = latestAttemptByQuiz.get(key);
      if (!existing) {
        latestAttemptByQuiz.set(key, attempt);
        return;
      }
      const existingAt = existing.finished_at ? new Date(existing.finished_at).getTime() : 0;
      const nextAt = attempt.finished_at ? new Date(attempt.finished_at).getTime() : 0;
      if (nextAt >= existingAt) {
        latestAttemptByQuiz.set(key, attempt);
      }
    });

    const courseCardData = enrolledOfferings.rows.map(offering => {
      const offeringAssignments = assignments.rows.filter(a => a.course_offering_id === offering.id);
      const offeringQuizzes = quizzes.rows.filter(q => q.course_offering_id === offering.id);
      const offeringDiscussions = discussions.rows.find(d => d.course_offering_id === offering.id);

      const submittedAssignmentIds = new Set(
        offeringAssignments
          .map((assignment) => String(assignment.id))
          .filter((id) => latestSubmissionByAssignment.has(id))
      );

      const pendingAssignments = offeringAssignments.filter(a => {
        const assignmentId = String(a.id);
        const notSubmitted = !submittedAssignmentIds.has(assignmentId);
        return notSubmitted && (!a.due_at || new Date(a.due_at) >= now);
      }).length;

      const overdueAssignments = offeringAssignments.filter(a => {
        const assignmentId = String(a.id);
        const notSubmitted = !submittedAssignmentIds.has(assignmentId);
        return notSubmitted && a.due_at && new Date(a.due_at) < now;
      }).length;

      const completedAssignments = submittedAssignmentIds.size;

      let assignmentScoreSum = 0;
      let assignmentScoreCount = 0;
      offeringAssignments.forEach((assignment) => {
        const submission = latestSubmissionByAssignment.get(String(assignment.id));
        if (!submission) return;
        if (submission.final_score === null || submission.final_score === undefined) return;
        if (!assignment.max_score) return;
        assignmentScoreSum += (Number(submission.final_score) / Number(assignment.max_score)) * 100;
        assignmentScoreCount += 1;
      });

      // Count pending quizzes (not attempted)
      const attemptedQuizIds = new Set(
        offeringQuizzes
          .map((quiz) => String(quiz.id))
          .filter((id) => latestAttemptByQuiz.has(id))
      );

      const pendingQuizzes = offeringQuizzes.filter(q => {
        const quizId = String(q.id);
        const notAttempted = !attemptedQuizIds.has(quizId);
        const stillOpen = !q.end_at || new Date(q.end_at) >= now;
        return notAttempted && stillOpen;
      }).length;

      const missedQuizzes = offeringQuizzes.filter(q => {
        const quizId = String(q.id);
        const notAttempted = !attemptedQuizIds.has(quizId);
        return notAttempted && q.end_at && new Date(q.end_at) < now;
      }).length;

      const completedQuizzes = attemptedQuizIds.size;

      let quizScoreSum = 0;
      let quizScoreCount = 0;
      offeringQuizzes.forEach((quiz) => {
        const attempt = latestAttemptByQuiz.get(String(quiz.id));
        if (!attempt) return;
        if (attempt.score === null || attempt.score === undefined) return;
        if (!quiz.max_score) return;
        quizScoreSum += (Number(attempt.score) / Number(quiz.max_score)) * 100;
        quizScoreCount += 1;
      });

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
        overdue_assignments: overdueAssignments,
        missed_quizzes: missedQuizzes,
        completed_assignments: completedAssignments,
        completed_quizzes: completedQuizzes,
        assignment_average: assignmentScoreCount ? Math.round(assignmentScoreSum / assignmentScoreCount) : null,
        quiz_average: quizScoreCount ? Math.round(quizScoreSum / quizScoreCount) : null,
        unread_notifications: unreadNotifications
      };
    });

    const summary = courseCardData.reduce(
      (acc, course) => {
        acc.pending_assignments += course.pending_assignments || 0;
        acc.pending_quizzes += course.pending_quizzes || 0;
        acc.overdue_assignments += course.overdue_assignments || 0;
        acc.missed_quizzes += course.missed_quizzes || 0;
        acc.completed_assignments += course.completed_assignments || 0;
        acc.completed_quizzes += course.completed_quizzes || 0;
        acc.unread_notifications += course.unread_notifications || 0;
        if (course.assignment_average !== null && course.assignment_average !== undefined) {
          acc.assignment_average_sum += course.assignment_average;
          acc.assignment_average_count += 1;
        }
        if (course.quiz_average !== null && course.quiz_average !== undefined) {
          acc.quiz_average_sum += course.quiz_average;
          acc.quiz_average_count += 1;
        }
        return acc;
      },
      {
        pending_assignments: 0,
        pending_quizzes: 0,
        overdue_assignments: 0,
        missed_quizzes: 0,
        completed_assignments: 0,
        completed_quizzes: 0,
        unread_notifications: 0,
        assignment_average_sum: 0,
        assignment_average_count: 0,
        quiz_average_sum: 0,
        quiz_average_count: 0
      }
    );

    const overall_assignment_average = summary.assignment_average_count
      ? Math.round(summary.assignment_average_sum / summary.assignment_average_count)
      : null;
    const overall_quiz_average = summary.quiz_average_count
      ? Math.round(summary.quiz_average_sum / summary.quiz_average_count)
      : null;
    const overall_average =
      overall_assignment_average !== null && overall_quiz_average !== null
        ? Math.round((overall_assignment_average + overall_quiz_average) / 2)
        : overall_assignment_average ?? overall_quiz_average ?? null;

    res.json({
      courses: courseCardData,
      summary: {
        pending_assignments: summary.pending_assignments,
        pending_quizzes: summary.pending_quizzes,
        overdue_assignments: summary.overdue_assignments,
        missed_quizzes: summary.missed_quizzes,
        completed_assignments: summary.completed_assignments,
        completed_quizzes: summary.completed_quizzes,
        unread_notifications: summary.unread_notifications,
        assignment_average: overall_assignment_average,
        quiz_average: overall_quiz_average,
        overall_average
      }
    });

  } catch (error) {
    console.error('Error fetching course card data:', error);
    res.status(500).json({ error: 'Failed to fetch course data' });
  }
}

export async function offeringOverview(req, res) {
  const offeringId = Number(req.params.offeringId);
  if (!offeringId) {return res.status(400).json({ error: 'Missing offering id' });}

  // Basic offering info with course and faculty
  const q = `SELECT o.*, c.code as course_code, c.title as course_title, u.id as faculty_id, u.name as faculty_name, u.email as faculty_email
             FROM course_offerings o
             JOIN courses c ON o.course_id = c.id
             JOIN users u ON o.faculty_id = u.id
             WHERE o.id = $1 LIMIT 1`;
  const r = await pool.query(q, [offeringId]);
  if (r.rowCount === 0) {return res.status(404).json({ error: 'Offering not found' });}
  const offering = r.rows[0];

  // Enrollment count
  const enr = await pool.query('SELECT COUNT(*)::int as count FROM enrollments WHERE course_offering_id=$1', [offeringId]);
  offering.enrollment_count = enr.rows[0].count;

  // TAs
  const tasR = await pool.query('SELECT ta.id as ta_id, u.name, u.email, ta.role FROM ta_assignments ta JOIN users u ON ta.ta_id = u.id WHERE ta.course_offering_id=$1', [offeringId]);
  offering.tas = tasR.rows;

  // Upcoming assignments
  const asR = await pool.query('SELECT id, title, due_at, release_at FROM assignments WHERE course_offering_id=$1 ORDER BY due_at NULLS LAST', [offeringId]);
  offering.assignments = asR.rows;

  res.json({ offering });
}
