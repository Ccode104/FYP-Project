import { apiFetch } from './api'

export interface EnrolledOffering {
  id: number
  course_code?: string
  course_title?: string
  term?: string
  section?: string
}

export async function getEnrolledCourses(): Promise<EnrolledOffering[]> {
  // Expecting backend to return an array; if it returns an object, adjust mapping here
  const data = await apiFetch<any>(`/api/student/courses`)
  if (Array.isArray(data)) return data as EnrolledOffering[]
  if (Array.isArray((data as any).offerings)) return (data as any).offerings as EnrolledOffering[]
  return []
}
