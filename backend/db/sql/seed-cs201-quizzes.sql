-- Quiz data seed for CS201 course
-- Run this when DATABASE_URL is available

-- Insert quizzes for CS201 course offering
-- Update the course_offering_id to match your CS201 course

-- Example: Find CS201 course offering
-- SELECT id FROM course_offerings WHERE course_code LIKE '%CS201%';

-- Insert quizzes (replace course_offering_id with the actual ID)
-- For now, using NULL - update this after finding the course ID
INSERT INTO quizzes (course_offering_id, title, description, start_at, end_at, duration_minutes, max_score, status, created_by)
VALUES 
  -- Completed quizzes
  ((SELECT id FROM course_offerings WHERE course_code = 'CS201' LIMIT 1), 'Introduction to Big O', 'Test your understanding of Big O notation', '2024-09-12 10:30:00', '2024-09-12 11:30:00', 60, 100, 'completed', (SELECT id FROM users WHERE email = 'teacher@gmail.com' LIMIT 1)),
  ((SELECT id FROM course_offerings WHERE course_code = 'CS201' LIMIT 1), 'Sorting Fundamentals', 'Test your understanding of sorting algorithms', '2024-08-28 14:00:00', '2024-08-28 15:00:00', 60, 100, 'archived', (SELECT id FROM users WHERE email = 'teacher@gmail.com' LIMIT 1)),
  
  -- Scheduled quizzes
  ((SELECT id FROM course_offerings WHERE course_code = 'CS201' LIMIT 1), 'Dynamic Programming Mid-Term', 'Mid-term exam on dynamic programming', '2024-10-24 10:30:00', '2024-10-24 11:30:00', 60, 100, 'scheduled', (SELECT id FROM users WHERE email = 'teacher@gmail.com' LIMIT 1)),
  ((SELECT id FROM course_offerings WHERE course_code = 'CS201' LIMIT 1), 'Graph Theory & BFS/DFS', 'Test on graph traversal algorithms', '2024-11-02 14:00:00', '2024-11-02 14:45:00', 45, 100, 'scheduled', (SELECT id FROM users WHERE email = 'teacher@gmail.com' LIMIT 1))
ON CONFLICT DO NOTHING
RETURNING id, title, status;