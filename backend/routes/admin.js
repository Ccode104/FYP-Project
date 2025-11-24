import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  adminListMaterials,
  adminCreateMaterial,
  adminUpdateMaterial,
  adminDeleteMaterial,
  adminListUsers,
  adminUpdateUser,
  adminDeleteUser,
  adminListDepartments,
  adminCreateDepartment,
  adminUpdateDepartment,
  adminDeleteDepartment,
  adminUserOverview,
  adminGetCoursesByDepartment,
  adminGetCourseDetails,
  adminListCourses,
  adminCreateCourse,
  adminUpdateCourse,
  adminDeleteCourse,
  adminListOfferings,
  adminCreateOffering,
  adminUpdateOffering,
  adminDeleteOffering,
  adminListAssignments,
  adminCreateAssignment,
  adminUpdateAssignment,
  adminDeleteAssignment,
  adminListQuizzes,
  adminCreateQuiz,
  adminUpdateQuiz,
  adminDeleteQuiz,
  adminListEnrollments,
  adminCreateEnrollment,
  adminDeleteEnrollment,
  adminGetAssignmentsByFaculty,
  adminGetAssignmentsByFacultyId,
  adminGetSubmissions,
  adminAssignFacultyToCourse,
  adminGetOverview,
} from '../controllers/adminPanelController.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

// Overview
router.get('/overview', adminGetOverview);

// Study materials
router.get('/materials', adminListMaterials);
router.post('/materials', adminCreateMaterial);
router.patch('/materials/:id', adminUpdateMaterial);
router.delete('/materials/:id', adminDeleteMaterial);

// User management
router.get('/users', adminListUsers); // ?role=student|faculty|ta|admin
router.patch('/users/:id', adminUpdateUser); // update role / department / is_active
router.delete('/users/:id', adminDeleteUser); // delete user
router.get('/users/:id/overview', (req, res) => adminUserOverview(req, res));

// Departments
router.get('/departments', adminListDepartments);
router.post('/departments', adminCreateDepartment);
router.patch('/departments/:id', adminUpdateDepartment);
router.delete('/departments/:id', adminDeleteDepartment);

// Courses
router.get('/courses', adminListCourses);
router.post('/courses', adminCreateCourse);
router.patch('/courses/:id', adminUpdateCourse);
router.delete('/courses/:id', adminDeleteCourse);

// Course Offerings
router.get('/offerings', adminListOfferings);
router.post('/offerings', adminCreateOffering);
router.patch('/offerings/:id', adminUpdateOffering);
router.delete('/offerings/:id', adminDeleteOffering);

// Assignments
router.get('/assignments', adminListAssignments);
router.post('/assignments', adminCreateAssignment);
router.patch('/assignments/:id', adminUpdateAssignment);
router.delete('/assignments/:id', adminDeleteAssignment);

// Quizzes
router.get('/quizzes', adminListQuizzes);
router.post('/quizzes', adminCreateQuiz);
router.patch('/quizzes/:id', adminUpdateQuiz);
router.delete('/quizzes/:id', adminDeleteQuiz);

// Enrollments
router.get('/enrollments', adminListEnrollments);
router.post('/enrollments', adminCreateEnrollment);
router.delete('/enrollments/:id', adminDeleteEnrollment);

// Hierarchical navigation
router.get('/departments/:departmentId/courses', adminGetCoursesByDepartment);
router.get('/courses/:courseId/details', adminGetCourseDetails);
router.get('/offerings/:offeringId/assignments', adminGetAssignmentsByFaculty);
router.get('/faculty/:facultyId/assignments', adminGetAssignmentsByFacultyId);
router.get('/assignments/:assignmentId/submissions', adminGetSubmissions);
router.post('/courses/:courseId/assign-faculty', adminAssignFacultyToCourse);

export default router;
