import { apiFetch } from './api'

// Study materials
export async function listMaterials(params: { departmentId?: number; courseId?: number; material?: string; q?: string } = {}) {
  const sp = new URLSearchParams()
  if (params.departmentId) sp.set('departmentId', String(params.departmentId))
  if (params.courseId) sp.set('courseId', String(params.courseId))
  if (params.material) sp.set('material', params.material)
  if (params.q) sp.set('q', params.q)
  return apiFetch<{ materials: any[] }>(`/api/admin/materials${sp.toString() ? `?${sp.toString()}` : ''}`)
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
  console.log('Calling admin API:', url)
  return apiFetch<{ users: any[] }>(url)
}

export async function updateUser(id: number, patch: Partial<{ role: 'student'|'faculty'|'ta'|'admin'; department_id: number|null; is_active: boolean; name: string }>) {
  return apiFetch(`/api/admin/users/${id}`, { method: 'PATCH', body: patch })
}

export async function getUserOverview(id: number) {
  return apiFetch(`/api/admin/users/${id}/overview`)
}

// Departments
export async function listDepartments() {
  return apiFetch<{ departments: any[] }>('/api/admin/departments')
}

// Hierarchical navigation
export async function getCoursesByDepartment(departmentId: number) {
  return apiFetch<{ courses: any[] }>(`/api/admin/departments/${departmentId}/courses`)
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
