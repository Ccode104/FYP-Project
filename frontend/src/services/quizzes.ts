import { apiFetch } from './api'

export interface QuizQuestion {
  id: number
  question_text: string
  question_type: 'mcq' | 'short' | 'true_false'
  metadata: {
    choices?: string[]
    correct_answer?: string | number
  }
}

export interface Quiz {
  id: number
  course_offering_id: number
  title: string
  start_at: string | null
  end_at: string | null
  max_score: number
  course_code?: string
  course_title?: string
  questions: QuizQuestion[]
  is_proctored?: boolean
  time_limit?: number | null // time limit in minutes
}

export interface QuizAttempt {
  id: number
  quiz_id: number
  student_id: number
  started_at: string
  finished_at: string
  score: number | null
  answers: Record<string, any>
}

export async function listCourseQuizzes(offeringId: number): Promise<Partial<Quiz>[]> {
  return apiFetch(`/api/student/courses/${offeringId}/quizzes`)
}

export async function getQuiz(quizId: number): Promise<Quiz> {
  return apiFetch(`/api/quizzes/${quizId}`)
}

export async function submitQuizAttempt(data: {
  quiz_id: number
  student_id: number
  answers: Record<number, any>
  violated?: boolean
}): Promise<{
  message: string
  attempt: QuizAttempt
  graded_answers: Record<number, any>
  needs_manual_grading: boolean
}> {
  return apiFetch('/api/quizzes/attempts', {
    method: 'POST',
    body: data
  })
}

export async function getQuizAttempts(studentId: number, quizId?: number) {
  const params = quizId ? `?quizId=${quizId}` : ''
  return apiFetch(`/api/student/${studentId}/quiz-attempts${params}`)
}

export async function listQuizAttemptsForQuiz(quizId: number) {
  return apiFetch(`/api/quizzes/${quizId}/attempts`)
}

export async function gradeQuizAttempt(attemptId: number, decisions: Record<number, boolean>) {
  return apiFetch(`/api/quizzes/attempts/${attemptId}/grade`, {
    method: 'PATCH',
    body: { decisions }
  })
}

export async function deleteQuizAttempt(attemptId: number) {
  return apiFetch(`/api/quizzes/attempts/${attemptId}`, {
    method: 'DELETE'
  })
}

// Runtime shims for TS-only exports
// Some files may accidentally import these interfaces as runtime values
// (e.g. `import { Quiz } from './quizzes'`) which fails in the browser because
// interfaces are erased. These placeholders satisfy such imports while
// keeping the intended type definitions intact.
//
// Ideally consumers should use `import type { Quiz }` so no shim is needed.
export const Quiz: any = undefined
export const QuizQuestion: any = undefined
export const QuizAttempt: any = undefined
