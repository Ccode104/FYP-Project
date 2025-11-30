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

export async function getGradedAssignment(assignmentId: number): Promise<any> {
  return apiFetch(`/api/student/graded/${assignmentId}`);
}

export async function submitRegradeRequest(data: {
  submissionId: number;
  criterionId?: number;
  reason: string;
}): Promise<any> {
  return apiFetch('/api/student/grade-query', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function enrollSelf(offeringId: number) {
  return apiFetch(`/api/student/enroll`, { method: 'POST', body: { offeringId } })
}

export async function getLiveLecturesForCourses(courseIds: number[]): Promise<any[]> {
  const lectures = []
  for (const courseId of courseIds) {
    try {
      const courseLectures = await apiFetch<any[]>(`/api/live-lectures/course/${courseId}`)
      lectures.push(...courseLectures)
    } catch (error) {
      console.error(`Failed to fetch lectures for course ${courseId}:`, error)
    }
  }
  return lectures
}
