import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  adminListMaterials,
  adminCreateMaterial,
  adminUpdateMaterial,
  adminDeleteMaterial,
  adminListUsers,
  adminUpdateUser,
  adminListDepartments,
  adminUserOverview,
  adminGetCoursesByDepartment,
  adminGetCourseDetails,
  adminGetAssignmentsByFaculty,
  adminGetAssignmentsByFacultyId,
  adminGetSubmissions,
  adminAssignFacultyToCourse,
} from '../controllers/adminPanelController.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

// Study materials
router.get('/materials', adminListMaterials);
router.post('/materials', adminCreateMaterial);
router.patch('/materials/:id', adminUpdateMaterial);
router.delete('/materials/:id', adminDeleteMaterial);

// User management
router.get('/users', adminListUsers); // ?role=student|faculty|ta|admin
router.patch('/users/:id', adminUpdateUser); // update role / department / is_active
router.get('/users/:id/overview', (req, res) => adminUserOverview(req, res));

// Departments
router.get('/departments', adminListDepartments);

// Hierarchical navigation
router.get('/departments/:departmentId/courses', adminGetCoursesByDepartment);
router.get('/courses/:courseId/details', adminGetCourseDetails);
router.get('/offerings/:offeringId/assignments', adminGetAssignmentsByFaculty);
router.get('/faculty/:facultyId/assignments', adminGetAssignmentsByFacultyId);
router.get('/assignments/:assignmentId/submissions', adminGetSubmissions);
router.post('/courses/:courseId/assign-faculty', adminAssignFacultyToCourse);

export default router;
