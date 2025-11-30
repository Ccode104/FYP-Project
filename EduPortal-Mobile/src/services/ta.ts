import { apiFetch } from './api'

export async function getTAAssignments() {
  return apiFetch('/ta/assignments')
}

export async function getGradingSubmissions(assignmentId: string) {
  return apiFetch(`/ta/grading/${assignmentId}/submissions`)
}

export async function submitGrading(data: {
  submissionId: string
  rubricGrades?: Array<{ criterionId: number; score: number; feedback?: string }>
  overallComments?: string
}) {
  return apiFetch('/ta/grading/submit', {
    method: 'POST',
    body: data
  })
}

export async function getTADashboardData() {
  return apiFetch('/ta/dashboard')
}