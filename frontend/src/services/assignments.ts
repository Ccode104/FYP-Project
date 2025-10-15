import { apiFetch } from './api'

export async function deleteAssignmentApi(id: number) {
  return apiFetch(`/api/assignments/${id}`, { method: 'DELETE' })
}