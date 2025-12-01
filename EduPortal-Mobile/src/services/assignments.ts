import { apiFetch } from './api'

export async function deleteAssignmentApi(id: number) {
  return apiFetch(`/assignments/${id}`, { method: 'DELETE' })
}

export interface QuizAssignmentRequest {
  course_offering_id: number
  title: string
  description?: string
  start_at: string | null
  end_at: string | null
  max_score: number
  is_proctored?: boolean
  time_limit?: number | null
  questions: {
    question_text: string
    question_type: 'mcq' | 'short' | 'true_false'
    metadata: {
      choices?: string[]
      correct_answer?: string | number
    }
  }[]
}

export async function createQuizAssignment(data: QuizAssignmentRequest) {
  return apiFetch('/quizzes', {
    method: 'POST',
    body: data
  })
}

export async function getPlagiarismChecks(assignmentId: number) {
  return apiFetch<{ checks: unknown[] }>(`/assignments/${assignmentId}/plagiarism-checks`)
}

export async function runPlagiarismCheck(assignmentId: number) {
  return apiFetch(`/assignments/${assignmentId}/run-plagiarism-check`, {
    method: 'POST'
  })
}

export async function getPlagiarismMatches(assignmentId: number, checkId: number) {
  return apiFetch<{ matches: unknown[] }>(`/assignments/${assignmentId}/plagiarism-matches/${checkId}`)
}

export async function getAssignmentsForOffering(offeringId: string) {
  return apiFetch(`/courses/${offeringId}/assignments`)
}

export async function createAssignment(data: {
  title: string
  description?: string
  dueDate: string
  offeringId: string
  totalPoints?: number
}) {
  return apiFetch('/assignments', {
    method: 'POST',
    body: data
  })
}

export async function getAssignmentSubmissions(assignmentId: string) {
  return apiFetch(`/assignments/${assignmentId}/submissions`)
}

export async function gradeSubmission(submissionId: string, grade: number, feedback?: string) {
  return apiFetch(`/assignments/submissions/${submissionId}/grade`, {
    method: 'PATCH',
    body: { grade, feedback }
  })
}

export async function getStudentAssignments() {
  try {
    // First get all enrolled courses
    const coursesResponse = await apiFetch('/student/courses')
    const courses = coursesResponse as Array<{ id: number }>

    // Then get assignments for each course (using same endpoint as website)
    const assignmentsPromises = courses.map(course =>
      apiFetch(`/courses/${course.id}/assignments`)
    )

    const assignmentsArrays = await Promise.all(assignmentsPromises)
    const allAssignments = assignmentsArrays.flat()

    // Get submissions to mark which assignments are submitted (using same endpoint as website)
    const submissionsPromises = courses.map(course =>
      apiFetch(`/student/courses/${course.id}/submissions`)
    )

    const submissionsArrays = await Promise.all(submissionsPromises)
    const allSubmissions = submissionsArrays.flat()

    // Create a set of submitted assignment IDs
    const submittedAssignmentIds = new Set(
      allSubmissions.map((s: any) => s.assignment_id)
    )

    // Mark assignments as submitted
    return allAssignments.map((assignment: any) => ({
      ...assignment,
      isSubmitted: submittedAssignmentIds.has(assignment.id)
    }))
  } catch (error: any) {
    // If authentication error, return empty array instead of throwing
    if (error.message?.includes('Missing token') || error.message?.includes('Unauthorized')) {
      return []
    }
    // Re-throw other errors
    throw error
  }
}