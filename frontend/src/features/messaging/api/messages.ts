import { apiFetch } from '../../../services/api';

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  subject?: string;
  content: string;
  is_read: boolean;
  sent_at: string;
  sender_name?: string;
  sender_email?: string;
  receiver_name?: string;
  receiver_email?: string;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export const sendMessage = async (receiverId: number, subject: string, content: string): Promise<Message> => {
  return apiFetch<Message>('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ receiver_id: receiverId, subject, content }),
  });
};

export const getMessages = async (page = 1, limit = 20): Promise<MessagesResponse> => {
  return apiFetch<MessagesResponse>(`/api/messages?page=${page}&limit=${limit}`);
};

export const getSentMessages = async (page = 1, limit = 20): Promise<MessagesResponse> => {
  return apiFetch<MessagesResponse>(`/api/messages/sent?page=${page}&limit=${limit}`);
};

export const markMessageAsRead = async (messageId: number): Promise<Message> => {
  return apiFetch<Message>(`/api/messages/${messageId}/read`, {
    method: 'PATCH',
  });
};

export const deleteMessage = async (messageId: number): Promise<void> => {
  await apiFetch(`/api/messages/${messageId}`, {
    method: 'DELETE',
  });
};

export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  return apiFetch<UnreadCountResponse>('/api/messages/unread/count');
};

export const getUsersForMessaging = async (): Promise<{ id: number; name: string; email: string; role: string }[]> => {
  const response = await apiFetch<{ users: { id: number; name: string; email: string; role: string }[] }>('/api/admin/users');
  return response.users || [];
};

