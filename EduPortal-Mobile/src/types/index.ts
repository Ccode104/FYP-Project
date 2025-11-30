export type Role = 'student' | 'teacher' | 'ta' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export interface Course {
  id: string
  name: string
  code: string
  description?: string
}

export interface CourseOffering {
  id: string
  courseId: string
  facultyId: string
  semester: string
  year: number
  course?: Course
}

export interface Assignment {
  id: string
  title: string
  description: string
  dueDate: string
  courseOfferingId: string
  type: 'file' | 'code'
}

export interface Quiz {
  id: string
  title: string
  description?: string
  courseOfferingId: string
  isProctored: boolean
  duration?: number
}

export interface QuizAttempt {
  id: string
  quizId: string
  studentId: string
  score?: number
  startedAt: string
  submittedAt?: string
}