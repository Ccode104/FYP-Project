import { apiFetch } from './api'

export async function enrollStudent(offeringId: number, studentId: number) {
  return apiFetch(`/api/courses/offerings/${offeringId}/enroll`, {
    method: 'POST',
    body: { student_id: studentId },
  })
}
