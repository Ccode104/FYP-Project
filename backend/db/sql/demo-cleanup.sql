DELETE FROM live_lecture_participants
WHERE live_lecture_id IN (
  SELECT ll.id
  FROM live_lectures ll
  JOIN course_offerings co ON co.id = ll.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM live_lectures
WHERE course_offering_id IN (
  SELECT co.id
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM ticket_comments
WHERE ticket_id IN (
  SELECT id FROM support_tickets
  WHERE course_offering_id IN (
    SELECT co.id
    FROM course_offerings co
    JOIN courses c ON c.id = co.course_id
    WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
  )
);

DELETE FROM support_tickets
WHERE course_offering_id IN (
  SELECT co.id
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM admin_activities
WHERE entity_name LIKE 'Demo:%';

DELETE FROM messages
WHERE sender_id IN (
  SELECT id FROM users WHERE email IN (
    'student@gmail.com',
    'teacher@gmail.com',
    'ta@gmail.com',
    'superadmin@gmail.com',
    'admin@gmail.com',
    'student2@gmail.com',
    'student3@gmail.com'
  )
)
OR receiver_id IN (
  SELECT id FROM users WHERE email IN (
    'student@gmail.com',
    'teacher@gmail.com',
    'ta@gmail.com',
    'superadmin@gmail.com',
    'admin@gmail.com',
    'student2@gmail.com',
    'student3@gmail.com'
  )
);

DELETE FROM regrade_requests
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM grading_tasks
WHERE assignment_id IN (
  SELECT a.id
  FROM assignments a
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM rubric_grades
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM submission_grades
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM component_grades
WHERE assignment_submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM assignment_component_submissions
WHERE assignment_submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM code_submission_results
WHERE code_submission_id IN (
  SELECT cs.id
  FROM code_submissions cs
  JOIN assignment_submissions s ON s.id = cs.submission_id
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM github_submissions
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM file_submissions
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM mixed_submissions
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM submission_files
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM code_submissions
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM assignment_submissions
WHERE assignment_id IN (
  SELECT a.id
  FROM assignments a
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM resume_requests
WHERE quiz_attempt_id IN (
  SELECT qa.id
  FROM quiz_attempts qa
  JOIN quizzes q ON q.id = qa.quiz_id
  JOIN course_offerings co ON co.id = q.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM proctoring_analytics
WHERE session_id IN (
  SELECT ps.id
  FROM proctoring_sessions ps
  JOIN quiz_attempts qa ON qa.id = ps.quiz_attempt_id
  JOIN quizzes q ON q.id = qa.quiz_id
  JOIN course_offerings co ON co.id = q.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM proctoring_violations
WHERE session_id IN (
  SELECT ps.id
  FROM proctoring_sessions ps
  JOIN quiz_attempts qa ON qa.id = ps.quiz_attempt_id
  JOIN quizzes q ON q.id = qa.quiz_id
  JOIN course_offerings co ON co.id = q.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM proctoring_sessions
WHERE quiz_attempt_id IN (
  SELECT qa.id
  FROM quiz_attempts qa
  JOIN quizzes q ON q.id = qa.quiz_id
  JOIN course_offerings co ON co.id = q.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM quiz_attempts
WHERE quiz_id IN (
  SELECT q.id
  FROM quizzes q
  JOIN course_offerings co ON co.id = q.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM quiz_questions
WHERE quiz_id IN (
  SELECT q.id
  FROM quizzes q
  JOIN course_offerings co ON co.id = q.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM quizzes
WHERE course_offering_id IN (
  SELECT co.id
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM assignment_questions
WHERE assignment_id IN (
  SELECT a.id
  FROM assignments a
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM assignments
WHERE course_offering_id IN (
  SELECT co.id
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM resources
WHERE course_offering_id IN (
  SELECT co.id
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM discussion_messages
WHERE course_offering_id IN (
  SELECT co.id
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM ta_assignments
WHERE course_offering_id IN (
  SELECT co.id
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM enrollments
WHERE course_offering_id IN (
  SELECT co.id
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM rubrics
WHERE course_offering_id IN (
  SELECT co.id
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  WHERE c.code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM faculty_courses
WHERE course_id IN (
  SELECT id FROM courses WHERE code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM course_offerings
WHERE course_id IN (
  SELECT id FROM courses WHERE code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM courses
WHERE code IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO');

DELETE FROM user_achievements
WHERE user_id IN (
  SELECT id FROM users WHERE email IN (
    'student@gmail.com',
    'teacher@gmail.com',
    'ta@gmail.com',
    'superadmin@gmail.com',
    'admin@gmail.com',
    'student2@gmail.com',
    'student3@gmail.com'
  )
);

DELETE FROM user_gamification_stats
WHERE user_id IN (
  SELECT id FROM users WHERE email IN (
    'student@gmail.com',
    'teacher@gmail.com',
    'ta@gmail.com',
    'superadmin@gmail.com',
    'admin@gmail.com',
    'student2@gmail.com',
    'student3@gmail.com'
  )
);

DELETE FROM leaderboards
WHERE user_id IN (
  SELECT id FROM users WHERE email IN (
    'student@gmail.com',
    'teacher@gmail.com',
    'ta@gmail.com',
    'superadmin@gmail.com',
    'admin@gmail.com',
    'student2@gmail.com',
    'student3@gmail.com'
  )
);

DELETE FROM notifications
WHERE user_id IN (
  SELECT id FROM users WHERE email IN (
    'student@gmail.com',
    'teacher@gmail.com',
    'ta@gmail.com',
    'superadmin@gmail.com',
    'admin@gmail.com',
    'student2@gmail.com',
    'student3@gmail.com'
  )
);

DELETE FROM regrade_requests
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = s.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM rubric_grades
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = s.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM submission_grades
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = s.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM component_grades
WHERE assignment_submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = s.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM assignment_component_submissions
WHERE assignment_submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = s.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM code_submission_results
WHERE code_submission_id IN (
  SELECT cs.id
  FROM code_submissions cs
  JOIN assignment_submissions s ON s.id = cs.submission_id
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = s.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM github_submissions
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = s.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM file_submissions
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = s.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM mixed_submissions
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = s.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM submission_files
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = s.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM code_submissions
WHERE submission_id IN (
  SELECT s.id
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = s.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM assignment_submissions
WHERE student_id IN (
  SELECT id FROM users WHERE email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
)
AND assignment_id IN (
  SELECT a.id
  FROM assignments a
  JOIN course_offerings co ON co.id = a.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM resume_requests
WHERE quiz_attempt_id IN (
  SELECT qa.id
  FROM quiz_attempts qa
  JOIN quizzes q ON q.id = qa.quiz_id
  JOIN course_offerings co ON co.id = q.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = qa.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM proctoring_analytics
WHERE session_id IN (
  SELECT ps.id
  FROM proctoring_sessions ps
  JOIN quiz_attempts qa ON qa.id = ps.quiz_attempt_id
  JOIN quizzes q ON q.id = qa.quiz_id
  JOIN course_offerings co ON co.id = q.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = qa.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM proctoring_violations
WHERE session_id IN (
  SELECT ps.id
  FROM proctoring_sessions ps
  JOIN quiz_attempts qa ON qa.id = ps.quiz_attempt_id
  JOIN quizzes q ON q.id = qa.quiz_id
  JOIN course_offerings co ON co.id = q.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = qa.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM proctoring_sessions
WHERE quiz_attempt_id IN (
  SELECT qa.id
  FROM quiz_attempts qa
  JOIN quizzes q ON q.id = qa.quiz_id
  JOIN course_offerings co ON co.id = q.course_offering_id
  JOIN courses c ON c.id = co.course_id
  JOIN users u ON u.id = qa.student_id
  WHERE u.email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
    AND c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM quiz_attempts
WHERE student_id IN (
  SELECT id FROM users WHERE email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
)
AND quiz_id IN (
  SELECT q.id
  FROM quizzes q
  JOIN course_offerings co ON co.id = q.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);

DELETE FROM enrollments
WHERE student_id IN (
  SELECT id FROM users WHERE email IN ('student@gmail.com', 'student2@gmail.com', 'student3@gmail.com')
)
AND course_offering_id IN (
  SELECT co.id
  FROM course_offerings co
  JOIN courses c ON c.id = co.course_id
  WHERE c.code NOT IN ('CSE101-DEMO', 'CSE201-DEMO', 'CSE301-DEMO')
);
