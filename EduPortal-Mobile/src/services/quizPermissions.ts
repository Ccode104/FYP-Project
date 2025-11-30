import { apiFetch } from './api'

export interface AccessRequest {
  id: number
  quiz_id: number
  ta_id: number
  teacher_id: number
  request_type: 'view' | 'edit' | 'create'
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  responded_at?: string
  response_message?: string
  quiz_title: string
  ta_name: string
  ta_email: string
  course_code: string
  course_title: string
}

// Get pending requests for teacher
export const getPendingRequests = async (): Promise<{ requests: AccessRequest[] }> => {
  return apiFetch('/quiz-permissions/requests/pending')
}

// Respond to access request
export const respondToRequest = async (
  requestId: number,
  action: 'approve' | 'reject',
  message?: string
): Promise<{ message: string; quizTitle: string }> => {
  return apiFetch(`/quiz-permissions/requests/${requestId}/respond`, {
    method: 'POST',
    body: { action, message }
  })
}