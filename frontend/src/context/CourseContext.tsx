import { useState, type ReactNode } from 'react'
import { CourseContext } from './CourseContextBase'

export function CourseProvider({ children }: { children: ReactNode }) {
  const [courseTitle, setCourseTitle] = useState<string | null>(null)
  const [assignmentTitle, setAssignmentTitle] = useState<string | null>(null)

  return (
    <CourseContext.Provider value={{ courseTitle, assignmentTitle, setCourseTitle, setAssignmentTitle }}>
      {children}
    </CourseContext.Provider>
  )
}
