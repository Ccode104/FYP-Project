import { apiFetch } from './api'

export interface BackendUser { id: number; name: string; email: string; role: string }

export async function loginRequest(email: string, password: string, role: 'student' | 'teacher' | 'ta' | 'admin' = 'student'): Promise<{ token: string; user: BackendUser }> {
  const backendRole = role === 'teacher' ? 'faculty' : role;
  const data = await apiFetch<{ token: string; user: BackendUser }>(`/api/auth/login`, {
    method: 'POST',
    body: { email, password, role: backendRole },
  });
  return data;
}

export async function login(email: string, password: string, role: 'student' | 'teacher' | 'ta' | 'admin' = 'student') {
  const backendRole = role === 'teacher' ? 'faculty' : role;
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email, password, role: backendRole },
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