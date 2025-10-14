import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getResourceById,
  updateResource,
  deleteResource
} from '../controllers/resourcesController.js';

const router = express.Router();

router.use(requireAuth);

// Get a single resource by ID
router.get('/:resourceId', getResourceById);

// Update resource metadata (faculty/ta)
router.put('/:resourceId', updateResource);

// Delete a resource (faculty/ta)
router.delete('/:resourceId', deleteResource);

export default router;
