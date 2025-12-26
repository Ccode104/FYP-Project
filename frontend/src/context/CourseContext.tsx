import { useState, type ReactNode, createContext, useContext } from 'react'

interface CourseContextValue {
  courseTitle: string | null
  assignmentTitle: string | null
  setCourseTitle: (title: string | null) => void
  setAssignmentTitle: (title: string | null) => void
}

export const CourseContext = createContext<CourseContextValue | undefined>(undefined)

export function CourseProvider({ children }: { children: ReactNode }) {
  const [courseTitle, setCourseTitle] = useState<string | null>(null)
  const [assignmentTitle, setAssignmentTitle] = useState<string | null>(null)

  return (
    <CourseContext.Provider value={{ courseTitle, assignmentTitle, setCourseTitle, setAssignmentTitle }}>
      {children}
    </CourseContext.Provider>
  )
}

export function useCourse() {
  const context = useContext(CourseContext)
  if (!context) {
    throw new Error('useCourse must be used within CourseProvider')
  }
  return context
}
