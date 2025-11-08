import { apiFetch } from './api'

export async function deleteAssignmentApi(id: number) {
  return apiFetch(`/api/assignments/${id}`, { method: 'DELETE' })
}

export interface QuizAssignmentRequest {
  course_offering_id: number
  title: string
  description?: string
  start_at: string | null
  end_at: string | null
  max_score: number
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
  return apiFetch('/api/quizzes', {
    method: 'POST',
    body: data
  })
}
