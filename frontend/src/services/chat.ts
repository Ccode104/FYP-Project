import { apiFetch } from './api';

export interface ChatSession {
  id: string;
  title: string;
  courseId?: number;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ChatData {
  id: string;
  title: string;
  courseId?: number;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  uploadedDocuments: Array<{
    id: string;
    filename: string;
    usedOCR?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export async function saveChatSession(chatData: {
  title: string;
  messages: ChatData['messages'];
  uploadedDocuments: ChatData['uploadedDocuments'];
  courseId?: number;
}): Promise<{ sessionId: string }> {
  return apiFetch('/api/chatbot/chats', {
    method: 'POST',
    body: chatData
  });
}

export async function loadUserChatSessions(): Promise<{ sessions: ChatSession[] }> {
  return apiFetch('/api/chatbot/chats');
}

export async function loadChatSession(sessionId: string): Promise<{ session: ChatData }> {
  return apiFetch(`/api/chatbot/chats/${sessionId}`);
}

export async function deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/chatbot/chats/${sessionId}`, {
    method: 'DELETE'
  });
}

export async function updateChatSession(sessionId: string, updates: Partial<ChatData>): Promise<{ sessionId: string }> {
  // For now, we'll delete and recreate (could be optimized later)
  const { session } = await loadChatSession(sessionId);
  await deleteChatSession(sessionId);

  const updatedData = { ...session, ...updates };
  return saveChatSession({
    title: updatedData.title,
    messages: updatedData.messages,
    uploadedDocuments: updatedData.uploadedDocuments,
    courseId: updatedData.courseId
  });
}