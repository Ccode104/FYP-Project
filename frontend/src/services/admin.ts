import { apiFetch } from './api'

// Types
interface StudyMaterial {
  id: number;
  department_id: number;
  course_id?: number;
  title: string;
  description?: string;
  category?: string;
  material: 'notes' | 'video' | 'presentation' | 'question_bank' | 'other';
  storage_path: string;
  filename?: string;
  uploaded_by?: number;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  role: 'student' | 'faculty' | 'ta' | 'admin';
  department_id?: number;
  roll_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Department {
  id: number;
  code: string;
  name: string;
}

interface Course {
  id: number;
  code: string;
  title: string;
  description?: string;
  department_id?: number;
  credits?: number;
  created_at: string;
}

interface CourseOffering {
  id: number;
  course_id: number;
  term: string;
  section?: string;
  faculty_id: number;
  max_capacity?: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  course_code?: string;
  course_title?: string;
  faculty_name?: string;
  faculty_email?: string;
}

interface Quiz {
  id: number;
  course_offering_id: number;
  title: string;
  start_at?: string;
  end_at?: string;
  max_score: number;
  is_proctored: boolean;
  time_limit?: number;
  allow_suspension_resume: boolean;
  proctoring_config_id?: number;
  term?: string;
  section?: string;
  course_code?: string;
  course_title?: string;
}

interface Enrollment {
  id: number;
  enrolled_at: string;
  student_id: number;
  student_name?: string;
  student_email: string;
  roll_number?: string;
  offering_id: number;
  term: string;
  section?: string;
  course_code?: string;
  course_title?: string;
  faculty_name?: string;
}

interface Assignment {
  id: number;
  course_offering_id: number;
  title: string;
  description?: string;
  assignment_type: string;
  release_at?: string;
  due_at?: string;
  max_score: number;
  allow_multiple_submissions: boolean;
  created_by?: number;
  created_at: string;
}


// Study materials
export async function listMaterials(params: { departmentId?: number; courseId?: number; material?: string; q?: string } = {}) {
  const sp = new URLSearchParams()
  if (params.departmentId) sp.set('departmentId', String(params.departmentId))
  if (params.courseId) sp.set('courseId', String(params.courseId))
  if (params.material) sp.set('material', params.material)
  if (params.q) sp.set('q', params.q)
  return apiFetch<{ materials: StudyMaterial[] }>(`/api/admin/materials${sp.toString() ? `?${sp.toString()}` : ''}`)
}

export async function createMaterial(payload: { department_id: number; course_id?: number | null; title: string; description?: string; category?: string; material: 'notes'|'video'|'presentation'|'question_bank'|'other'; storage_path: string; filename?: string }) {
  return apiFetch(`/api/admin/materials`, { method: 'POST', body: payload })
}

export async function updateMaterial(id: number, patch: Partial<{ department_id: number; course_id: number | null; title: string; description: string; category: string; material: string; storage_path: string; filename: string }>) {
  return apiFetch(`/api/admin/materials/${id}`, { method: 'PATCH', body: patch })
}

export async function deleteMaterial(id: number) {
  return apiFetch(`/api/admin/materials/${id}`, { method: 'DELETE' })
}

// Users
export async function listUsers(role?: 'student'|'faculty'|'ta'|'admin') {
  const qs = role ? `?role=${role}` : ''
  const url = `/api/admin/users${qs}`
  return apiFetch<{ users: User[] }>(url)
}

export async function updateUser(id: number, patch: Partial<{ role: 'student'|'faculty'|'ta'|'admin'; department_id: number|null; is_active: boolean; name: string }>) {
  return apiFetch(`/api/admin/users/${id}`, { method: 'PATCH', body: patch })
}

export async function deleteUser(id: number) {
  return apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
}

export async function getUserOverview(id: number) {
  return apiFetch(`/api/admin/users/${id}/overview`)
}

// Departments
export async function listDepartments() {
  return apiFetch<{ departments: Department[] }>('/api/admin/departments')
}

export async function createDepartment(code: string, name: string) {
  return apiFetch('/api/admin/departments', { method: 'POST', body: { code, name } })
}

// Hierarchical navigation
export async function getCoursesByDepartment(departmentId: number) {
  return apiFetch<{ courses: Course[] }>(`/api/admin/departments/${departmentId}/courses`)
}

export async function getCourseDetails(courseId: number) {
  return apiFetch<{ course: any; offerings: any[] }>(`/api/admin/courses/${courseId}/details`)
}

export async function getAssignmentsByOffering(offeringId: number) {
  return apiFetch<{ assignments: any[] }>(`/api/admin/offerings/${offeringId}/assignments`)
}

export async function getAssignmentsByFaculty(facultyId: number) {
  return apiFetch<{ assignments: any[] }>(`/api/admin/faculty/${facultyId}/assignments`)
}

export async function getSubmissionsByAssignment(assignmentId: number) {
  return apiFetch<{ submissions: any[] }>(`/api/admin/assignments/${assignmentId}/submissions`)
}

export async function assignFacultyToCourse(courseId: number, facultyIds: number[]) {
  return apiFetch(`/api/admin/courses/${courseId}/assign-faculty`, { method: 'POST', body: { faculty_ids: facultyIds } })
}

export async function getOverview() {
  return apiFetch<{ totalUsers: number; inactiveUsers: number; activeCourses: number; totalAssignments: number; totalSubmissions: number }>('/api/admin/overview')
}

// Department CRUD
export async function updateDepartment(id: number, patch: Partial<{ code: string; name: string }>) {
  return apiFetch(`/api/admin/departments/${id}`, { method: 'PATCH', body: patch })
}

export async function deleteDepartment(id: number) {
  return apiFetch(`/api/admin/departments/${id}`, { method: 'DELETE' })
}

// Courses CRUD
export async function listCourses(params: { departmentId?: number; q?: string } = {}) {
  const sp = new URLSearchParams()
  if (params.departmentId) sp.set('departmentId', String(params.departmentId))
  if (params.q) sp.set('q', params.q)
  return apiFetch<{ courses: Course[] }>(`/api/admin/courses${sp.toString() ? `?${sp.toString()}` : ''}`)
}

export async function createCourse(payload: { code: string; title: string; description?: string; department_id?: number; credits?: number }) {
  return apiFetch('/api/admin/courses', { method: 'POST', body: payload })
}

export async function updateCourse(id: number, patch: Partial<{ code: string; title: string; description: string; department_id: number; credits: number }>) {
  return apiFetch(`/api/admin/courses/${id}`, { method: 'PATCH', body: patch })
}

export async function deleteCourse(id: number) {
  return apiFetch(`/api/admin/courses/${id}`, { method: 'DELETE' })
}

// Course Offerings CRUD
export async function listOfferings(params: { courseId?: number; facultyId?: number; term?: string; q?: string } = {}) {
  const sp = new URLSearchParams()
  if (params.courseId) sp.set('courseId', String(params.courseId))
  if (params.facultyId) sp.set('facultyId', String(params.facultyId))
  if (params.term) sp.set('term', params.term)
  if (params.q) sp.set('q', params.q)
  return apiFetch<{ offerings: CourseOffering[] }>(`/api/admin/offerings${sp.toString() ? `?${sp.toString()}` : ''}`)
}

export async function createOffering(payload: { course_id: number; term: string; section?: string; faculty_id: number; max_capacity?: number; start_date?: string; end_date?: string }) {
  return apiFetch('/api/admin/offerings', { method: 'POST', body: payload })
}

export async function updateOffering(id: number, patch: Partial<{ course_id: number; term: string; section: string; faculty_id: number; max_capacity: number; start_date: string; end_date: string }>) {
  return apiFetch(`/api/admin/offerings/${id}`, { method: 'PATCH', body: patch })
}

export async function deleteOffering(id: number) {
  return apiFetch(`/api/admin/offerings/${id}`, { method: 'DELETE' })
}

// Assignments CRUD
export async function listAssignments(params: { offeringId?: number; facultyId?: number; q?: string } = {}) {
  const sp = new URLSearchParams()
  if (params.offeringId) sp.set('offeringId', String(params.offeringId))
  if (params.facultyId) sp.set('facultyId', String(params.facultyId))
  if (params.q) sp.set('q', params.q)
  return apiFetch<{ assignments: Assignment[] }>(`/api/admin/assignments${sp.toString() ? `?${sp.toString()}` : ''}`)
}

export async function createAssignment(payload: { course_offering_id: number; title: string; description?: string; assignment_type: string; release_at?: string; due_at?: string; max_score?: number; allow_multiple_submissions?: boolean }) {
  return apiFetch('/api/admin/assignments', { method: 'POST', body: payload })
}

export async function updateAssignment(id: number, patch: Partial<{ course_offering_id: number; title: string; description: string; assignment_type: string; release_at: string; due_at: string; max_score: number; allow_multiple_submissions: boolean }>) {
  return apiFetch(`/api/admin/assignments/${id}`, { method: 'PATCH', body: patch })
}

export async function deleteAssignment(id: number) {
  return apiFetch(`/api/admin/assignments/${id}`, { method: 'DELETE' })
}

// Quizzes CRUD
export async function listQuizzes(params: { offeringId?: number; q?: string } = {}) {
  const sp = new URLSearchParams()
  if (params.offeringId) sp.set('offeringId', String(params.offeringId))
  if (params.q) sp.set('q', params.q)
  return apiFetch<{ quizzes: Quiz[] }>(`/api/admin/quizzes${sp.toString() ? `?${sp.toString()}` : ''}`)
}

export async function createQuiz(payload: { course_offering_id: number; title: string; start_at?: string; end_at?: string; max_score?: number; is_proctored?: boolean; time_limit?: number; proctoring_config_id?: number; allow_suspension_resume?: boolean }) {
  return apiFetch('/api/admin/quizzes', { method: 'POST', body: payload })
}

export async function updateQuiz(id: number, patch: Partial<{ course_offering_id: number; title: string; start_at: string; end_at: string; max_score: number; is_proctored: boolean; time_limit: number; proctoring_config_id: number; allow_suspension_resume: boolean }>) {
  return apiFetch(`/api/admin/quizzes/${id}`, { method: 'PATCH', body: patch })
}

export async function deleteQuiz(id: number) {
  return apiFetch(`/api/admin/quizzes/${id}`, { method: 'DELETE' })
}

// Enrollments CRUD
export async function listEnrollments(params: { offeringId?: number; studentId?: number; q?: string } = {}) {
  const sp = new URLSearchParams()
  if (params.offeringId) sp.set('offeringId', String(params.offeringId))
  if (params.studentId) sp.set('studentId', String(params.studentId))
  if (params.q) sp.set('q', params.q)
  return apiFetch<{ enrollments: Enrollment[] }>(`/api/admin/enrollments${sp.toString() ? `?${sp.toString()}` : ''}`)
}

export async function createEnrollment(payload: { course_offering_id: number; student_id: number }) {
  return apiFetch('/api/admin/enrollments', { method: 'POST', body: payload })
}

export async function deleteEnrollment(id: number) {
  return apiFetch(`/api/admin/enrollments/${id}`, { method: 'DELETE' })
}

// Activities
export async function getRecentActivities(limit = 5) {
  return apiFetch<{ activities: any[] }>(`/api/admin/activities?limit=${limit}`)
}

export async function undoActivity(activityId: string) {
  return apiFetch(`/api/admin/activities/${activityId}/undo`, { method: 'POST' })
}
