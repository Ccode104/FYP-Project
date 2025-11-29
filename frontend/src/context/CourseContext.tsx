import { createContext, useContext, useState, ReactNode } from 'react'

interface CourseContextType {
  courseTitle: string | null
  assignmentTitle: string | null
  setCourseTitle: (title: string | null) => void
  setAssignmentTitle: (title: string | null) => void
}

const CourseContext = createContext<CourseContextType | undefined>(undefined)

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
