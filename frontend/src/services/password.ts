import { apiFetch } from './api'

export async function requestPasswordReset(email: string): Promise<{ success: boolean; token?: string }> {
  return apiFetch('/api/auth/password-reset/request', { method: 'POST', body: { email } })
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<{ success: boolean }> {
  return apiFetch('/api/auth/password-reset/confirm', { method: 'POST', body: { token, newPassword } })
}
