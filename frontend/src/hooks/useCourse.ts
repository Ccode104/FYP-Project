import { useContext } from 'react'
import { CourseContext } from '../context/CourseContext'

export function useCourse() {
  const context = useContext(CourseContext)
  if (!context) {
    throw new Error('useCourse must be used within CourseProvider')
  }
  return context
}