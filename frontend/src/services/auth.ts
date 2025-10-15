import { apiFetch } from './api'

export interface BackendUser { id: number; name: string; email: string; role: string }

export async function loginRequest(email: string, password: string): Promise<{ token: string; user: BackendUser }> {
  const data = await apiFetch<{ token: string; user: BackendUser }>(`/api/auth/login`, {
    method: 'POST',
    body: { email, password },
  });
  return data;
}