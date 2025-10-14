import type { Assignment } from './mock'

const ASSN_KEY = (courseId: string) => `course:customAssignments:${courseId}`

export function getCustomAssignments(courseId: string): Assignment[] {
  try {
    const raw = localStorage.getItem(ASSN_KEY(courseId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as Assignment[]
    return []
  } catch {
    return []
  }
}

export function addCustomAssignment(courseId: string, title: string, dueDate?: string): Assignment {
  const a: Assignment = { id: `ca_${crypto.randomUUID()}`, title, dueDate }
  const existing = getCustomAssignments(courseId)
  const updated = [a, ...existing]
  localStorage.setItem(ASSN_KEY(courseId), JSON.stringify(updated))
  return a
}
