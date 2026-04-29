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

export interface CourseResource {
  id: number;
  course_offering_id: number;
  title: string;
  description: string | null;
  resource_type: string;
  filename?: string;
  storage_path?: string;
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

export async function deleteDiscussionMessage(offeringId: string | number, messageId: number) {
  return apiFetch<{ success: boolean; hardDelete: boolean }>(`/api/discussions/${offeringId}/messages/${messageId}`, {
    method: 'DELETE',
  });
}

export async function fetchAiLimits() {
  return apiFetch<{ available: boolean; usage: number; limit: number; isFreeTier: boolean; percentage: string }>(
    `/api/discussions/ai-limits`
  );
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

export async function listCourseResources(offeringId: string | number) {
  return apiFetch<{ resources: CourseResource[] }>(`/api/courses/${offeringId}/resources`);
}

export async function requestDiscussionAiDeepDive(
  offeringId: string | number,
  messageId: number,
  user_query: string,
  resource_ids: number[] = []
) {
  return apiFetch<{
    mode: 'deep_dive_prompt';
    prompt: string;
    context_used: string;
    resource_metadata?: string;
  }>(`/api/discussions/${offeringId}/messages/${messageId}/ai-assist`, {
    method: 'POST',
    body: {
      user_query,
      deep_dive: true,
      resource_ids,
    },
  });
}

