import { createContext } from 'react'

interface CourseContextType {
  courseTitle: string | null
  assignmentTitle: string | null
  setCourseTitle: (title: string | null) => void
  setAssignmentTitle: (title: string | null) => void
}

export const CourseContext = createContext<CourseContextType | undefined>(undefined)