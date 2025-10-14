export interface Submission {
  id: string
  courseId: string
  student: string
  fileName: string
  submittedAt: string
  grade?: string
}

const SUB_KEY = (courseId: string) => `course:submissions:${courseId}`

export function getSubmissions(courseId: string): Submission[] {
  try {
    const raw = localStorage.getItem(SUB_KEY(courseId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as Submission[]
    return []
  } catch {
    return []
  }
}

export function addSubmission(courseId: string, student: string, fileName: string): Submission {
  const s: Submission = {
    id: `s_${crypto.randomUUID()}`,
    courseId,
    student,
    fileName,
    submittedAt: new Date().toISOString(),
  }
  const existing = getSubmissions(courseId)
  const updated = [s, ...existing]
  localStorage.setItem(SUB_KEY(courseId), JSON.stringify(updated))
  return s
}

export function setSubmissionGrade(courseId: string, id: string, grade: string) {
  const list = getSubmissions(courseId)
  const updated = list.map((s) => (s.id === id ? { ...s, grade } : s))
  localStorage.setItem(SUB_KEY(courseId), JSON.stringify(updated))
}
