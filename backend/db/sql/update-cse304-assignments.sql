-- Update CSE304 assignments to have PPT, PDF, Mixed, Code types

-- 1. Update Mixed assignment to use GitHub link for presentation component
UPDATE assignments SET
submission_requirements = jsonb_set(
  jsonb_set(submission_requirements, '{2,url_pattern}', '"https://github.com/.*"'),
  '{2,description}', '"GitHub repository link"'
)
WHERE title = 'Algorithm Analysis & Implementation Project';

-- 2. Update "Algorithm Design Manual" to PPT type
UPDATE assignments SET
title = 'Algorithm Design Presentation',
description = 'Create a PPT presentation on algorithm design concepts',
assignment_type = 'ppt',
assignment_config = '{
  "assignment_type": "presentation",
  "components": [
    {
      "id": "ppt_submission",
      "type": "presentation",
      "subtype": "ppt",
      "title": "Algorithm Design Presentation",
      "description": "Create a PPT presentation explaining algorithm design concepts",
      "points": 100,
      "estimated_time_hours": 5
    }
  ],
  "settings": {
    "allow_group_work": false,
    "peer_review_required": false,
    "auto_grading_enabled": false,
    "plagiarism_check": true
  }
}'::jsonb,
submission_requirements = '[
  {
    "component_id": "ppt_submission",
    "submission_type": "link",
    "url_pattern": "https://drive.google.com/.*",
    "required": true,
    "description": "Google Drive link to PPT file"
  }
]'::jsonb,
grading_config = '{
  "grading_type": "manual",
  "use_rubric": true,
  "rubric_id": "presentation_rubric",
  "allow_partial_credit": true,
  "grade_visibility": "after_due_date"
}'::jsonb,
total_points = 100,
is_graded = true
WHERE title = 'Algorithm Design Manual';

-- 3. Update "Practice: Basic Programming Exercises" to PDF type
UPDATE assignments SET
title = 'Programming Concepts PDF Report',
description = 'Create a PDF report on basic programming concepts',
assignment_type = 'pdf',
assignment_config = '{
  "assignment_type": "document",
  "components": [
    {
      "id": "pdf_report",
      "type": "document",
      "subtype": "pdf",
      "title": "Programming Concepts Report",
      "description": "Write a PDF report on basic programming concepts",
      "points": 100,
      "estimated_time_hours": 4
    }
  ],
  "settings": {
    "allow_group_work": false,
    "peer_review_required": false,
    "auto_grading_enabled": false,
    "plagiarism_check": true
  }
}'::jsonb,
submission_requirements = '[
  {
    "component_id": "pdf_report",
    "submission_type": "link",
    "url_pattern": "https://drive.google.com/.*",
    "required": true,
    "description": "Google Drive link to PDF file"
  }
]'::jsonb,
grading_config = '{
  "grading_type": "manual",
  "use_rubric": true,
  "rubric_id": "report_rubric",
  "allow_partial_credit": true,
  "grade_visibility": "after_due_date"
}'::jsonb,
total_points = 100,
is_graded = true
WHERE title = 'Practice: Basic Programming Exercises';

-- Fix assignment types for the updated assignments
UPDATE assignments SET assignment_type = 'ppt' WHERE title = 'Algorithm Design Presentation';
UPDATE assignments SET assignment_type = 'pdf' WHERE title = 'Programming Concepts PDF Report';
UPDATE assignments SET assignment_type = 'mixed' WHERE title = 'Algorithm Analysis & Implementation Project';
UPDATE assignments SET assignment_type = 'code' WHERE title = 'Data Structures Implementation';

COMMIT;