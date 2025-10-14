import type { Course } from './mock'

const KEY_PREFIX = 'user:courses:'

function key(userId: string) {
  return `${KEY_PREFIX}${userId}`
}

export function getUserCourses(userId: string): Course[] {
  try {
    const raw = localStorage.getItem(key(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as Course[]
    return []
  } catch {
    return []
  }
}

export function addUserCourse(userId: string, partial: { title: string; description: string }): Course {
  const newCourse: Course = {
    id: `u_${crypto.randomUUID()}`,
    title: partial.title,
    description: partial.description,
    assignmentsPast: [],
    assignmentsPresent: [],
    pyq: [],
    notes: [],
  }
  const existing = getUserCourses(userId)
  const updated = [newCourse, ...existing]
  localStorage.setItem(key(userId), JSON.stringify(updated))
  return newCourse
}
