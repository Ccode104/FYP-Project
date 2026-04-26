import { apiFetch, API_URL } from '../../../services/api';

export interface DiscussionMessage {
  id: number;
  course_offering_id: number;
  user_id: number | null;
  parent_id: number | null;
  content: string;
  created_at: string;
  author_name?: string | null;
  author_role?: string | null;
}

export async function listDiscussionMessages(offeringId: string | number) {
  const data = await apiFetch<{ messages: DiscussionMessage[] }>(
    `/api/discussions/${offeringId}/messages`
  );
  return data.messages;
}

export async function postDiscussionMessage(
  offeringId: string | number,
  content: string,
  parent_id?: number | null
) {
  return apiFetch<{ message: DiscussionMessage }>(`/api/discussions/${offeringId}/messages`, {
    method: 'POST',
    body: { content, parent_id: parent_id ?? null },
  });
}

export interface DiscussionAiAssistResponse {
  mode: 'direct_answer' | 'fallback_prompt' | 'stream';
  content: string;
  context_used?: string;
  ai_message?: DiscussionMessage;
}

export async function requestDiscussionAiAssist(
  offeringId: string | number,
  messageId: number,
  user_query?: string,
  stream?: boolean
) {
  if (stream) {
    const token = localStorage.getItem('auth:token') || '';
    const response = await fetch(`${API_URL}/api/discussions/${offeringId}/messages/${messageId}/ai-assist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ user_query, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`AI Assist failed: ${response.statusText}`);
    }

    return response; // Return raw response for streaming
  }

  return apiFetch<DiscussionAiAssistResponse>(
    `/api/discussions/${offeringId}/messages/${messageId}/ai-assist`,
    {
      method: 'POST',
      body: { user_query },
    }
  );
}

