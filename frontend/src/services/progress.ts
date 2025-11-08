import { apiFetch } from './api'

export interface ProgressRow {
  course_offering_id: number
  student_id?: number
  student_name?: string
  student_email?: string
  activity_type: 'assignment' | 'quiz' | string
  activity_id: number
  activity_title?: string
  max_score?: number
  score?: number | null
  status?: string
  due_at?: string | null
  submitted_at?: string | null
}

export async function getMyProgress(): Promise<{ rows: ProgressRow[] }> {
  return apiFetch('/api/progress/me')
}

export async function getCourseProgress(offeringId: number | string): Promise<{ rows: ProgressRow[] }> {
  return apiFetch(`/api/progress/course/${offeringId}`)
}

export async function getStudentProgress(studentId: number | string, courseOfferingId?: number | string): Promise<{ rows: ProgressRow[] }> {
  const q = courseOfferingId ? `?course_offering_id=${courseOfferingId}` : ''
  return apiFetch(`/api/progress/student/${studentId}${q}`)
}