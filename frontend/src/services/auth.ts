import { apiFetch } from './api'

export interface BackendUser { id: number; name: string; email: string; role: string }

export async function loginRequest(email: string, password: string): Promise<{ token: string; user: BackendUser }> {
  const data = await apiFetch<{ token: string; user: BackendUser }>(`/api/auth/login`, {
    method: 'POST',
    body: { email, password },
  });
  return data;
}

export async function login(email: string, password: string) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function loginWithGoogle(credential: string, role: 'student' | 'teacher' | 'ta' | 'admin' = 'student'): Promise<{ token: string; user: BackendUser }> {
  const backendRole = role === 'teacher' ? 'faculty' : role;
  const data = await apiFetch<{ token: string; user: BackendUser }>(`/api/auth/google`, {
    method: 'POST',
    body: { credential, role: backendRole },
  });
  return data;
}