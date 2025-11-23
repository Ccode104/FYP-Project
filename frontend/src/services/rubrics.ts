import { apiFetch } from './api'

export interface Rubric {
  id: number
  title: string
  description?: string
  course_offering_id: number
  created_by: number
  created_at: string
  updated_at: string
}

export interface RubricCriterion {
  id: number
  rubric_id: number
  title: string
  description?: string
  max_points: number
  weight: number
  position: number
}

export interface RubricWithCriteria extends Rubric {
  criteria: RubricCriterion[]
}

export interface RubricGrade {
  criterionId: number
  score: number
  feedback?: string
}

export async function getRubrics(courseOfferingId: number): Promise<{ rubrics: RubricWithCriteria[] }> {
  return apiFetch(`/api/rubrics/course/${courseOfferingId}`)
}

export async function getRubric(id: number): Promise<{ rubric: Rubric; criteria: RubricCriterion[] }> {
  return apiFetch(`/api/rubrics/${id}`)
}

export async function createRubric(data: {
  title: string
  description?: string
  course_offering_id: number
  criteria: Omit<RubricCriterion, 'id' | 'rubric_id'>[]
}): Promise<{ rubric: Rubric; message: string }> {
  return apiFetch('/api/rubrics', {
    method: 'POST',
    body: data
  })
}

export async function updateRubric(id: number, data: {
  title: string
  description?: string
  criteria: Omit<RubricCriterion, 'id' | 'rubric_id'>[]
}): Promise<{ rubric: Rubric; message: string }> {
  return apiFetch(`/api/rubrics/${id}`, {
    method: 'PUT',
    body: data
  })
}

export async function deleteRubric(id: number): Promise<{ message: string }> {
  return apiFetch(`/api/rubrics/${id}`, {
    method: 'DELETE'
  })
}

export async function assignRubricToAssignment(data: {
  assignmentId: number
  rubricId: number
}): Promise<{ assignment_rubric: { id: number; assignment_id: number; rubric_id: number }; message: string }> {
  return apiFetch('/api/rubrics/assign', {
    method: 'POST',
    body: data
  })
}

export async function getAssignmentRubric(assignmentId: number): Promise<{
  rubric: RubricWithCriteria
  criteria: RubricCriterion[]
}> {
  return apiFetch(`/api/rubrics/assignment/${assignmentId}`)
}