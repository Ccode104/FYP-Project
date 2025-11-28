-- Update existing assignments with new types and descriptions
-- This script updates the assignments to match the user's requirements

-- Update assignment 1: Make it a mixed assignment with new name and description
UPDATE assignments SET
  title = 'Practice: Basic Programming Exercises',
  description = 'Complete a series of basic programming exercises covering fundamental concepts. Create a GitHub repository with your solutions and submit the repository link.',
  assignment_type = 'mixed'
WHERE id = 1;

-- Update assignment 5: Make it a PPT assignment
UPDATE assignments SET
  title = 'Advanced Database Design Presentation',
  description = 'Create a comprehensive presentation on advanced database design principles including normalization, indexing strategies, and performance optimization. Upload your PPT file to Google Drive and submit the shareable link.',
  assignment_type = 'ppt'
WHERE id = 5;

-- Update assignment 6: Make it a PDF assignment
UPDATE assignments SET
  title = 'Database Query Optimization Report',
  description = 'Write a detailed report on SQL query optimization techniques including execution plans, indexing strategies, and performance monitoring. Submit your report as a PDF file uploaded to Google Drive.',
  assignment_type = 'pdf'
WHERE id = 6;

-- Add detailed descriptions to other assignments for consistency
UPDATE assignments SET
  description = 'Write a simple program that prints "Hello, World!" in Python. Focus on proper syntax, code structure, and basic output operations.'
WHERE id = 1 AND assignment_type = 'code';

UPDATE assignments SET
  description = 'Implement a basic calculator with addition, subtraction, multiplication, and division operations. Include input validation and error handling.'
WHERE id = 2;

UPDATE assignments SET
  description = 'Implement bubble sort, quick sort, and merge sort algorithms. Compare their performance and analyze time/space complexity for each approach.'
WHERE id = 3;

UPDATE assignments SET
  description = 'Implement fundamental data structures: Stack, Queue, and Linked List. Include all basic operations and demonstrate proper usage patterns.'
WHERE id = 4;