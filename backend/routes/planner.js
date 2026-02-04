import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createPlannerTask,
  deletePlannerTask,
  generatePlanner,
  getPlannerPreferences,
  getPlannerTasks,
  reorderPlannerTasks,
  updatePlannerPreferences,
  updatePlannerTask
} from '../controllers/plannerController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/tasks', getPlannerTasks);
router.post('/tasks', createPlannerTask);
router.patch('/tasks/:taskId', updatePlannerTask);
router.delete('/tasks/:taskId', deletePlannerTask);
router.post('/tasks/reorder', reorderPlannerTasks);

router.get('/preferences', getPlannerPreferences);
router.put('/preferences', updatePlannerPreferences);

router.post('/generate', generatePlanner);

export default router;
