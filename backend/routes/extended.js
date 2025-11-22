import express from 'express';
import { refreshToken, logout, requestPasswordReset, confirmPasswordReset } from '../controllers/authExtendedController.js';
import { createSignedUpload, createSignedDownload, createCloudinarySignedUrl } from '../controllers/filesController.js';
import { createResource, listResources, deleteResource } from '../controllers/resourcesController.js';
import { assignTA, removeTA } from '../controllers/taController.js';
import { graderWebhook } from '../controllers/graderWebhookController.js';
import { health } from '../controllers/adminController.js';
import { executeCode } from '../controllers/judgeController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/auth/refresh', refreshToken);
router.post('/auth/logout', requireAuth, logout);
router.post('/auth/password-reset/request', requestPasswordReset);
router.post('/auth/password-reset/confirm', confirmPasswordReset);

router.post('/files/signed-upload', requireAuth, createSignedUpload);
router.get('/files/signed-download', requireAuth, createSignedDownload);
router.get('/files/cloudinary-signed-url', requireAuth, createCloudinarySignedUrl);

router.post('/resources', requireAuth, requireRole('faculty','ta','admin'), createResource);
router.get('/resources', requireAuth, listResources);
router.delete('/resources/:id', requireAuth, requireRole('faculty','admin'), deleteResource);

router.post('/ta/assign', requireAuth, requireRole('faculty','admin'), assignTA);
router.delete('/ta/:id', requireAuth, requireRole('faculty','admin'), removeTA);

router.post('/grader/webhook', graderWebhook); // secure in production

router.post('/judge', requireAuth, executeCode);

router.get('/admin/health', requireAuth, requireRole('admin'), health);

export default router;
