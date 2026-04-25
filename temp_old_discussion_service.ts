import { apiFetch } from './api'

export interface DiscussionMessage {
  id: number
  course_offering_id: number
  user_id: number | null
  parent_id: number | null
  content: string
  created_at: string
  author_name?: string | null
  author_role?: string | null
}

export async function listDiscussionMessages(offeringId: string | number) {
  const data = await apiFetch<{ messages: DiscussionMessage[] }>(`/api/discussions/${offeringId}/messages`)
  return data.messages
}

export async function postDiscussionMessage(offeringId: string | number, content: string, parent_id?: number | null) {
  return apiFetch<{ message: DiscussionMessage }>(`/api/discussions/${offeringId}/messages`, {
    method: 'POST',
    body: { content, parent_id: parent_id ?? null },
  })
}
