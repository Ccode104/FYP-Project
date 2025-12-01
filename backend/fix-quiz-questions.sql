-- Fix quiz questions to reference correct quiz IDs
-- First, check current state
SELECT 'Current quizzes:' as info;
SELECT id, title FROM quizzes ORDER BY id;

SELECT 'Current quiz questions:' as info;
SELECT id, quiz_id, LEFT(question_text, 50) || '...' as question_preview
FROM quiz_questions ORDER BY quiz_id, id;

-- Update quiz_questions to use correct quiz IDs
-- Map old quiz IDs to new ones:
-- Quiz ID 1 (old) -> Quiz ID 12 (Database Design and SQL Quiz)
-- Quiz ID 2 (old) -> Quiz ID 13 (Programming Fundamentals Quiz)
-- Quiz ID 3 (old) -> Quiz ID 12 (Database Design)
-- Quiz ID 4 (old) -> Quiz ID 12 (Database Design)

UPDATE quiz_questions
SET quiz_id = CASE
  WHEN quiz_id = 1 THEN 12  -- Python Basics -> Database Design
  WHEN quiz_id = 2 THEN 13  -- Programming Concepts -> Programming Fundamentals
  WHEN quiz_id = 3 THEN 12  -- Algorithm Analysis -> Database Design
  WHEN quiz_id = 4 THEN 12  -- Database Design -> Database Design
  ELSE quiz_id
END
WHERE quiz_id IN (1,2,3,4);

-- Verify the update
SELECT 'Updated quiz questions:' as info;
SELECT q.id, q.quiz_id, qu.title as quiz_title, LEFT(q.question_text, 60) || '...' as question_preview
FROM quiz_questions q
JOIN quizzes qu ON q.quiz_id = qu.id
ORDER BY q.quiz_id, q.id;

-- Count questions per quiz
SELECT 'Questions per quiz:' as info;
SELECT quiz_id, COUNT(*) as question_count
FROM quiz_questions
GROUP BY quiz_id
ORDER BY quiz_id;