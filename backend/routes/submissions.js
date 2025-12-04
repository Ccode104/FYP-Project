import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { submitFileAssignment, submitCodeAssignment, gradeSubmission, submitLinkAssignment, submitGitHubRepoAssignment, getSubmissionById } from '../controllers/submissionsController.js';

const router = express.Router();

/**
 * @swagger
 * /api/submissions/submit/files:
 *   post:
 *     summary: Submit a file-based assignment
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *               - assignmentId
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               assignmentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Files submitted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires student, ta, or faculty role
 *       404:
 *         description: Assignment not found
 */
// router.post('/submit/files', requireAuth, requireRole('student','ta','faculty'), upload.array('files', 5), submitFileAssignment);
router.post(
  "/submit/files",
  requireAuth,
  requireRole("student", "ta", "faculty"),
  upload.array("files", 5),
  submitFileAssignment
);

/**
 * @swagger
 * /api/submissions/submit/code:
 *   post:
 *     summary: Submit a code assignment
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - language
 *               - assignmentId
 *             properties:
 *               code:
 *                 type: string
 *               language:
 *                 type: string
 *                 enum: [python, java, cpp, javascript]
 *               assignmentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Code submitted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires student role
 *       404:
 *         description: Assignment not found
 */
router.post('/submit/code', requireAuth, requireRole('student','faculty'), submitCodeAssignment);

/**
 * @swagger
 * /api/submissions/grade:
 *   post:
 *     summary: Grade a submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - submissionId
 *               - grade
 *             properties:
 *               submissionId:
 *                 type: string
 *               grade:
 *                 type: number
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Submission graded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires ta, faculty, or admin role
 *       404:
 *         description: Submission not found
 */
router.post('/grade', requireAuth, requireRole('ta','faculty','admin'), gradeSubmission);

// Get a single submission by id (view by faculty/ta/admin)
router.get('/:submissionId', requireAuth, requireRole('ta','faculty','admin'), getSubmissionById);

// /**
//  * @swagger
//  * /api/submissions/submit/link:
//  *   post:
//  *     summary: Submit a link-based assignment
//  *     tags: [Submissions]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - link
//  *               - assignmentId
//  *             properties:
//  *               link:
//  *                 type: string
//  *                 format: uri
//  *               assignmentId:
//  *                 type: string
//  *               description:
//  *                 type: string
//  *     responses:
//  *       201:
//  *         description: Link submitted successfully
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Forbidden - Requires student role
//  *       404:
//  *         description: Assignment not found
//  */
router.post('/submit/link', requireAuth, requireRole('student'), submitLinkAssignment);

/**
 * @swagger
 * /api/submissions/submit/github-repo:
 *   post:
 *     summary: Submit a GitHub repository assignment
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignmentId
 *               - repo_url
 *             properties:
 *               assignmentId:
 *                 type: string
 *                 description: The assignment ID
 *               repo_url:
 *                 type: string
 *                 format: uri
 *                 description: GitHub repository URL (https://github.com/owner/repo)
 *     responses:
 *       201:
 *         description: GitHub repository submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submission:
 *                   $ref: '#/components/schemas/Submission'
 *                 repository:
 *                   type: object
 *                   description: GitHub repository metadata
 *       400:
 *         description: Bad request - Missing fields or invalid repository URL
 *       401:
 *         description: Unauthorized - GitHub not connected or token expired
 *       403:
 *         description: Forbidden - No access to repository
 *       404:
 *         description: Assignment or repository not found
 *       500:
 *         description: Internal server error
 */
router.post('/submit/github-repo', requireAuth, requireRole('student'), submitGitHubRepoAssignment);

export default router;
